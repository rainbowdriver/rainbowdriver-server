/*globals jsonwire, sessions, connections, browser_connection */

(function () {
    "use strict";

    browser_connection.on('connection', function (conn) {
        conn.on('data', function (message) {
            console.log("[BROWSER_CONN] " + message);
        });
        conn.on('close', function () {
            connections.splice(connections.indexOf(conn), 1);
        });
        connections.push(conn);
    });
})();
