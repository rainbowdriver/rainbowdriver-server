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
StubConnection.prototype.close = function() {
    this.emit('close');
};
StubConnection.prototype.end = StubConnection.prototype.close;

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
                fakeConnection = new StubConnection();

            browser.connection = fakeConnection;
            assert.equal(browser.connection, fakeConnection);
        });
        it('should not accept a second connection', function() {
            var browser = Browser(),
                fakeConnection1 = new StubConnection(),
                fakeConnection2 = new StubConnection();

            browser.connection = fakeConnection1;
            assert.throws(function() {
                browser.connection = fakeConnection2;
            });
            assert.equal(browser.connection, fakeConnection1);
        });
        it('should emit "connected" when connection is set', function(endTest) {
            var browser = Browser(),
                fakeConnection = new StubConnection();

            browser.on('connected', function() {
                endTest();
            });
            browser.connection = fakeConnection;
        });
        it('should bind close event to _invalidateConnection', function () {
            var browser = Browser(),
                fakeConnection = new StubConnection();

            sinon.stub(browser, '_invalidateConnection');
            browser.connection = fakeConnection;
            fakeConnection.emit('close');
            assert(browser._invalidateConnection.calledOnce, '_invalidateConnection not called');
        });
    });

    describe('_invalidateConnection', function() {
        it('should remove all listeners from connection', function() {
            var browser = Browser(),
                fakeConnection = new StubConnection(),
                browserListener = sinon.stub(),
                connectionListener = sinon.stub();

            browser.connection = fakeConnection;
            browser.connection.on('data', connectionListener);
            browser.on('close', browserListener);
            browser._invalidateConnection();
            fakeConnection.emit('data', {foo:'bar'});
            assert(connectionListener.notCalled, 'listener called');
            assert(browserListener.calledOnce, 'browser "close" should fire');
        });
        it('should replace connection with error object', function() {
            var browser = Browser(),
                fakeConnection = new StubConnection();

            browser.connection = fakeConnection;
            browser._invalidateConnection();
            assert.notEqual(browser.connection, fakeConnection);
            assert.equal(browser.connection.broken, true);
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

        it('should emmit error after 30 seconds timeout invalidate and close connection', function(endTest) {
            var clock = sinon.useFakeTimers();
            browser = new Browser();
            sinon.stub(browser, '_invalidateConnection');
            browser.connection = new StubConnection();
            browser.once('getElement', function(message) {
                assert(browser._invalidateConnection.calledOnce, '_invalidateConnection not called');
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

    describe('raceiving data', function() {
        var browser = null,
            fakeConnection =  null;

        beforeEach(function() {
            browser = new Browser();
            fakeConnection = new StubConnection();
            browser.connection = fakeConnection;
        });
        afterEach(function() {
            browser = null;
            fakeConnection = null;
        });

        it('should emit event with the command name and details', function(endTest) {
            browser.on('someCommand', function(details) {
                assert.equal(details.foo, 'bar');
                endTest();
            });
            fakeConnection.emit('data', JSON.stringify({
                command: 'someCommand',
                foo: 'bar'
            }));
        });
        it('should default to log when no command is sent', function(endTest) {
            browser.on('log', function(details) {
                assert.equal(details.foo, 'bar');
                endTest();
            });
            fakeConnection.emit('data', JSON.stringify({
                foo: 'bar'
            }));
        });
        it('should log when no valid json is received', function(endTest) {
            browser.on('log', function(details) {
                assert.equal(details.error, "Invalid JSON received.");
                assert.equal(typeof details.message, 'string');
                assert.equal(details.originalData, 'no json message');
                endTest();
            });
            fakeConnection.emit('data', "no json message");
        });
    });

    describe('ready event', function(){
        var browser = null,
            fakeConnection =  null;

        beforeEach(function() {
            browser = new Browser();
            fakeConnection = new StubConnection();
        });
        afterEach(function() {
            browser = null;
            fakeConnection = null;
        });

        it('should fire _browserData', function() {
            sinon.stub(browser, '_browserData');
            browser.connection = fakeConnection;
            browser.emit('ready');
            assert(browser._browserData.calledOnce);
        });

        it('should save proterties when _browserData is called', function () {
            var data = {
                command: "ready",
                windowName: "rings.destroyPlan",
                windowLoc: "C:\\Users\\gandalf\\rings\\onering\\default.html",
                windowType: "Application",
                backgroundSupported: true,
                id: "rings.destroyPlan_1363366682315"
            };
            browser.connection = fakeConnection;
            browser.emit('ready', data);
            assert.equal(browser.command, undefined);
            assert.equal(browser.windowName, data.windowName);
            assert.equal(browser.windowLoc, data.windowLoc);
            assert.equal(browser.windowType, data.windowType);
            assert.equal(browser.backgroundSupported, data.backgroundSupported);
            assert.equal(browser.id, data.id);
        });
    });

    describe('close', function() {
        var browser = null,
            fakeConnection =  null;

        beforeEach(function() {
            browser = new Browser();
            fakeConnection = new StubConnection();
            browser.connection = fakeConnection;
        });
        afterEach(function() {
            browser = null;
            fakeConnection = null;
        });
        it('should end connection when closing browser', function () {
            var stub = sinon.stub();
            fakeConnection.on('close', stub);
            browser.close();
            assert(stub.calledOnce);
        });
    });

});