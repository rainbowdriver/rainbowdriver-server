var os = require('os'),
    restify = require('restify'),
    colorize = require('colorize'),
    cconsole = {log:function(){}},
    exec = require('child_process').exec,
    fs = require("fs"),
    path = require("path");

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

    function connectionsByBrowserId(id) {
        return connections.filter(function (conn) {
            return conn.id === id;
        });
    }

    function getAvailableBrowser() {
        var currentWindows,
            available = false;

        connections.forEach(function (conn) {
            var hasSession = false;
            if(!conn.sessionId) {
                currentWindows = connectionsByBrowserId(conn.id);
                currentWindows.forEach(function (win) {
                    if (win.sessionId) {
                        hasSession = true;
                    }
                });
            }
            if(!hasSession) {
                available = currentWindows[0];
            }
        });
        return available;
    }

    jsonwire.use(restify.bodyParser());

    jsonwire.use(function wireLogger(req, res, next) {
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
        if ('body' in req && req.body) {
            cconsole.log('\t' + req.body);
        }
        return next();
    });

    jsonwire.on('NotFound', function (req, res) {
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
        if ('body' in req && req.body) {
            cconsole.log('\t' + req.body);
        }
        res.send(405, {status:9, message: "UnknownCommand" });
        // this is the last call on the chain. No next, so jsonwire.on('after') won't fire
        cconsole.log('#green[ < ' + res.statusCode + ' ] #cyan[' + req.path + '] #red[ Command Not Implemented ]');
        cconsole.log('\t' + res._body);
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
            var browser = getAvailableBrowser();
            if(browser) {
                clearInterval(interval);
                browser.sessionId = session.id;
                session.connection = browser;
                res.header('Location', "/wd/hub/session/" + session.id);
                res.send(303);
                next();
            }
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

        res.send(200, session);
        return next();
    });

    jsonwire.del('/wd/hub/session/:sessionId', function (req, res, next) {
        var session = sessions[req.params.sessionId];
        var sameBrowserConnections = connectionsByBrowserId(session.connection.id);

        sameBrowserConnections.forEach(function (conn) {
            conn.end();
        });
        delete sessions[req.params.sessionId];
        res.send(204);
        return next();
    });

    jsonwire.get('/wd/hub/sessions', function (req, res, next) {
        res.send(sessions);
        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/moveto', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId],
            json = JSON.parse(req.body),
            target = json.element;

        if(session) {
            if(target && target in session.elements) {
                session.mouse = {
                    element: target
                };
                if(json.xoffset) {
                    session.mouse.xoffset = json.xoffset;
                }
                if(json.yoffset) {
                    session.mouse.yoffset = json.yoffset;
                }
                response = {
                    sessionId: session.id,
                    status: 0
                };
                res.send(200, response);
            } else {
                res.send(500, {status: 7, sessionId: session.sessionId});
            }
        } else {
            response = {
                sessionId: session.sessionId,
                status: 6
            };
            res.send(500, response);
        }

        return next();
    });

    function sendClick(session, element, button, xoffset, yoffset) {
        session.connection.write(JSON.stringify({
            command: 'click',
            selector: element.selector.replace(/^selector_/, ''),
            button: button || 0,
            xoffset: xoffset,
            yoffset: yoffset
        }));
    }

    jsonwire.post('/wd/hub/session/:sessionId/click', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId],
            target = session.mouse && session.mouse.element,
            button = req.body && JSON.parse(req.body).button || 0,
            element;

        if(session) {
            if(target && target in session.elements) {
                element = session.elements[target];
                sendClick(session, element, button, session.mouse.xoffset, session.mouse.yoffset);
                response = {
                    sessionId: session.id,
                    status: 0
                };
                res.send(200, response);
            } else {
                res.send(500, {status: 7, sessionId: session.sessionId});
            }
        } else {
            response = {
                sessionId: session.sessionId,
                status: 6
            };
            res.send(500, response);
        }

        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/window_handle', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId];
        if(session) {
            response = {
                sessionId: session.id,
                status: 0,
                value: session.connection.windowName
            };
            res.send(200, response);
        } else {
            response = {
                sessionId: session.sessionId,
                status: 6
            };
            res.send(500, response);
        }

        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/window_handles', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId];
        if(session) {
            response = {
                sessionId: session.id,
                status: 0,
                value: connectionsByBrowserId(session.connection.id).map(function (conn) {
                    return conn.windowName;
                })
            };
            res.send(200, response);
        } else {
            response = {
                sessionId: session.sessionId,
                status: 6
            };
            res.send(500, response);
        }

        return next();
    });

    jsonwire.post('/wd/hub/session/:sessionId/window', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId],
            win;
        try {
            win = connectionsByBrowserId(session.connection.id).filter(function (win) {
                return win.windowName === req.params.name;
            })[0];
        } catch(e) { }

        if(session && win) {
            session.connection = win;
            response = {
                sessionId: session.id,
                status: 0,
                value: ""
            };
            res.send(200, response);
        } else {
            var status = 6,
                statusText = "NoSuchDriver";
            if (session && !win) {
                status = 23;
                statusText = "NoSuchWindow";
            }
            response = {
                sessionId: session.sessionId,
                status: status,
                message: statusText
            };
            res.send(500, response);
        }

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
            sendClick(session, element);
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

    jsonwire.post('/wd/hub/session/:sessionId/element/:id/clear', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'clear',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.once('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "clear") {
                    res.send(200, {
                        "name": "clear",
                        "sessionId": req.params.sessionId,
                        "status": 0,
                    });
                }
            });
        } else {
            res.send(404);
        }
        return next();
    });

    jsonwire.get('/wd/hub/session/:sessionId/element/:id/selected', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.connection.write(JSON.stringify({
                command: 'getSelected',
                selector: element.selector.replace(/^selector_/, '')
            }));

            session.connection.once('data', function (message) {
                var response = JSON.parse(message);
                if (response.name === "getSelected") {
                    res.send(200, {
                        "name": "getSelected",
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
        var session = sessions[req.params.sessionId],
            snapScript = path.normalize("/helpers/snap.ps1"),
            snapPath = path.resolve(path.dirname(fs.realpathSync(__filename))),
            snap = path.join(snapPath, snapScript);

        if (session) {
            exec("powershell " + snap, function (error, stdout, stderr) {
                if (error) {
                    console.log(error);
                    return;
                }
                res.send(200, {});
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
