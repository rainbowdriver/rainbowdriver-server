var util = require('util'),
    events = require('events');

function Browser() {
    if(false === (this instanceof Browser)) {
        return new Browser();
    }
    events.EventEmitter.call(this);
}
util.inherits(Browser, events.EventEmitter);

module.exports = Browser;

function _getConnection() {
    return this._connection;
}

function _setConnection(connection) {
    if (this._connection) {
        throw "Could not override connection";
    } else {
        this._connection = connection;
        this.emit('connected');
    }
}

Object.defineProperty(Browser.prototype, 'connection', {
    get: _getConnection,
    set: _setConnection
});

