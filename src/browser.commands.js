
module.exports = {
    executeScript: function(params, callback) {
        this._sendCommand('executeScript', {
            script: params.script
        });
        this.on('executeScript', callback);
    }
};
