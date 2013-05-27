var util = require('util'),
    colorize = require('colorize'),
    events = require('events'),
    commands = require('./browser.commands');

function log(browser, inOut, message) {
    if(!browser.verbose) {
        return;
    }
    colorize.console.log('#yellow[' + (inOut? '>>>': '<<<') + '] browser ' + (browser && browser.id ? browser.id:''));
    console.log('\t' + JSON.stringify(message));
}

function Browser() {
    if(false === (this instanceof Browser)) {
        return new Browser();
    }
    this.timeouts = {};
    events.EventEmitter.call(this);
}
util.inherits(Browser, events.EventEmitter);

module.exports = Browser;

Object.getOwnPropertyNames(commands).forEach(function(command){
    Browser.prototype[command] = commands[command];
});

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
        this.on('ready', this._browserData.bind(this));
    }
}

Object.defineProperty(Browser.prototype, 'connection', {
    get: _getConnection,
    set: _setConnection
});

Browser.prototype._invalidateConnection = function() {
    this.emit('close');
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
    this.timeouts[data.command] = setTimeout(function() {
        var error = {error: 'timeout'};
        log(this, true, error);
        if(that._connection.close) {
            that._connection.close();
        }
        that.emit(data.command, error);
    }, 30000);
    this.once(data.command, function() {
        clearTimeout(that.timeouts[data.command]);
        delete that.timeouts[data.command];
    });
    // send message
    log(this, true, data);
    this._connection.write(JSON.stringify(data));
};

Browser.prototype._dataReceiver =  function(dataStr) {
    var data;
    try {
        data = JSON.parse(dataStr);
    } catch (e) {
        data = {
            error: "Invalid JSON received.",
            message: e.toString()
        };
        if(typeof dataStr === 'string') {
            data.originalData = dataStr;
        }
    }
    log(this, false, data);
    this.emit(data.command || 'log', data);
};

Browser.prototype._browserData = function (data) {
    var that = this;
    if(data.command) {
        delete data.command;
    }
    Object.getOwnPropertyNames(data).forEach(function (key) {
        that[key] = data[key];
    });
};

Browser.prototype.close = function () {
    if(this._connection.end) {
        this._connection.end();
    }
};