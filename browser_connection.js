/*globals jsonwire, sessions, connections, browser_connection, console */

(function () {
    "use strict";
    var timeoutValue = 10*60*1000;

    browser_connection.on('connection', function (conn) {
        conn.on('data', function (message) {
            var curDate = new Date().getTime();
            console.log("[BROWSER_CONN] " + message);
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
        });
        connections.push(conn);
    });
})();
