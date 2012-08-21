"use strict";
var restify = require('restify'),
    os = require('os'),
    sessions = {},
    sockjs = require('sockjs'),
    fs = require('fs'),

    sockjs_opts = {sockjs_url: "/static/sockjs-0.3.min.js"},

    jsonwire = restify.createServer(),
    browser_con = sockjs.createServer(sockjs_opts);

jsonwire.use(restify.bodyParser());

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

jsonwire.get('/status', function (req, res, next) {
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

jsonwire.post('/session', function (req, res, next) {
    var session = {
            'id' : new Date().getTime(),
            'desiredCapabilities' : JSON.parse(req.body).desiredCapabilities
        };
    sessions[session.id] = session;
    res.header('Location', "/session/" + session.id);
    res.send(303);
});

jsonwire.del('/session/:id', function (req, res, next) {
    delete sessions[req.params.id];
    res.send(204);
});

jsonwire.get('/sessions', function (req, res, next) {
    res.send(sessions);
});

browser_con.installHandlers(jsonwire, {prefix: '/browser_con'});

jsonwire.listen(8080, function () {
    console.log('Selenium-WinJS: %s listening at %s', jsonwire.name, jsonwire.url);
});