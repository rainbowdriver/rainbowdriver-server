"use strict";
var restify = require('restify'),
    os = require('os'),
    server = restify.createServer(),
    _sessions = [];

server.use(restify.bodyParser());

server.get('/status', function (req, res, next) {
    res.send({
        "build" : {
            "version" : "0.1",
            "revision" : "unknown",
            "time" : "unknown"
        },
        "os" : {
            "name" : os.platform(),
            "version" : os.release(),
            "arch" : os.arch()
        }
    });
});

server.post('/session', function (req, res, next) {
    var _session = {
        'id' : new Date().getTime(),
        'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
        };
    _sessions.push(_session);
    res.header('Location', "/session/" + _session);
    res.send(303);
});

server.get('/sessions', function (req, res, next) {
    res.send(_sessions);
});

server.listen(8080, function () {
    console.log('Selenium-WinJS: %s listening at %s', server.name, server.url);
});