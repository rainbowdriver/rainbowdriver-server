var os = require('os'),
    assert = require('assert'),
    events = require('events'),
    util = require('util'),
    sinon = require('sinon'),
    restify = require('restify'),
    api = require('../jsonwire'),
    client;

api.server.listen(8745);
client = restify.createJsonClient({
  url: 'http://localhost:8745/'
});

describe('JSON Wire API', function(){
    afterEach(function(){
        var a;
        for(a in api.sessions) {
            delete api.sessions[a];
        }
    });

    describe('/wd/hub/status', function(){
        it('respond with os properties', function(done){
            var expected = {
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
                };

            client.get('/wd/hub/status', function(err, req, res, obj) {
                assert.deepEqual(obj, expected);
                done();
            });
        });
    });

    describe('/wd/hub/session', function(){
        it('should create a session when invoked with POST', function(done){
            var session = {
                'desiredCapabilities': {
                    'browser' : 'mockedBrowser'
                }
            };
            var browser = {
                on: sinon.stub()
            };
            var sessionId;

            api.browser_manager = {
                getBrowser: function(callback) {
                    Object.getOwnPropertyNames(api.sessions).forEach(function(sid) {
                        sessionId = sid;
                        assert(typeof api.sessions[sessionId].listener === 'function');
                        callback(browser);
                    });                    
                }
            };

            client.post('/wd/hub/session', session, function(err, req, res, obj) {
                assert(typeof api.sessions[sessionId].listener === 'undefined');
                assert(res.headers.location.indexOf("/wd/hub/session/") !== -1);
                assert.equal(res.statusCode, 303);
                assert(browser.on.calledOnce);
                done();
            });
        });
        it('should return the session information when invoked with GET');
        it('should delete a session when invoked with DELETE');
    });

    describe('/wd/hub/session/:sessionId/window_handle', function(){
        it('respond with current window name', function(done){
            var expected = {
                    sessionId: "mysession",
                    status: 0,
                    value: "FooWindow"
                };
            var conn = new StubConnection();
            conn.windowName = "FooWindow";
            api.sessions.mysession = {
                id: "mysession",
                connection: conn
            };

            client.get('/wd/hub/session/mysession/window_handle', function(err, req, res, obj) {
                assert.deepEqual(obj, expected);
                done();
            });
        });
    });

    describe('/wd/hub/session/:sessionId/window_handles', function(){
        it.skip('respond with a list of current windows', function(done){
            var expected = {
                    sessionId: "mysession",
                    status: 0,
                    value: ["FooWindow","BarWindow"]
                };
            var conn1 = new StubConnection();
            var conn2 = new StubConnection();
            conn1.id = "handles";
            conn1.windowName = "FooWindow";
            conn2.id = "handles";
            conn2.windowName = "BarWindow";
            api.sessions.mysession = {
                id: "mysession",
                connection: conn1
            };
            api.setConnections([conn1,conn2]);

            client.get('/wd/hub/session/mysession/window_handles', function(err, req, res, obj) {
                assert.deepEqual(obj, expected);
                done();
            });
        });
    });

    describe('/wd/hub/session/:sessionId/element', function(){
        it('404 when session dont\'t exist', function(done){
            client.post('/wd/hub/session/666/element', {}, function(err, req, res, obj) {
                assert.equal(res.statusCode, 404);
                done();
            });
        });
        it('501 when selector not provided', function(done){
            api.sessions['501'] = {};
            client.post('/wd/hub/session/501/element', {}, function(err, req, res, obj) {
                assert.equal(res.statusCode, 501);
                done();
            });
        });
        it.skip('should check if element is selected in browser', function(done){
            var conn = new StubConnection();
            var foo_selector = '.foo';
            var write_spy = sinon.spy(conn, 'write');

            conn.respondWithMock = JSON.stringify({
                name: 'getSelected',
                status: 0,
                value: true
            });

            api.sessions.aaa = {
                connection: conn,
                elements: {
                    foo: {
                        id: 12345,
                        selector: foo_selector
                    }
                }
            };
            client.get('/wd/hub/session/aaa/element/foo/selected', function(err, req, res, obj) {
                assert(write_spy.calledOnce);

                assert(write_spy.calledWithExactly(JSON.stringify({
                    command: "getSelected",
                    selector: foo_selector
                })));

                assert.deepEqual(obj, { name: 'getSelected', sessionId: 'aaa', status: 0, value: true });
                done();
            });
        });
        it.skip('should clear the element', function(done){
            var conn = new StubConnection(),
                elementId = "foo";

            conn.respondWithMock = JSON.stringify({
                name: 'clear',
                status: 0,
                elementId: elementId
            });
            api.sessions.aaa = {
                connection: conn,
                elements: {
                    foo: {
                        id: 12345,
                        selector: "body"
                    }
                }
            };
            client.post('/wd/hub/session/aaa/element/' + elementId + '/clear', { using: "css selector"}, function(err, req, res, obj) {
                assert.deepEqual(obj, { name: 'clear', sessionId: 'aaa', status: 0 });
                done();
            });
        });
        it.skip('should findElement an return ID for element in browser', function(done){
            var conn = new StubConnection();
            conn.respondWithMock = JSON.stringify({
                name: 'findElement',
                status: 0,
                elementId: 'foo'
            });
            api.sessions.aaa = {
                connection: conn
            };
            client.post('/wd/hub/session/aaa/element', { using: "css selector"}, function(err, req, res, obj) {
                assert.deepEqual(obj, { name: 'findElement', sessionId: 'aaa', status: 0, value: {"ELEMENT":"foo"} });
                done();
            });
        });
        it.skip('should find sub elements in browser', function(done){
            var conn = new StubConnection();
            var foo_selector = '.foo';
            var sub_foo_selector = '.sub.foo';
            var composed_selector = foo_selector + ' ' + sub_foo_selector;
            var sub_foo_id = 'sub_foo';
            var write_spy = sinon.spy(conn, 'write');

            conn.respondWithMock = JSON.stringify({
                name: 'findElement',
                status: 0,
                elementId: 'sub_foo',
                selector: composed_selector
            });

            api.sessions.aaa = {
                connection: conn,
                elements: {
                    foo: {
                        id: 12345,
                        selector: foo_selector
                    }
                }
            };

            client.post('/wd/hub/session/aaa/element/foo/element', { using: "css selector", value: sub_foo_selector}, function(err, req, res, obj) {
                assert(write_spy.calledOnce);

                assert(write_spy.calledWithExactly(JSON.stringify({
                    command: "findElement",
                    selector: composed_selector
                })));

                assert.deepEqual(api.sessions.aaa.elements.sub_foo, { id: sub_foo_id, selector: 'selector_' + composed_selector });

                assert.deepEqual(obj, { name: 'findElement', sessionId: 'aaa', status: 0, value: {"ELEMENT": sub_foo_id} });

                conn.write.restore();
                done();
            });
        });
        it.skip('proper response when element don\'t exist', function(done){
            var conn = new StubConnection();
            conn.respondWithMock = JSON.stringify({
                name: 'findElement',
                status: 7
            });
            api.sessions.aaa = {
                connection: conn
            };
            client.post('/wd/hub/session/aaa/element', { using: "css selector"}, function(err, req, res, obj) {
                assert.deepEqual(obj, {"name":"findElement","sessionId":"aaa","status":7,"value":{}});
                done();
            });
        });
    });
});

function StubConnection(attrs) {
    var attr;
    events.EventEmitter.call(this);
    for (attr in attrs) {
        this[attr] = attrs[attr];
    }
    return this;
}

util.inherits(StubConnection, events.EventEmitter);

StubConnection.prototype.close = sinon.stub();
StubConnection.prototype.write = function() {
    var that = this;
    process.nextTick(function(){ // necessary in case of write being called before event binding
        that.emit('data', that.respondWithMock);
    });
};

