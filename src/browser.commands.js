
function selectorOnlyCommand (command) {
    return function(params, callback) {
        this._sendCommand(command, {
            selector: params.selector
        });
        this.once(command, callback);
    };
}

module.exports = {
    findElement: selectorOnlyCommand('findElement'),
    isElementDisplayed: selectorOnlyCommand('isElementDisplayed'),
    getValue: selectorOnlyCommand('getValue'),
    getName: selectorOnlyCommand('getName'),
    getSelected: selectorOnlyCommand('getSelected'),
    clearInput: selectorOnlyCommand('clearInput'),

    executeScript: function(params, callback) {
        this._sendCommand('executeScript', {
            script: params.script
        });
        this.once('executeScript', callback);
    },


    sendKeys: function(params, callback) {
        this._sendCommand('sendKeysToElement', {
            selector: params.selector,
            value: params.value
        });
        this.once('sendKeysToElement', callback);
    },

    clickElement: function(params, callback) {
        this._sendCommand('clickElement', {
            selector: params.selector,
            button: params.button || 0,
            xoffset: params.xoffset,
            yoffset: params.yoffset
        });
        this.once('clickElement', callback);
    },

    getElementAttribute: function(params, callback) {
        this._sendCommand('getElementAttribute', {
            selector: params.selector,
            attribute: params.attribute
        });
        this.once('getElementAttribute', callback);
    },

    getTitle: function (callback) {
        this._sendCommand('getTitle');
        this.once('getTitle', callback);
    }

};
