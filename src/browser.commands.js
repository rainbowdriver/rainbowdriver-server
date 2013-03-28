
module.exports = {
    executeScript: function(params, callback) {
        this._sendCommand('executeScript', {
            script: params.script
        });
        this.once('executeScript', callback);
    },

    findElement: function(params, callback) {
        this._sendCommand('findElement', {
            selector: params.selector
        });
        this.once('findElement', callback);
    },

    isElementDisplayed: function(params, callback) {
        this._sendCommand('isElementDisplayed', {
            selector: params.selector
        });
        this.once('isElementDisplayed', callback);
    },

    sendKeys: function(params, callback) {
        this._sendCommand('sendKeysToElement', {
            selector: params.selector,
            value: params.value
        });
        this.once('sendKeysToElement', callback);
    },

    clickElement: function(params, callback) {
        this._sendCommand('click', {
            selector: params.selector,
            button: params.button || 0,
            xoffset: params.xoffset,
            yoffset: params.yoffset
        });
        this.once('clickElement', callback);
    }
};
