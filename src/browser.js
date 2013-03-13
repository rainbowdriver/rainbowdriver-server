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
    if(this._connection) {
        return this._connection;
    } else {
        throw "No connection available";
    }
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

Browser.prototype._sendCommand = function(command, data) {
    if(!data && command) {
        data = command;
        command = null;
    }
    data.command = command || 'log';
    this._connection.write(JSON.stringify(data));
};

