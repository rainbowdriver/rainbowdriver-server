var assert = require('assert'),
    events = require('events'),
    util = require('util');
    sinon = require('sinon'),
    Browser = require('../src/browser');

function StubConnection(attrs) {
    var attr;
    events.EventEmitter.call(this);
    for (attr in attrs) {
        this[attr] = attrs[attr];
    }
    return this;
}

util.inherits(StubConnection, events.EventEmitter);

StubConnection.prototype.write = sinon.stub();
StubConnection.prototype.close = sinon.stub();

describe('Browser', function(){

    describe('constructor', function() {

        it('should be an event emmiter', function(){
            var browser = new Browser(),
                stub = sinon.stub(),
                expect = { a: 'b' };

            browser.on('randomEvent', stub);
            browser.emit('randomEvent', expect);

            assert(browser instanceof events.EventEmitter, 'instanceof EventEmitter');
            assert(stub.calledWith(expect));
        });

        it('should have contructor safeguard', function(){
            var browser = Browser();
            assert(browser instanceof events.EventEmitter, 'instanceof EventEmitter');
        });

    });

    describe('connection binding', function() {
        it('should save connection', function() {
            var browser = Browser(),
                fakeConn = new StubConnection();

            browser.connection = fakeConn;
            assert.equal(browser.connection, fakeConn);
        });
        it('should not accept a second connection', function() {
            var browser = Browser(),
                fakeConn1 = new StubConnection(),
                fakeConn2 = new StubConnection();

            browser.connection = fakeConn1;
            assert.throws(function() {
                browser.connection = fakeConn2;
            });
            assert.equal(browser.connection, fakeConn1);
        });
        it('should emit "connected" when connection is set', function(endTest) {
            var browser = Browser(),
                fakeConn = new StubConnection();

            browser.on('connected', function() {
                endTest();
            });
            browser.connection = fakeConn;
        });
    });

    describe('_sendCommand sending messages', function() {
        var browser = null;

        beforeEach(function() {
            browser = new Browser();
            browser.connection = new StubConnection();
        });
        afterEach(function() {
            browser = null;
        });

        it('should pass a json encoded string to the connection', function() {
            browser._sendCommand('getElement', { foo: 'bar' });
            assert.deepEqual(JSON.parse(browser.connection.write.firstCall.args), { foo: 'bar', command: 'getElement' });
            browser.connection.write.reset();
        });

        it('fallback to "log" if no command provided', function () {
            browser._sendCommand({ foo: 'bar' });
            browser._sendCommand(null ,{ bar: 'foo' });
            assert.deepEqual(JSON.parse(browser.connection.write.firstCall.args), { foo: 'bar', command: 'log' });
            assert.deepEqual(JSON.parse(browser.connection.write.secondCall.args), { bar: 'foo', command: 'log' });
            browser.connection.write.reset();
        });

        it('should emmit error after 30 seconds timeout and close connection', function(endTest) {
            var clock = sinon.useFakeTimers();
            browser.once('getElement', function(message) {
                assert.equal(message.error, 'timeout');
                clock.restore();
                endTest();
            });
            browser._sendCommand('getElement', { foo: 'bar' });
            clock.tick(30000);
        });

        it('should not timeout if connection responded', function(endTest) {
            var clock = sinon.useFakeTimers(),
                listener = sinon.stub();
            browser.on('getElement', listener);
            browser._sendCommand('getElement', { foo: 'bar' });
            clock.tick(500);
            browser.emit('getElement', { success: true });
            clock.tick(30000);
            assert(listener.calledOnce, 'called ' + listener.callCount );
            clock.restore();
            endTest();
        });
    });

});