var assert = require('assert'),
    events = require('events'),
    sinon = require('sinon'),
    Browser = require('../src/browser');

describe('Browser', function(){

    it('is an event emmiter', function(){
        var browser = new Browser(),
            stub = sinon.stub(),
            expect = { a: 'b' };

        browser.on('randomEvent', stub);
        browser.emit('randomEvent', expect);

        assert(browser instanceof events.EventEmitter, 'instanceof EventEmitter');
        assert(stub.calledWith(expect));
    });

    it('has contructor safeguard', function(){
        var browser = Browser();
        assert(browser instanceof events.EventEmitter, 'instanceof EventEmitter');
    });

});