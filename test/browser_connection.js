var assert = require('assert'),
    b = require('../browser_connection');

describe('Browser', function(){
    it('should remove inactive connections', function(){
        var browser = new b.Browser(),
            conn = {
                foo: 'bar'
            };
        browser.connections = ['a', conn, 'b'];
        browser.connectionClosed(conn);
        assert(browser.connections.indexOf(conn) == -1);
        assert(browser.connections[0] == 'a');
        assert(browser.connections[1] == 'b');
    });
});
