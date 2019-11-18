'use strict';

const { BrowserWindow, session, dialog, ipcMain } = require('electron');
const crypto = require('crypto');
const request = require('request');

const expressApp = require('./express-app');
const config = require('../config.json');

// State and PKCE verifiers.
function base64URLEncode(str) {
	return str.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}
function sha256(buffer) {
	return crypto.createHash('sha256').update(buffer).digest();
}
const authStateIdentifier = Math.random().toString(36).substring(7);
const authPKCEVerifier = base64URLEncode(crypto.randomBytes(32));
const authPKCEChallenge = base64URLEncode(sha256(authPKCEVerifier));

let authWindow, token, account;
exports.checkAuth = async function () {
	await initializeAuthWindow();
	let refreshToken = await getRefreshToken();
	if (refreshToken) {
		refreshAccessToken(refreshToken);
		// Stop the server and close the auth window since we no longer need it for authentication
		authWindow.close();
	}
	else {
		// Show the auth window since we need to have the user see it to authenticate
		authWindow.show();
		await authenticate();
	}
};
exports.initIPCWatchers = async function (mainWindow) {
	ipcMain.on('login', async () => {
		await authenticate();
	});

	ipcMain.on('refreshAccessToken', (event, refreshToken) => {
		refreshAccessToken(refreshToken);
	});
};
exports.login = async function () {
	await initializeAuthWindow();
	authWindow.show();
	await authenticate();
};
exports.logout = async function () {
	const cookie = {
		url: `http://${config.express.protocol}:${config.express.port}`,
		name: 'refresh_token'
	};

	await initializeAuthWindow();
	session.defaultSession.cookies.remove(cookie.url, cookie.name).then(() => {
		authWindow.show();
		authWindow.loadURL(`https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/logout`);
		authWindow.webContents.on('did-finish-load', (arg1, arg2, arg3) => {
			let urlFilter = `https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/logoutsession*`;
			session.defaultSession.webRequest.onCompleted({ urls: [urlFilter] }, details => {
				let _url = details.url
				authWindow.close();
			});
		});
	});
};

async function authenticate() {
	var url = `https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/authorize?
	client_id=${config.auth.clientId}
	&response_type=code
	&redirect_uri=http://${config.express.protocol}:${config.express.port}
	&response_mode=query
	&scope=${config.auth.scope}
	&state=${authStateIdentifier}
	&code_challenge_method=S256
	&code_challenge=${authPKCEChallenge}`
	authWindow.loadURL(url);

	authWindow.webContents.on('did-finish-load', () => {
		var urlFilter = `http://${config.express.protocol}:${config.express.port}/?code=` + '*';
		session.defaultSession.webRequest.onCompleted({ urls: [urlFilter] }, details => {
			const _url = details.url.split('?')[1]; // get the equivalent of window.location.search for the URLSearchParams to work properly
			const _params = new URLSearchParams(_url);
			const _accessCode = _params.get('code');
			const _state = _params.get('state');

			// Ensure our original State identifier that we created matches the returned state value in the response.
			if (_accessCode && _state === authStateIdentifier) {
				const tokenRequestUrl = `https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/token`;
				const tokenRequestBody = {
					grant_type: 'authorization_code',
					client_id: config.auth.clientId,
					code: _accessCode,
					redirect_uri: `http://${config.express.protocol}:${config.express.port}`,
					scope: config.auth.scope,
					code_verifier: authPKCEVerifier
				};

				request.post(
					{ url: tokenRequestUrl, form: tokenRequestBody },
					async (err, httpResponse, body) => {
						console.log(body);
						authWindow.loadURL(`http://${config.express.protocol}:${config.express.port}`);
						await handleAccessTokenResponse(err, httpResponse, body);
						authWindow.close();
					}
				);

			}
		});
	});
}

async function handleAccessTokenResponse(err, httpResponse, body) {
	if (!err) {
		try {
			const response = JSON.parse(body);
			if (response.error) {
				throwError('Error: ' + response.error + '\nFailure during the request of the access_token\n' + response.error_description);
			} else {
				await setRefreshToken(response.refresh_token);
				token = response;
				account = await getAccountProfile();
				return response;
			}
		} catch {
			throwError('Could not parse and store Refresh Token.');
		}
	} else {
		throwError('Error: ' + httpResponse + '\nFailure during the request of the access_token\n' + body);
	}
}

async function initializeAuthWindow() {
	await expressApp.start();
	authWindow = new BrowserWindow({
		show: false,
		alwaysOnTop: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	authWindow.loadURL(`http://${config.express.protocol}:${config.express.port}`);
	authWindow.on('closed', () => {
		authWindow = null;
		expressApp.stop();
	});
}

function refreshAccessToken(refreshToken) {
	const tokenRequestUrl = `https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/token`;

	// No PKCE code_verifier here, as the refresh has its own grant flow.
	const tokenRequestBody = {
		grant_type: 'refresh_token',
		client_id: config.auth.clientId,
		refresh_token: refreshToken,
		scope: config.auth.scope
	};

	request.post(
		{ url: tokenRequestUrl, formData: tokenRequestBody },
		(err, httpResponse, body) => handleAccessTokenResponse(err, httpResponse, body)
	);
}

function setRefreshToken(token) {
	const cookie = {
		url: `http://${config.express.protocol}:${config.express.port}`,
		name: 'refresh_token',
		value: JSON.stringify(token),
		httpOnly: true,
		expirationDate: Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24 * 90) // setting to +90 days
	};

	return session.defaultSession.cookies.set(cookie).catch((error) => {
		console.log(error)
	});
}

function getRefreshToken() {
	const cookie = {
		url: `http://${config.express.protocol}:${config.express.port}`,
		name: 'refresh_token'
	};
	return new Promise(resolve => {
		session.defaultSession.cookies.get(cookie).then((cookies) => {
			let result;
			if (cookies.length) {
				result = JSON.parse(cookies[0].value);
			}
			return resolve(result);
		}).catch((error) => {
			console.log(error);
			return resolve();
		});
	});
}

function throwError(message) {
	dialog.showMessageBoxSync(authWindow, {
		type: "error",
		title: "Technical Error",
		message: message
	});
}

function getAccountProfile() {
	return new Promise(resolve => {
		if (token) {
			const profileUrl = `https://graph.microsoft.com/v1.0/me`;
			request.get(
				{
					url: profileUrl,
					headers: {
						"Authorization": `${token.token_type} ${token.access_token}`
					}
				},
				(err, httpResponse, body) => {
					let result;
					if (!err) {
						try {
							result = JSON.parse(body);
						} catch {
							throwError('Could not parse profile data.');
						}
					} else {
						throwError('Error: ' + httpResponse + '\nFailure during the request of the access_token\n' + body);
					}
					return resolve(result);
				}
			);
		}
	});
}