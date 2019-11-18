'use strict';

const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlPlugin = require('html-webpack-plugin');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const helpers = require('./helpers');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const isDev = process.env.NODE_ENV === 'development';

const webpackConfig = {
    target: 'electron-renderer',
    entry: {
        polyfill: '@babel/polyfill',
        main: helpers.root('src', 'views', 'main'),
    },
    resolve: {
        extensions: ['.js', '.vue'],
        alias: {
            'vue$': isDev ? 'vue/dist/vue.runtime.js' : 'vue/dist/vue.runtime.min.js',
            '@': helpers.root('src', 'views')
        }
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                include: [helpers.root('src')]
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: [helpers.root('src')]
            },
            {
                test: /\.css$/,
                use: [
                    isDev ? 'vue-style-loader' : MiniCSSExtractPlugin.loader,
                    { loader: 'css-loader', options: { sourceMap: isDev } },
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    isDev ? 'vue-style-loader' : MiniCSSExtractPlugin.loader,
                    { loader: 'css-loader', options: { sourceMap: isDev } },
                    { loader: 'sass-loader', options: { sourceMap: isDev } }
                ]
            },
            {
                test: /\.sass$/,
                use: [
                    isDev ? 'vue-style-loader' : MiniCSSExtractPlugin.loader,
                    { loader: 'css-loader', options: { sourceMap: isDev } },
                    { loader: 'sass-loader', options: { sourceMap: isDev } }
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new VueLoaderPlugin(),
        new HtmlPlugin({ template: 'src/index.html', chunksSortMode: 'dependency' })
    ]
};

module.exports = webpackConfig;