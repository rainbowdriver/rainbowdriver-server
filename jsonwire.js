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
        var interval,
            session = {
                'id' : new Date().getTime(),
                'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
            };
        sessions[session.id] = session;
        setInterval(function waitingForBrowser () {
            connections.forEach(function (conn) {
                if(typeof conn.sessionId === 'undefined') {
                    conn.sessionId = session.id;
                    session.connection = conn;
                    res.header('Location', "/session/" + session.id);
                    res.send(303);
                    return next();
                }
            });
        }, 500);
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
        var session = sessions[req.params.sessionId];

        if (session) {
            session.connection.write(JSON.stringify({
                command: 'getTitle'
            }));

            session.connection.on('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "getTitle") {
                    var response_body = {
                        "value": response.value
                    };
                    res.end(JSON.stringify(response_body));
                }
            });
        } else {
            res.send(404);
            return next();
        }
    });

    jsonwire.post('/wd/hub/session/:sessionId/element', function (req, res, next) {
        var response,
            returned_element,
            session = sessions[req.params.sessionId];

        if (req.params.using != "css selector") {
            res.send(500);
            return next();
        }

        session.elements = session.elements || [];

        if(req.params.value in session.elements) {
            returned_element = session.elements[req.params.value];
        } else {
            returned_element = {
                id: new Date().getTime(),
                selector: 'selector_' + req.params.value
            };
            session.elements[returned_element.id] = returned_element;
        }

        response = {
            "name": "findElement",
            "sessionId": req.params.sessionId,
            "status": 0,
            "value": {
                "ELEMENT": returned_element.id
            }
        };
        res.send(200, response);
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/value', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'sendKeysToElement',
                selector: element.selector.replace(/^selector_/, ''),
                value: req.params.value
            }));

            session.connection.on('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "sendKeysToElement") {
                    var response_body = {
                        "name": "sendKeysToElement",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": response.value
                    };
                    res.end(JSON.stringify(response_body));
                }
            });
        } else {
            res.send(404);
            return next();
        }
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/click', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        console.log(element, session);
        if (element) {
            session.connection.write(JSON.stringify({
                command: 'click',
                selector: element.selector.replace(/^selector_/, '')
            }));
            res.send(200, {
                "name": "clickElement",
                "sessionId": req.params.sessionId,
                "status": 0,
                "value": "ok"
            });
        } else {
            res.send(404);
            return next();
        }
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/text', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getValue',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.on('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "getElementText") {
                    res.send(200, {
                        "name": "getElementText",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": response.value
                    });
                }
            });
        } else {
            res.send(404);
            return next();
        }
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

