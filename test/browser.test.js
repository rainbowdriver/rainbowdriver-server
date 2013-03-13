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

StubConnection.prototype.close = function () {
    this.emit('close');
};


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

});