var sjcl = require('sjcl');

var exports = {};

exports.decryptData = function(encryptedData, key) {

    var data = new Buffer(encryptedData, 'base64').toString('binary');
    try {
        var seed = sjcl.decrypt(key, data);
    } catch (e) {
        return false;
    }

    return seed;
}

module.exports = exports;
