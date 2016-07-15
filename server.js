var config = require('./config'),
    errors = require('./inc/errors'),
    myerrors = require('./inc/innererrors'),
    colors = require('colors'),
    auth = require('basic-auth'),
    bodyParser = require('body-parser'),
    express = require('express'),
    prompt = require('prompt'),
    tools = require('./inc/tools'),
    StellarSdk = require('stellar-sdk');

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

    var receiver_account = req.body.account;
    var amount = parseFloat(parseFloat(req.body.amount).toFixed(2));
    var asset  = req.body.asset;

    if (!StellarSdk.Keypair.isValidPublicKey(receiver_account)) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_BAD_PARAM, '[accountId] param is invalid');
    }

    // Check positive amount
    if (amount <= 0) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_BAD_PARAM, '[amount] param is invalid');
    }

    if (!asset.length) {
        return errorResponse(res, errors.TYPE_NATIVE, errors.ERR_BAD_PARAM, '[asset] param is empty');
    }

    // Load receiver account
    horizon.loadAccount(receiver_account)

    // Get receiver account info
    .then(account => {
        return horizon.accounts().accountId(account._accountId).call()
    })
    // verify receiver account
    .then(accountDetails => {

        if (
            accountDetails.type_i != StellarSdk.xdr.AccountType.accountAnonymousUser().value &&
            accountDetails.type_i != StellarSdk.xdr.AccountType.accountRegisteredUser().value
        ) {
            return innerError(errors.TYPE_STELLAR, errors.ERR_BAD_ACCOUNT_TYPE, 'BAD ACCOUNT TYPE');
        }
    })
    
    // TODO: verify incoming restriction for receiver account
    // TODO: verify max operation limit for receiver account
    // TODO: verify max day operation limit for receiver account
    // TODO: verify max montly operation limit for receiver account

    // Load agent account info
    .then(() => {
        return horizon.accounts().accountId(config.agent_public_key).call()
    })
    // analyse account info
    .then(source => {

        // TODO: verify outcoming restriction for agent account
        // TODO: verify max operation limit for agent account
        // TODO: verify max day operation limit for agent account
        // TODO: verify max montly operation limit for agent account

        if (amount > getBalance(source.balances, asset)) {

            return innerError(errors.TYPE_STELLAR, errors.ERR_BALANCE_NOT_ENOUGH, asset + ': NOT ENOUGH BALANCE');
        }
    })
    // Load agent account
    .then(() => {
        return horizon.loadAccount(config.agent_public_key)
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
        if(typeof err.innerType != 'undefined' && err.innerType == 'inner'){
            console.log(err);
            return errorResponse(res, err.type, err.code, err.msg);
        } else {
            console.log(err);
            outerError = myerrors.getProtocolError(typeof err.message.type != 'undefined' ? err.message.type : 'unknown');
            return errorResponse(res, outerError.type, outerError.code, outerError.msg);
        }
    })
});

prompt.start();
prompt.get({
    description: 'Enter emission key password',
    name: 'key',
    hidden: true,
}, function(err, result) {
    var key = tools.decryptData(config.agent_key_hash, result.key);
    if (!key) {
        console.error(colors.red('WRONG PASSWORD KEY! Shutting down...'));
    }

    horizon = new StellarSdk.Server(config.horizon_url);
    agent_key = StellarSdk.Keypair.fromSeed(key);

    horizon.loadAccount(config.agent_public_key)
        .then(source => {
            app.listen(config.app.port);
            console.log(colors.green('Listening on port ' + config.app.port));
        }, err => {
            console.log(colors.red('Cannot load agent account from Stellar'));
        })
});

function errorResponse(res, type, code, msg) {
    
    return res.status(400).json({
        err_msg: typeof msg == 'undefined' ? '' : msg,
        err_type: type,
        err_code: code
    });
}