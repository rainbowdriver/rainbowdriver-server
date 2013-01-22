var assert = require('assert'),
    events = require('events'),
    util = require('util'),
    sinon = require('sinon'),
    b = require('../browser_connection');

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

    it('init properlly', function(){
        var browser = new b.Browser(),
            conn = new StubConnection();

        assert(Array.isArray(browser.connections));
        assert(typeof(browser.browser_connection.installHandlers) !== 'undefined');

        browser.browser_connection.emit('connection', conn);
        assert(browser.connections.length === 0);
    });

    describe('newConnection', function(){
        it('should bind events accordingly', function(){
            var browser = new b.Browser(),
                conn    = new StubConnection();

            browser.messageReceived = sinon.stub();
            browser.connectionClosed = sinon.stub();

            browser.newConnection(conn);

            conn.emit('data', {});
            conn.emit('close', conn);
            assert(browser.messageReceived.calledOnce);
            assert(browser.connectionClosed.calledOnce);
        });

    });

    describe('messageReceived', function(){
        var clock;

        beforeEach(function () { clock = sinon.useFakeTimers(); });
        afterEach(function () { clock.restore(); });

        it('should increment connections', function(){
            var browser = new b.Browser(),
                conn = new StubConnection();

            browser.connections = ['a', 'b'];
            browser.newConnection(conn);
            conn.emit('data', JSON.stringify({status: "ready", id: "foo", windowName: "bar"}));

            assert(browser.connections.indexOf(conn) == 2);
        });

        it('should terminate connection if not used in some time', function(){
            var browser = new b.Browser(),
                conn = new StubConnection();

            browser.connectionClosed = sinon.stub();

            browser.newConnection(conn);
            conn.emit('data', JSON.stringify({status: "ready", id: "foo", windowName: "bar"}));
            assert(browser.connections.indexOf(conn) === 0);
            conn.emit('data', {});
            clock.tick(10*60*1001);

            assert(browser.connections.length === 0);
            assert(browser.connectionClosed.calledOnce);
        });

        it('should not terminate connection before timeout', function(){
            var browser = new b.Browser(),
                conn = new StubConnection();

            browser.connectionClosed = sinon.stub();

            browser.newConnection(conn);
            conn.emit('data', JSON.stringify({status: "ready", id: "foo", windowName: "bar"}));
            assert(browser.connections.indexOf(conn) === 0);
            conn.emit('data', {});
            clock.tick(5*60*1001);

            assert(browser.connections.indexOf(conn) === 0);
            assert( ! browser.connectionClosed.called);
        });

    });

    describe('connectionClosed', function(){

        it('should remove inactive connections', function(){
            var browser = new b.Browser(),
                conn = new StubConnection();

            conn.id = 1;
            browser.connections = ['a', conn, 'b'];
            browser.connectionClosed(conn);
            assert(browser.connections.indexOf(conn) == -1);
            assert(browser.connections[0] == 'a');
            assert(browser.connections[1] == 'b');

        });

    });

});
