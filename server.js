
var jsonwire = require('./jsonwire');
var browser = new (require('./browser_connection').Browser)(true);
var server = jsonwire.server;


browser.browser_connection.installHandlers(server, {prefix: '/browser_connection'});

jsonwire.setConnections(browser.connections);
jsonwire.verbosity();

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});
