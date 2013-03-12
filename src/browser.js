var util = require('util'),
    events = require('events');

function Browser() {
    if(false === (this instanceof Browser)) {
        return new Browser();
    }
    events.EventEmitter.call(this);
}
util.inherits(Browser, events.EventEmitter);

module.exports = Browser;
