/*globals jsonwire, sessions, connections, browser_connection */
var os = require('os');

(function () {
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
        res.send(200, {
            "name": "get",
            "sessionId": req.sessionId,
            "status": 0,
            "value": ""
        });
    });

    jsonwire.get('/wd/hub/session/:sessionId/title', function (req, res, next) {
        res.send(200, {
            "name": "getTitle",
            "sessionId": req.sessionId,
            "status": 0,
            "value": "I am a page title - Sauce Labs"
        });
    });

    jsonwire.post('/wd/hub/session/:sessionId/element', function (req, res, next) {
        var response,
            returned_element = "";

        if (req.params.value === "comments") {
            returned_element = {"ELEMENT":"9661e41f-6c05-3f43-8254-b9d5c6f4f4a0"};
        } else if (req.params.value === "your_comments") {
            returned_element = {"ELEMENT":"fe67dce8-4f72-5847-a67f-7fa44703bc3f"};
        } else if (req.params.value === "submit") {
            returned_element = { "ELEMENT" : "0f565075-51d2-b44c-b258-48e64aa4bc81" };
        }
        response = {
            "name": "findElement",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": returned_element
        };
        res.send(200, response);
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/value', function (req, res, next) {
        res.send(200, {
            "name": "sendKeysToElement",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": {"ELEMENT": req.params.id }
        });
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/click', function (req, res, next) {
        res.send(200, {
            "name": "clickElement",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": "ok"
        });
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/text', function (req, res, next) {
        var response = {
            "name": "getElementText",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": "Your comments: this is not a comment"
        };
        res.send(200, response);
    });

    jsonwire.post('/wd/hub/session/:sessionId/execute', function (req, res, next) {
        res.send(200, {
            "name": "executeScript",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": "http://saucelabs.com/test/guinea-pig#"
        });
    });

})();

