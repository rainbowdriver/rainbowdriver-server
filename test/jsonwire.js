var os = require('os'),
    assert = require('assert'),
    events = require('events'),
    util = require('util'),
    sinon = require('sinon'),
    restify = require('restify'),
    api = require('../jsonwire'),
    client;

api.jsonwire.listen(8745);
client = restify.createJsonClient({
  url: 'http://localhost:8745/'
});

describe('JSON Wire API', function(){

    describe('/wd/hub/status', function(){

        it('respond with os properties', function(){
            var expect = {
                    "build" : {
                        "version" : "0.1",
                        "revision" : "unknown",
                        "time" : "unknown"
                    },
                    "os" : {
                        "name" : os.platform(),
                        "version" : os.release(),
                        "arch" : os.arch()
                    }
                };

            client.get('/wd/hub/status', function(err, req, res, obj) {
                assert.deepEqual(obj, expected);
                done();
            });
        });
    });
});

function StubConnection(attrs) {
    var attr;
    events.EventEmitter.call(this);
    for (attr in attrs) {
        this[attr] = attrs[attr];
    }
    return this;
}

util.inherits(StubConnection, events.EventEmitter);

StubConnection.prototype.close = function () {
    this.emit('close');
};

