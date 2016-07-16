var errorscode = require('./errors');
var errors = module.exports

Error.subclass = function(error_type, error_code, error_text) {
    var newError = function() {
        this.type    = error_type;
        this.code    = error_code;
        this.msg = (error_text || "");
    };

    newError.subclass = this.subclass;

    return newError;
};

;

errors.Restricted   =         Error.subclass(errorscode.TYPE_STELLAR, errorscode.ERR_RESTRICTED, 'Some restrictions/limits for agent exceeded');
errors.UnknownError =         Error.subclass(errorscode.TYPE_STELLAR, errorscode.ERR_UNKNOWN, 'UnknownError');

errors.getProtocolError = function(code) {
    switch(code) {
        case 'https://stellar.org/horizon-errors/transaction_restricted':         return new errors.Restricted();
        default:                                                                  return new errors.UnknownError();
    }
};