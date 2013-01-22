var sockjs = require('sockjs'),
    colorize = require('colorize');

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
                that.connections.splice(that.connections.indexOf(conn),1);
                conn.close();
            }, timeoutValue + 100);
        }

        try {
            msgObj = JSON.parse(message);
        } catch(e) {}

        if (msgObj && msgObj.status === "ready" && msgObj.windowName) {
            conn.windowName = msgObj.windowName;
            conn.id = msgObj.id;
            this.cconsole.log('#yellow[Browser ' + conn.id + ' connected]');
            this.connections.push(conn);
        }

        if(conn.id) {
            this.cconsole.log('#red[ < Browser ' + conn.id + ' message]');
            this.cconsole.log('\t' + message);
        }
    };

    Browser.prototype.connectionClosed = function(conn) {
        this.cconsole.log('#yellow[Browser ' + conn.id + ' disconnected]');
        this.connections.splice(conn.id, 1);
    };

    exports.Browser = Browser;

})();
