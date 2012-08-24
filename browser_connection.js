/*globals jsonwire, sessions, connections, browser_connection */

(function () {
    "use strict";

    browser_connection.on('connection', function (conn) { // basic echo on sockjs example
        conn.on('data', function (message) {
            conn.write(message);
        });
        conn.on('close', function () {
            connections.splice(connections.indexOf(conn), 1);
        });
        connections.push(conn);
    });
})();
