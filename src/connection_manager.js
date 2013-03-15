var sockjs   = require('sockjs'),
    Browser = require('../src/browser'),
    waitingConnections = [],
    waitingListeners = [];

socket_server = sockjs.createServer();
socket_server.on('connection', function(connection) {
    console.log('--- browser connected');
    listener = waitingListeners.shift();
    if(listener) {
        respondWithBrowser(connection, listener);
    } else {
        waitingConnections.push(connection);
    }
});

function respondWithBrowser(connection, listener) {
    console.log('--- binded connections');
    var browser = new Browser();
    browser.connection = connection;
    listener(browser);
}

function getBrowser(callback) {
    console.log('--- driver connected');
    var connection = waitingConnections.shift();
    if(connection) {
        respondWithBrowser(connection, callback);
    } else {
        waitingListeners.push(callback);
    }
}

module.exports = {
    getBrowser: getBrowser,
    waitingListeners: waitingListeners,
    waitingConnections: waitingConnections,
    socket_server: socket_server
};