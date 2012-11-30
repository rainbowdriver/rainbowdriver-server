var sockjs = require('sockjs'),
    colorize = require('colorize'),
    cconsole = colorize.console;

(function () {
    var timeoutValue = 10*60*1000;

    function Browser() {
        this.connections = [];
        this.browser_connection = sockjs.createServer();
        this.browser_connection.on('connection', this.newConnection.bind(this));
        return this;
    }

    Browser.prototype.newConnection = function(conn) {
        this.connections.push(conn);

        cconsole.log('#yellow[Browser ' + this.connections.indexOf(conn) + ' connected]');

        conn.on('data', this.messageReceived.bind(this, conn));
        conn.on('close', this.connectionClosed.bind(this, conn));
    };

    Browser.prototype.messageReceived = function(conn, message) {
        var that = this,
            curDate = new Date().getTime();

        cconsole.log('#red[ < Browser ' + this.connections.indexOf(conn) + ' message]');
        cconsole.log('\t' + message);

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
    };

    Browser.prototype.connectionClosed = function(conn) {
        cconsole.log('#yellow[Browser ' + this.connections.indexOf(conn) + ' disconnected]');
        this.connections.splice(this.connections.indexOf(conn), 1);
    };

    exports.Browser = Browser;

})();
