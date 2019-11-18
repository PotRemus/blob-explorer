'use strict';
const express = require('express');
const config = require('../config.json');
let appServer, app = express()

exports.start = function () {
    return new Promise(resolve => {
        if(!appServer || !appServer.listening)
        {
            app.get('*', (req, res) => {
                return res.send('Logging In!');
            });
            appServer = app.listen(config.express.port, () => {
                console.log(`\nExpress app listening on port ${config.express.port}!\n`);
                return resolve();
            });
        }
    });
}

exports.stop = function () {
    if(appServer.listening)
    {
        appServer.close();
    }
}