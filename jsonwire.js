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
        connections, jsonwire,
        server = restify.createServer({name: 'Selenium Winjs'});

    jsonwire = {
        setConnections: function(newConnections) {
            connections = newConnections;
        },
        verbosity: function() {
            cconsole = colorize.console;
        },
        sessions: sessions,
        server: server,
        browser_manager: null
    };

    module.exports = jsonwire;

    server.use(restify.bodyParser());

    server.use(function wireLogger(req, res, next) {
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
        if ('body' in req && req.body) {
            cconsole.log('\t' + req.body);
        }
        return next();
    });

    server.on('NotFound', function (req, res) {
        cconsole.log('#green[ > ' + req.method + ' ] #cyan[' + req.path + ']');
        if ('body' in req && req.body) {
            cconsole.log('\t' + req.body);
        }
        res.send(405, {status:9, message: "UnknownCommand" });
        // this is the last call on the chain. No next, so server.on('after') won't fire
        cconsole.log('#green[ < ' + res.statusCode + ' ] #cyan[' + req.path + '] #red[ Command Not Implemented ]');
        cconsole.log('\t' + res._body);
    });

    server.get('/wd/hub/status', function (req, res, next) {
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

    server.post('/wd/hub/session', function (req, res, next) {
        var interval,
            session = {
                id: (new Date()).getTime(),
                'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
            };

        sessions[session.id] = session;

        console.log('------ expecting browser');
        session.listener = function(browser) {
            console.log('------ got browser');
            delete session.listener;
            session.browser = browser;
            res.header('Location', "/wd/hub/session/" + session.id);
            res.send(303);
            next();
        };
        jsonwire.browser_manager.getBrowser(session.listener);
    });

    server.get('/wd/hub/session/:sessionId', function (req, res, next) {
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

    server.del('/wd/hub/session/:sessionId', function (req, res, next) {
        var session = sessions[req.params.sessionId];

        if(session.browser) {
            session.browser.close();
        }
        if(session.listener) {
            sonwire.browser_manager.removeListener(session.listener);
        }
        delete sessions[req.params.sessionId];
        res.send(204);
        return next();
    });

    server.get('/wd/hub/sessions', function (req, res, next) {
        res.send(sessions);
        return next();
    });

    server.post('/wd/hub/session/:sessionId/moveto', function (req, res, next) {
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

    server.post('/wd/hub/session/:sessionId/click', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId],
            target = session.mouse && session.mouse.element,
            button = req.body && JSON.parse(req.body).button || 0,
            element;

        if(session) {
            if(target && target in session.elements) {
                element = session.elements[target];
                session.browser.clickElement({
                    button: button,
                    selector: element.selector.replace(/^selector_/, ''),
                    xoffset: session.mouse.xoffset,
                    yoffset: session.mouse.yoffset
                }, function(resp) {
                    response.sessionId = req.params.sessionId;
                    res.send(200, response);
                    next();
                });
            } else {
                res.send(500, {status: 7, sessionId: session.sessionId});
                next();
            }
        } else {
            response = {
                sessionId: session.sessionId,
                status: 6
            };
            res.send(500, response);
            next();
        }
    });

    server.get('/wd/hub/session/:sessionId/window_handle', function (req, res, next) {
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

    server.get('/wd/hub/session/:sessionId/window_handles', function (req, res, next) {
        var response,
            session = sessions[req.params.sessionId];
        if(session) {
            response = {
                sessionId: session.id,
                status: 0,
                value: session.windows.map(function(window) {
                    return window.windowName;
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

    server.post('/wd/hub/session/:sessionId/window', function (req, res, next) {
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

    server.post('/wd/hub/session/:sessionId/url', function (req, res, next) {
        res.send(200, {
            "name": "get",
            "sessionId": req.sessionId,
            "status": 0,
            "value": ""
        });
        return next();
    });

    server.get('/wd/hub/session/:sessionId/title', function (req, res, next) {
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

    server.post('/wd/hub/session/:sessionId/element', function (req, res, next) {
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

        session.browser.findElement({
            selector: JSON.parse(req.body).value
        },
        function(response) {
            var response_body;

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
        });
    });

    server.post('/wd/hub/session/:sessionId/element/:id/element', function (req, res, next) {
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

    server.get('/wd/hub/session/:sessionId/element/:elementId/displayed', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.elementId];

        session.browser.isElementDisplayed({
            selector: element.selector.replace(/^selector_/, '')
        },
        function(response) {
            if (response.status === 0) {
                var response_body = {
                    "name": "isElementDisplayed",
                    "sessionId": req.params.sessionId,
                    "status": 0,
                    "value": response.value
                };
                res.send(200, response_body);
            } else {
                res.send(500);
            }
            next();
        });
    });

    server.post('/wd/hub/session/:sessionId/element/:id/value', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        var text = JSON.parse(req.body).value.join("");

        if (element) {
            session.browser.sendKeys({
                selector: element.selector.replace(/^selector_/, ''),
                value: text
            },
            function(response) {
                var response_body = {
                    "sessionId": req.params.sessionId,
                    "status": 0,
                    "value": response.value
                };
                res.contentType = "json";
                res.charSet = "UTF-8";
                res.send(200, response_body);
                next();
            });
        } else {
            res.send(404);
            return next();
        }
    });

    server.post('/wd/hub/session/:sessionId/element/:id/click', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.browser.clickElement({
                selector: element.selector.replace(/^selector_/, ''),
            },
            function(response) {
                response.sessionId = req.params.sessionId;
                res.send(200, response);
                next();
            });
        } else {
            res.send(404);
            next();
        }
    });

    server.get('/wd/hub/session/:sessionId/element/:id/text', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            element = session.elements && session.elements[req.params.id];

        if (element) {
            session.browser.getValue({
                selector: element.selector.replace(/^selector_/, '')
            },
            function(response) {
                res.send(200, {
                    "name": "getElementText",
                    "sessionId": req.params.sessionId,
                    "status": 0,
                    "value": response.value
                });
                next();
            });
        } else {
            res.send(404);
            next();
        }
    });

    server.get('/wd/hub/session/:sessionId/element/:id/name', function (req, res, next) {
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

    server.post('/wd/hub/session/:sessionId/element/:id/clear', function (req, res, next) {
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

    server.get('/wd/hub/session/:sessionId/element/:id/selected', function (req, res, next) {
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

    server.post('/wd/hub/session/:sessionId/execute', function (req, res, next) {
        var session = sessions[req.params.sessionId];
        if (session) {

            session.browser.executeScript({
                script: JSON.parse(req.body).script
            }, function(result) {
                res.send(200, result);
                return next();
            });

        } else {
            res.send(404);
            return next();
        }
    });

    server.post('/wd/hub/session/:sessionId/low_level_keyb', function (req, res, next) {
        var session = sessions[req.params.sessionId],
            commandScript = path.normalize("/helpers/low_level_keyb.ps1 " + JSON.parse(req.body).command),
            commandPath = path.resolve(path.dirname(fs.realpathSync(__filename))),
            command = path.join(commandPath, commandScript);

        if (session) {
            exec("powershell " + command, function (error, stdout, stderr) {
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

    server.get('/wd/hub/session/:sessionId/element/:id/attribute/:name', function (req, res, next) {
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

    server.on('after', function responseLogger(req, res) {
        cconsole.log('#green[ < ' + res.statusCode + ' ] #cyan[' + req.path + ']');
        cconsole.log('\t' + res._body);
    });

})();
