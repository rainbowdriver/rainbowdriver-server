"use strict";
var restify = require('restify'),
    os = require('os'),
    server = restify.createServer();

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

server.listen(8080, function () {
    console.log('Selenium-WinJS: %s listening at %s', server.name, server.url);
});