
var jsonwire = require('./jsonwire');
var server = jsonwire.server;
var browser_manager = require('./src/connection_manager');

jsonwire.browser_manager = browser_manager;
jsonwire.verbosity();

browser_manager.socket_server.installHandlers(server, {prefix: '/browser_connection'});

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});
