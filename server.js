
var server = require('./jsonwire');
var browser = new (require('./browser_connection').Browser)(true);
var jsonwire = server.jsonwire;


browser.browser_connection.installHandlers(jsonwire, {prefix: '/browser_connection'});

server.setConnections(browser.connections);

jsonwire.listen(8080, function () {
    console.log('%s listening at %s', jsonwire.name, jsonwire.url);
});
