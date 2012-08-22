var os = require('os');

module.exports = {
    init: function (jsonwire, sessions) {
        "use strict";

        jsonwire.get('/wd/hub/status', function (req, res, next) {
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

        jsonwire.post('/wd/hub/session', function (req, res, next) {
            var session = {
                    'id' : new Date().getTime(),
                    'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
                };
            sessions[session.id] = session;
            res.header('Location', "/session/" + session.id);
            res.send(303);
        });

        jsonwire.del('/wd/hub/session/:sessionId', function (req, res, next) {
            delete sessions[req.params.sessionId];
            res.send(204);
        });

        jsonwire.get('/wd/hub/sessions', function (req, res, next) {
            res.send(sessions);
        });

        jsonwire.post('/wd/hub/session/:sessionId/url', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.get('/wd/hub/session/:sessionId/title', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.post('/wd/hub/session/:sessionId/element', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.post('/wd/hub/session/:sessionId/element/:id/value', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.post('/wd/hub/session/:sessionId/element/:id/click', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.post('/wd/hub/session/:sessionId/element/:id/text', function (req, res, next) {
            //TODO: implement
        });

        jsonwire.post('/wd/hub/session/:sessionId/execute', function (req, res, next) {
            //TODO: implement
        });
    }
};

