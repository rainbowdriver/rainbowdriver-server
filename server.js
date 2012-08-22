"use strict";
var restify = require('restify'),
    os = require('os'),
    sessions = {},
    sockjs = require('sockjs'),
    fs = require('fs'),
    terminal = require('color-terminal'),

    sockjs_opts = {sockjs_url: "/static/sockjs-0.3.min.js"},

    jsonwire = restify.createServer(),
    browser_con = sockjs.createServer(sockjs_opts);

jsonwire.use(restify.bodyParser());

jsonwire.use(function (req, res, next) {
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

browser_con.on('connection', function (conn) { // basic echo on sockjs example
    conn.on('data', function (message) {
        conn.write(message);
    });
});

jsonwire.get('/static/:file', function (req, res, next) {
    if (req.params.file === 'sockjs-0.3.min.js') { // TODO: proper static server
        res.contentType = "text/plain";
        res.send(fs.readFileSync("./static/sockjs-0.3.min.js", "utf8"));
    } else {
        return next();
    }
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

browser_con.installHandlers(jsonwire, {prefix: '/browser_con'});

jsonwire.listen(8080, function () {
    console.log('Selenium-WinJS: %s listening at %s', jsonwire.name, jsonwire.url);
});