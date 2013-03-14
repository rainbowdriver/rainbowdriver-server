var util = require('util'),
    events = require('events');

function Browser() {
    if(false === (this instanceof Browser)) {
        return new Browser();
    }
    this.timeouts = {};
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
        connection.on('close', this._invalidateConnection.bind(this));
        connection.on('data', this._dataReceiver.bind(this));
        this._connection = connection;
        this.emit('connected');
    }
}

Object.defineProperty(Browser.prototype, 'connection', {
    get: _getConnection,
    set: _setConnection
});

Browser.prototype._invalidateConnection = function() {
    this._connection.removeAllListeners();
    this._connection = {
        broken : true
    };
};

Browser.prototype._sendCommand = function(command, data) {
    if(!data && command) {
        data = command;
        command = null;
    }
    data.command = command || 'log';

    // timeout logic
    var that = this;
    this.timeouts[command] = setTimeout(function() {
        that._connection.close();
        that.emit(command, {error: 'timeout'});
    }, 30000);
    this.once(command, function() {
        clearTimeout(that.timeouts[command]);
        delete that.timeouts[command];
    });

    // send message
    this._connection.write(JSON.stringify(data));
};

Browser.prototype._dataReceiver =  function(dataStr) {
    var data;
    try {
        data = JSON.parse(dataStr);
    } catch (e) {
        data = {
            error: "Invalid JSON received.",
            message: e.message,
            originalData: dataStr
        };
    }
    this.emit(data.command || 'log', data);
};

