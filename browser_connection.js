var sockjs   = require('sockjs'),
    colorize = require('colorize'),
    spawn    = require("child_process").spawn;

function runChild(command, args, callback) {
    var child = spawn(command, args, {customFds:[0,1,2]}),
        data = [];

    child.on("exit",function(code, signal){
        if(callback) {
            callback(code);
        }
    });
}

(function () {
    var timeoutValue = 10*60*1000;

    function Browser(verbose) {
        this.cconsole = verbose ? colorize.console : {log:function(){}};
        this.connections = [];
        this.browser_connection = sockjs.createServer();
        this.browser_connection.on('connection', this.newConnection.bind(this));
        return this;
    }

    Browser.prototype.newConnection = function(conn) {
        conn.on('data', this.messageReceived.bind(this, conn));
        conn.on('close', this.connectionClosed.bind(this, conn));
    };

    Browser.prototype.messageReceived = function(conn, message) {
        var that = this,
            msgObj = null,
            curDate = new Date().getTime();

        if (!conn.lastUsed || conn.lastUsed - curDate < timeoutValue) {
            conn.lastUsed = curDate;
            if (conn.timer) {
                clearTimeout(conn.timer);
            }
            conn.timer = setTimeout(function() {
                conn.close();
            }, timeoutValue + 100);
        }

        try {
            msgObj = JSON.parse(message);
        } catch(e) {}

        if (msgObj && msgObj.status === "ready" && msgObj.windowName) {
            conn.windowName = msgObj.windowName;
            conn.id = msgObj.id;
            conn.windowLoc = msgObj.windowLoc;
            conn.windowType = msgObj.windowType;
            conn.backgroundSupported = msgObj.backgroundSupported;
            this.cconsole.log('#yellow[Browser ' + conn.id + ' connected]');
            this.connections.push(conn);
            if(msgObj.backgroundSupported && /application/i.test(msgObj.windowType)) {
                this.cconsole.log('#yellow[Trying to close background modal dialog]');
                runChild("powershell.exe", [__dirname + '\\helpers\\low_level_keyb.ps1 TAB']);
                runChild("powershell.exe", [__dirname + '\\helpers\\low_level_keyb.ps1 RETURN']);
                conn.write(JSON.stringify({
                    internalCommand: 'resetBackgroundSupported'
                }));
            }
        }

        if(conn.id) {
            this.cconsole.log('#red[ < Browser ' + conn.id + ' message]');
            this.cconsole.log('\t' + message);
        }
    };

    Browser.prototype.connectionClosed = function(conn) {
        this.cconsole.log('#yellow[Browser ' + conn.id + ' disconnected]');
        this.connections.splice(this.connections.indexOf(conn), 1);
    };

    exports.Browser = Browser;

})();
