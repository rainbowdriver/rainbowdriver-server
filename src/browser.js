var util = require('util'),
    colorize = require('colorize'),
    events = require('events'),
    commands = require('./browser.commands');

function log(browser, inOut, message) {
    if(!browser.verbose) {
        return;
    }
    colorize.console.log('#yellow[' + (inOut? '>>>': '<<<') + '] browser ' + (browser && browser.id ? browser.id:'') + '' + ((browser && browser.connection && browser.connection.windowName) || ''));
    console.log('\t' + JSON.stringify(message));
}

function Browser() {
    if(false === (this instanceof Browser)) {
        return new Browser();
    }
    this.timeouts = {};
    this.windows = [];
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
    if (this.windows.indexOf(connection) === -1) {
        throw "Could not set connection to unknown window";
    } else {
        this._connection = connection;
        this.emit('connected');
        console.log("-------- WINDOW = " + connection.windowName);
    }
}

Object.defineProperty(Browser.prototype, 'connection', {
    get: _getConnection,
    set: _setConnection
});

Browser.prototype.addWindow = function(window) {
    console.log('---------- ADD WINDOW ' + window.windowName);
    window.on('close', this._invalidateConnection.bind(this, window));
    window.on('data', this._dataReceiver.bind(this));
    this.windows.push(window);
    if (this.windows.length === 1) {
        this.connection = window;
    }
};

Browser.prototype._invalidateConnection = function(window) {
    console.log('---------- REMOVE WINDOW ' + window.windowName);
    window.removeAllListeners();
    window = {
        broken : true
    };
    this.windows.splice(this.windows.indexOf(window), 1);
    if(this._connection == window) {
        if(this.windows.length) {
            this._connection = this.windows[0];
        } else {
            this._connection = null;
        }
    }
    if(this.windows.length === 0) {
        this.emit('close');
    }
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

Browser.prototype.close = function () {
    if(this._connection.end) {
        this._connection.end();
    }
};