var sockjs   = require('sockjs'),
    colorize = require('colorize'),
    Browser = require('../src/browser'),
    waitingConnections = [],
    waitingListeners = [];

socket_server = sockjs.createServer();
socket_server.on('connection', function(connection) {
    colorize.console.log('#magenta[--- browser connected]');
    var browser = new Browser();
    browser.verbose = true;
    browser.connection = connection;
    browser.on('close', function() {
        colorize.console.log('#magenta[--- browser disconnected]');
    });
    listener = waitingListeners.shift();
    if(listener) {
        respondWithBrowser(browser, listener);
    } else {
        waitingConnections.push(browser);
    }
});

function respondWithBrowser(browser, listener) {
    colorize.console.log('#yellow[--- binded connections]');
    listener(browser);
}

function getBrowser(receiver, filterFn) {
    colorize.console.log('#magenta[--- driver connected]');
    var connection,
        acceptableConnections = waitingConnections;
    if(filterFn) {
        acceptableConnections = waitingConnections.filter(filterFn);
    }
    connection = acceptableConnections.shift();
    if(connection) {
        respondWithBrowser(connection, receiver);
        var index = waitingConnections.indexOf(connection);
        if(index !== -1) {
            waitingConnections.splice(index, 1);
        }
    } else {
        waitingListeners.push(receiver);
    }
}

module.exports = {
    getBrowser: getBrowser,
    waitingListeners: waitingListeners,
    waitingConnections: waitingConnections,
    socket_server: socket_server
};