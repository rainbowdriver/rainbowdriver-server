var os = require('os'),
    restify = require('restify'),
    colorize = require('colorize'),
    cconsole = {log:function(){}},
    exec = require('child_process').exec;

(function () {
    "use strict";
    var sessions = {},
        connections,
        jsonwire = restify.createServer({name: 'Selenium Winjs'});

    exports.setConnections = function(newConnections) {
        connections = newConnections;
    };

    exports.verbosity = function() {
        cconsole = colorize.console;
    };

    exports.sessions = sessions;

    exports.jsonwire = jsonwire;

    jsonwire.use(restify.bodyParser());

    jsonwire.use(function wireLogger(req, res, next) {
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
        if ('body' in req && req.body) {
            cconsole.log('\t' + req.body);
        }
        return next();
    });

    jsonwire.on('NotFound', function (req, res, next) {
        cconsole.log('#red[ Command Not Implemented ]');
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
    });

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
        return next();
    });

    jsonwire.post('/wd/hub/session', function (req, res, next) {
        var interval,
            session = {
                'id' : new Date().getTime(),
                'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
            };

        sessions[session.id] = session;

        interval = setInterval(function waitingForBrowser () {
            connections.forEach(function (conn) {
                if(!conn.sessionId) {
                    clearInterval(interval);
                    conn.sessionId = session.id;
                    session.connection = conn;
                    res.header('Location', "/wd/hub/session/" + session.id);
                    res.send(303);
                    next();
                }
            });
        }, 2000);
    });

    jsonwire.get('/wd/hub/session/:sessionId', function (req, res, next) {
        var session = {
                'sessionId' : req.params.sessionId,
                'desiredCapabilities' : sessions[req.params.sessionId].desiredCapabilities,
                'status': 0,
                'value': sessions[req.params.sessionId].desiredCapabilities,
                'proxy': { }
        };

        res.send(200, session);
        return next();
    });

    jsonwire.del('/wd/hub/session/:sessionId', function (req, res, next) {
        connections.forEach(function (conn) {
            if(parseInt(conn.sessionId,10) === parseInt(req.params.sessionId, 10)) {
                conn.end();
            }
        });
        delete sessions[req.params.sessionId];
        res.send(204);
        return next();
    });

    jsonwire.get('/wd/hub/sessions', function (req, res, next) {
        res.send(sessions);
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/url', function (req, res, next) {
        res.send(200, {
            "name": "get",
            "sessionId": req.sessionId,
            "status": 0,
            "value": ""
        });
        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/title', function (req, res, next) {
        var session = sessions[req.params.sessionId];

        if (session) {
            session.connection.write(JSON.stringify({
                command: 'getTitle'
            }));

            session.connection.once('data', function (message) {
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
        }
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/element', function (req, res, next) {
        var response,
            returned_element,
            session = sessions[req.params.sessionId];

        if (!session) {
            res.send(404);
            return next();
        }

        if (JSON.parse(req.body).using != "css selector") {
            res.contentType = "json";
            res.send(501, { value: "Only CSS selectors are supported right now. Sorry about that." });
            return next();
        }

        session.elements = session.elements || [];

        session.connection.write(JSON.stringify({
            command: 'findElement',
            selector: JSON.parse(req.body).value
        }));

        session.connection.once('data', function (message) {
            var response_body,
                response = JSON.parse(message);

            if (response.name === "findElement") {
                if (response.status === 0) {
                    session.elements[response.elementId] = {
                        id: response.elementId,
                        selector: 'selector_' + response.selector
                    };
                    response_body = {
                        "name": "findElement",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": {
                            "ELEMENT": response.elementId
                        }
                    };
                    res.send(200, response_body);
                    next();
                } else if (response.status === 7) {
                    response_body = {
                        "name": "findElement",
                        "sessionId": req.params.sessionId,
                        "status": 7,
                        "value": {}
                    };
                    res.contentType = "json";
                    res.charSet = "UTF-8";
                    res.send(500, response_body);
                    next();
                }
            }
        });
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/element', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element_id = req.params.id;

        if (!session) {
            res.send(404);
            return next();
        }

        if (!session.elements[element_id]) {
            res.send(404);
            return next();
        }

        if (JSON.parse(req.body).using != "css selector") {
            res.contentType = "json";
            res.send(501, { value: "Only CSS selectors are supported right now. Sorry about that." });
            return next();
        }

        session.connection.write(JSON.stringify({
            command: 'findElement',
            selector: session.elements[element_id].selector.replace(/^selector_/, '') + ' ' + JSON.parse(req.body).value
        }));

        session.connection.once('data', function (message) {
            var response_body,
                response = JSON.parse(message);

            if (response.name === "findElement") {
                if (response.status === 0) {
                    session.elements[response.elementId] = {
                        id: response.elementId,
                        selector: 'selector_' + response.selector
                    };
                    response_body = {
                        "name": "findElement",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": {
                            "ELEMENT": response.elementId
                        }
                    };
                    res.send(200, response_body);
                    next();
                } else if (response.status === 7) {
                    response_body = {
                        "name": "findElement",
                        "sessionId": req.params.sessionId,
                        "status": 7,
                        "value": {}
                    };
                    res.contentType = "json";
                    res.charSet = "UTF-8";
                    res.send(500, response_body);
                    next();
                }
            }
        });
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:elementId/displayed', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.elementId];

        session.connection.write(JSON.stringify({
            command: 'isElementDisplayed',
            selector: element.selector.replace(/^selector_/, '')
        }));

        session.connection.once('data', function (message) {
            var response = JSON.parse(message);

            if (response.name === "isElementDisplayed") {
                if (response.status === 0) {
                    var response_body = {
                        "name": "isElementDisplayed",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": response.value
                    };
                    res.send(200, response_body);
                }
            }
            return next();
        });
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

            session.connection.once('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "sendKeysToElement") {
                    var response_body = {
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": response.value
                    };
                    res.contentType = "json";
                    res.charSet = "UTF-8";
                    res.send(200, response_body);
                }
            });
        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/click', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'click',
                selector: element.selector.replace(/^selector_/, '')
            }));
            setTimeout(function() {
                res.send(200, {
                    "name": "clickElement",
                    "sessionId": req.params.sessionId,
                    "status": 0,
                    "value": "ok"
                });
            }, 1000);
        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/text', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getValue',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.once('data', function (message) {
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
        }
        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/name', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getName',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.once('data', function (message) {
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
        }
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/execute', function (req, res, next) {
        var session = sessions[req.params.sessionId];
        if (session) {
            session.connection.write(JSON.stringify({
                command: 'executeScript',
                script: JSON.parse(req.body).script
            }));

            session.connection.once('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "executeScript") {
                    var response_body = {
                        "value": response.value
                    };
                    res.send(200,response_body);
                }
            });
        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/snap', function (req, res, next) {
        var session = sessions[req.params.sessionId];

        if (session) {
            exec("powershell .\\helpers\\snap.ps1", function (error, stdout, stderr) {
                res.send(200, {});
                return;
                
                session.connection.write(JSON.stringify({
                    command: 'snap',
                    edge: JSON.parse(req.body).edge
                }));

                session.connection.once('data', function (message) {
                    var response = JSON.parse(message);
                    if (response.name === "snap") {
                        res.send(200, {});
                    }
                });
            });

        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/attribute/:name', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getElementAttribute',
                selector: element.selector.replace(/^selector_/, ''),
                attribute: req.params.name
            }));

            session.connection.once('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "getElementAttribute") {
                    res.send(200, {
                        "name": "getElementAttribute",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                        "value": response.value
                    });
                }
            });
        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.on('after', function responseLogger(req, res) {
        cconsole.log('#green[ < ' + res.statusCode + ' ] #cyan[' + req.path + ']');
        cconsole.log('\t' + res._body);
    });

})();
