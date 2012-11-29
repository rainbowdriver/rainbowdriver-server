var sockjs = require('sockjs'),
    terminal;

(function () {
    var timeoutValue = 10*60*1000;

    function Browser(verbose) {
        if(verbose) {
            terminal = require('color-terminal');
        }
        this.verbose = verbose;
        this.connections = [];
        this.browser_connection = sockjs.createServer();
        this.browser_connection.on('connection', this.newConnection.bind(this));
        return this;
    }

    Browser.prototype.newConnection = function(conn) {
        var that = this;
        this.connections.push(conn);

        if(this.verbose) {
            terminal
                .color('yellow')
                .write('Browser ' + this.connections.indexOf(conn) + ' connected').write('\n')
                .reset();
        }

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
        if(this.verbose) {
            terminal
                .color('red')
                .write(' < Browser ' + this.connections.indexOf(conn) + ' message').write('\n\t')
                .color('white')
                .write(message).write('\n')
                .reset();
        }
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
        this.connections.splice(this.connections.indexOf(conn), 1);
        if(this.verbose) {
            terminal
                .color('yellow')
                .write('Browser disconnected').write('\n')
                .reset();
        }
    };

    Browser.prototype.getConnections = function() {
        return this.connections;
    };

    exports.Browser = Browser;

})();
