var config = require('./config'),
    errors = require('./inc/errors'),
    myerrors = require('./inc/innererrors'),
    colors = require('colors'),
    auth = require('basic-auth'),
    bodyParser = require('body-parser'),
    express = require('express'),
    prompt = require('prompt'),
    tools = require('./inc/tools'),
    StellarSdk = require('stellar-sdk'),
    nodemailer = require('nodemailer');

var horizon;
var agent_key;

function innerError(error_type, error_code, error_text) {
    var e = new Error();
    e.innerType     = 'inner';
    e.type          = error_type;
    e.code          = error_code;
    e.msg           = error_text;

    throw e;
}

function getBalance(balances, asset) {

    var balance = 0;

    //function every() description: if return false - break; if return true - continue;

    balances.every(function(item){
        if (typeof item.asset_code != 'undefined' && typeof item.balance != 'undefined' &&  item.asset_code === asset) {
            balance = item.balance;
            return false;
        }
        return true;
    });

    return parseFloat(parseFloat(balance).toFixed(2));
}

var app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app.use(function(req, res, next) {

    var user = auth(req);

    if (!user || user['name'] !== config.auth.user || user['pass'] !== config.auth.password) {
        console.log(colors.red('Unauthorized request'));

        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_UNAUTHORIZED, 'Unauthorized request');
    } else {
        next();
    }
});

app.post('/issue', function(req, res) {

    var receiver_account = req.body.accountId;
    var amount = parseFloat(parseFloat(req.body.amount).toFixed(2));
    var asset  = req.body.asset;

    if (!StellarSdk.Keypair.isValidPublicKey(receiver_account)) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_BAD_ACC_PARAM, '[accountId] param is invalid');
    }

    if (typeof amount == 'undefined') {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_EMPTY_AMOUNT_PARAM, '[amount] param is empty');
    }

    if (amount <= 0) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_BAD_AMOUNT_PARAM, '[amount] param is invalid');
    }

    if (typeof asset == 'undefined' || !asset.length) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_EMPTY_ASSET_PARAM, '[asset] param is empty');
    }

    // Load agent account info
    horizon.accounts().accountId(agent_key.accountId()).call()
    // check agent account balance
    .then(source => {

        if (amount > getBalance(source.balances, asset)) {
            return innerError(errors.TYPE_STELLAR, errors.ERR_BALANCE_NOT_ENOUGH, asset + ': NOT ENOUGH BALANCE');
        }
    })
    // Load agent account
    .then(() => {
        return horizon.loadAccount(agent_key.accountId())
    })
    
    // Issue some money
    .then(source => {

        var tx = new StellarSdk.TransactionBuilder(source)
            .addOperation(StellarSdk.Operation.payment({
                destination: receiver_account,
                amount: parseFloat(amount).toFixed(2).toString(),
                asset: new StellarSdk.Asset(asset, config.master_key)
            }))
            .build();

        tx.sign(agent_key);

        return horizon.submitTransaction(tx)

    })

    .then(tx => {
        res.status(200).json({
            tx_hash: tx.hash
        });
    })

    .catch (err => {
        console.log(err);
        if(typeof err.innerType != 'undefined' && err.innerType == 'inner'){
            return errorResponse(res, err.type, err.code, err.msg);
        } else {

            var err_type = 'unknown';

            if (typeof err.message != 'undefined') {
                if (typeof err.message.type != 'undefined') {
                    err_type = err.message.type;
                }
            }

            outerError = myerrors.getProtocolError(err_type);
            return errorResponse(res, outerError.type, outerError.code, outerError.msg);
        }
    })
});

prompt.start();
prompt.get({
    description: 'Enter mnemonic phrase of distribution agent',
    name: 'key',
    hidden: true,
}, function(err, result) {
    try {
        var seed = StellarSdk.getSeedFromMnemonic(result.key);
    } catch (err) {
        return console.error(colors.red(err));
    }
    if (!seed) {
        return console.error(colors.red('CAN NOT GET SEED! Shutting down...'));
    }
    horizon = new StellarSdk.Server(config.horizon_url);
    agent_key = StellarSdk.Keypair.fromSeed(seed);
    return horizon.accounts()
        .accountId(agent_key.accountId())
        .call()
        .then(function (agent_data) {
            if (agent_data.type_i != StellarSdk.xdr.AccountType.accountDistributionAgent().value) {
                return console.error(colors.red('ERROR: BAD ACCOUNT TYPE'));
            }
            return horizon.loadAccount(agent_key.accountId())
        })
        .then(() => {
            app.listen(config.app.port);
            console.log(colors.green('Listening on port ' + config.app.port));
        }, err => {
            console.error(err);
            console.log(colors.red('Cannot load agent account from Stellar'));
        });
});

function errorResponse(res, type, code, msg) {
    
    return res.status(400).json({
        err_msg: typeof msg == 'undefined' ? '' : msg,
        err_type: type,
        err_code: code
    });
}