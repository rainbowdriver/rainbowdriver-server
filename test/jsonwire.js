var os = require('os'),
    assert = require('assert'),
    events = require('events'),
    util = require('util'),
    sinon = require('sinon'),
    restify = require('restify'),
    api = require('../jsonwire'),
    client;

api.jsonwire.listen(8745);
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
        it('should check if element is selected in browser', function(done){
            var conn = new StubConnection();
            var foo_selector = '.foo';
            var write_spy = sinon.spy(conn, 'write');

            conn.message = JSON.stringify({
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
        it('should findElement an return ID for element in browser', function(done){
            var conn = new StubConnection();
            conn.message = JSON.stringify({
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
        it('should find sub elements in browser', function(done){
            var conn = new StubConnection();
            var foo_selector = '.foo';
            var sub_foo_selector = '.sub.foo';
            var composed_selector = foo_selector + ' ' + sub_foo_selector;
            var sub_foo_id = 'sub_foo';
            var write_spy = sinon.spy(conn, 'write');

            conn.message = JSON.stringify({
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
        it('proper response when element don\'t exist', function(done){
            var conn = new StubConnection();
            conn.message = JSON.stringify({
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
    process.nextTick(function(){ // necessary in case of write being called befor event binding
        that.emit('data', that.message);
    });
};

