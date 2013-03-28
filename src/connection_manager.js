var sockjs   = require('sockjs'),
    colorize = require('colorize'),
    Browser = require('../src/browser'),
    waitingConnections = [],
    waitingListeners = [],
    con_counter = 0,
    lis_counter = 0;

socket_server = sockjs.createServer();
socket_server.on('connection', function(connection) {
    var browser = new Browser();
    browser.con_counter = ++con_counter;
    colorize.console.log('#magenta[--- browser ('+browser.con_counter+') connected]');
    browser.verbose = true;
    browser.connection = connection;
    browser.on('close', function() {
        colorize.console.log('#magenta[--- browser ('+browser.con_counter+') disconnected]');
    });
    if(browser.id) {
        findListener(browser);
    } else {
        browser.on('ready', function() {
            findListener(browser);
        });
    }
});

function findListener(browser) {
    var listener = waitingListeners.shift();
    if(listener) {
        respondWithBrowser(browser, listener);
    } else {
        waitingConnections.push(browser);
    }
}

function respondWithBrowser(browser, listener) {
    colorize.console.log('#yellow[--- binded connections (listener '+listener.lis_counter+' and browser '+browser.con_counter+')]');
    listener(browser);
}

function getBrowser(listener, filterFn) {
    listener.lis_counter = ++lis_counter;
    colorize.console.log('#magenta[--- driver ('+listener.lis_counter+') connected]');
    var connection,
        acceptableConnections = waitingConnections;
    if(filterFn) {
        acceptableConnections = waitingConnections.filter(filterFn);
    }
    connection = acceptableConnections.shift();
    if(connection) {
        respondWithBrowser(connection, listener);
        var index = waitingConnections.indexOf(connection);
        if(index !== -1) {
            waitingConnections.splice(index, 1);
        }
    } else {
        waitingListeners.push(listener);
    }
}

function removeListener(listener) {
    var index = waitingListeners.indexOf(listener);
    if (index !== -1) {
        waitingListeners.splice(index, 1);
    }
}

module.exports = {
    getBrowser: getBrowser,
    removeListener: removeListener,
    waitingListeners: waitingListeners,
    waitingConnections: waitingConnections,
    socket_server: socket_server
};