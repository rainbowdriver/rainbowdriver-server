var sockjs   = require('sockjs'),
    colorize = require('colorize'),
    Browser = require('../src/browser'),
    waitingConnections = [],
    waitingListeners = [],
    con_counter = 0,
    lis_counter = 0,
    knownBrowsers = [];

socket_server = sockjs.createServer();
socket_server.on('connection', function(connection) {
    connection.con_counter = ++con_counter;
    colorize.console.log('#magenta[--- connection ('+connection.con_counter+') connected]');
    connection.on('close', function() {
        colorize.console.log('#magenta[--- connection ('+connection.con_counter+') disconnected]');
    });
    connection.once('data', function(data) {
        connection.originalReadyData = data;
        try{
            data = JSON.parse(data);
        } catch (e) {
            colorize.console.log('#magenta[--- connection ('+connection.con_counter+') error, disconnecting]');
            connection.end();
            return;
        }
        delete data.command;

        Object.getOwnPropertyNames(data).forEach(function (key) {
            connection[key] = data[key];
        });

        function browserById (b) {
            return b.id === data.id;
        }

        var browser,
            browsers = knownBrowsers.filter(browserById);

        if(browsers.length) {
            browser = browsers[0];
        } else {
            console.log('---------- NEW BROWSER');
            browser = new Browser();
            browser.verbose = true;
            browser.id = data.id;
            browser.on('close', function() {
                console.log('---------- CLOSE BROWSER');
                knownBrowsers.splice(knownBrowsers.indexOf(browser), 1);
            });
            knownBrowsers.push(browser);
            findListener(browser);
        }
        browser.addWindow(connection);
    });
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