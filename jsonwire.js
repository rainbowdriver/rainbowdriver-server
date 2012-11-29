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
                    res.header('Location', "/wd/hub/session/" + session.id);
                    res.send(303);
                    return next();
                }
            });
        }, 500);
    });

    jsonwire.get('/wd/hub/session/:sessionId', function (req, res, next) {
        var session = {
                'sessionId' : req.params.sessionId,
                'desiredCapabilities' : sessions[req.params.sessionId].desiredCapabilities,
                'status': 0,
                'value': sessions[req.params.sessionId].desiredCapabilities,
                'proxy': { }
        };
        console.log(session);
        res.send(200, session);
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

        if (JSON.parse(req.body).using != "css selector") {
            res.send(500);
            return next();
        }

        session.elements = session.elements || {};

        if (req.params.value in session.elements) {
            returned_element = session.elements[JSON.parse(req.body).value];
         } else {
            session.connection.write(JSON.stringify({
                command: 'findElement',
                using: JSON.parse(req.body).using,
                value: JSON.parse(req.body).value
            }));

            session.connection.on('data', function (message) {
                var response = JSON.parse(message);
                console.log(response);
                if (response.name === "findElement") {
                    session.elements[response.value] = response.element;
                    var response_body = {
                        "name": "findElement",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": {
                            "ELEMENT": response.value
                        }
                    };
                    res.send(200, response_body);
                }
            });
        }
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/value', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        var text = JSON.parse(req.body).value.join("");

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'sendKeysToElement',
                selector: element.selector.replace(/^selector_/, ''),
                value: text
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

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/name', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getName',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.on('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "getElementTagName") {
                    res.send(200, {
                        "name": "getElementTagName",
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

