"use strict";
var restify = require('restify'),
    sockjs = require('sockjs'),
    terminal = require('color-terminal'),

    sessions = {},

    jsonwire = restify.createServer({name: 'Selenium Winjs'}),
    browser_connection = sockjs.createServer();

jsonwire.use(restify.bodyParser());

jsonwire.use(function wireLogger(req, res, next) {
    terminal
        .color('green').write(' > ' + req.method + ' ')
        .color('cyan').write(req.path);
    if ('body' in req && req.body) {
        terminal
            .write('\n\t')
            .color('white')
            .write(req.body);
    }
    terminal.reset().write('\n');
    return next();
});

require('./jsonwire.js').init(jsonwire, sessions);
require('./browser_connection.js').init(browser_connection, sessions);

browser_connection.installHandlers(jsonwire, {prefix: '/browser_connection'});

jsonwire.listen(8080, function () {
    console.log('%s listening at %s', jsonwire.name, jsonwire.url);
});