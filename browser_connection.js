var sockjs = require('sockjs'),
    terminal = require('color-terminal');

(function () {
    "use strict";
    var timeoutValue = 10*60*1000,
        connections = [],
        browser_connection = sockjs.createServer();

    function newConnection(conn) {
        connections.push(conn);
        terminal
            .color('yellow')
            .write('Browser ' + connections.indexOf(conn) + ' connected').write('\n')
            .reset();

        conn.on('data', function (message) {
            var curDate = new Date().getTime();
            terminal
                .color('red')
                .write(' < Browser ' + connections.indexOf(conn) + ' message').write('\n\t')
                .color('white')
                .write(message).write('\n')
                .reset();
            if (!conn.lastUsed || conn.lastUsed - curDate < timeoutValue) {
                conn.lastUsed = curDate;
                if (conn.timer) {
                    clearTimeout(conn.timer);
                }
                conn.timer = setTimeout(function() {
                    connections.splice(connections.indexOf(conn),1);
                    conn.close();
                }, timeoutValue + 100);
            }
        });
        conn.on('close', function () {
            connections.splice(connections.indexOf(conn), 1);
            terminal
                .color('yellow')
                .write('Browser disconnected').write('\n')
                .reset();
        });
    }

    browser_connection.on('connection', newConnection);

    exports.browser_connection = browser_connection;
    exports.newConnection = newConnection;
    exports.getConnections = function() {
        return connections;
    };

})();
