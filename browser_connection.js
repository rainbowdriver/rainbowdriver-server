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
        var that = this;
        this.connections.push(conn);

        cconsole.log('#yellow[Browser ' + this.connections.indexOf(conn) + ' connected]');

        conn.on('data', function(message) {
            that.messageReceived.call(that, conn, message);
        });
        conn.on('close', function() {
            that.connectionClosed.call(that, conn);
        });
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

    Browser.prototype.getConnections = function() {
        return this.connections;
    };

    exports.Browser = Browser;

})();
