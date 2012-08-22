
module.exports = {
    init: function (browser_connection, sessions) {
        "use strict";


        browser_connection.on('connection', function (conn) { // basic echo on sockjs example
            conn.on('data', function (message) {
                conn.write(message);
            });
        });
    }
};
