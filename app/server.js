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

    var setted_receiver_limits = {
        daily: -1,
        monthly: -1
    };
    var setted_agent_limits = {
        daily: -1,
        monthly: -1
    };

    // get receiver account info
    horizon.accounts().accountId(receiver_account).call()
    // verify receiver account
    .then(accountDetails => {

        if (
            accountDetails.type_i != StellarSdk.xdr.AccountType.accountAnonymousUser().value &&
            accountDetails.type_i != StellarSdk.xdr.AccountType.accountRegisteredUser().value
        ) {
            return innerError(errors.TYPE_STELLAR, errors.ERR_BAD_ACCOUNT_TYPE, 'BAD RECEIVER ACCOUNT TYPE');
        }
    })
    // get receiver traits
    .then(function() {
        return horizon.accounts().traits(receiver_account).call();
    })
    // check receiver incoming restrictions
    .then(function (traits) {
        if (traits.block_incoming_payments == true) {
            return innerError(errors.TYPE_STELLAR, errors.OP_BLOCKED, 'RECEIVER INCOMING OPERATION BLOCK');
        }
    })
    // get receiver limits
    .then(function() {
        return horizon.accounts().limits(receiver_account).call();
    })
    // check receiver incoming operation limit
    .then(function(limits_data) {

        if (typeof limits_data.limits != 'undefined' && limits_data.limits.length > 0) {

            var limits = limits_data.limits;

            Object.keys(limits).forEach(function(key) {
                if (limits[key].asset_code == asset) {

                    //-1 is no limit
                    if(limits[key].max_operation_in > -1) {
                        if (limits[key].max_operation_in < amount) {
                            return innerError(errors.TYPE_STELLAR, errors.ERR_MAX_OPERATION_LIMIT, 'RECEIVER MAX OPERATION LIMIT IS EXCEEDED');
                        }
                    }

                    setted_receiver_limits.daily   = limits[key].daily_max_in*1;
                    setted_receiver_limits.monthly = limits[key].monthly_max_in*1;
                }
            });

        }
    })
    //get statistic
    .then(function() {
        return horizon
            .accounts()
            .statisticsForAccount(receiver_account)
            .call();
    })
    // check statistic
    .then(function(statistic_data) {

        var used_receiver_limits = {
            daily: 0,
            monthly: 0
        };

        if (typeof statistic_data.statistics != 'undefined' && statistic_data.statistics.length > 0) {

            var stats = statistic_data.statistics;

            Object.keys(stats).forEach(function (key) {
                if (stats[key].asset_code == asset) {
                    used_receiver_limits.daily   += stats[key].income.daily*1;
                    used_receiver_limits.monthly += stats[key].income.monthly*1;
                }
            });

        }

        //if daily limit setted for agent
        if (setted_receiver_limits.daily > -1) {
            if (setted_receiver_limits.daily < used_receiver_limits.daily + amount) {
                //daily limit is EXCEEDED
                return innerError(errors.TYPE_STELLAR, errors.ERR_DAILY_OPERATION_LIMIT, 'RECEIVER DAILY OPERATION LIMIT IS EXCEEDED');
            }
        }

        //if monthly limit setted for agent
        if (setted_receiver_limits.monthly > -1) {
            if (setted_receiver_limits.monthly < used_receiver_limits.monthly + amount) {
                //monthly limit is EXCEEDED
                return innerError(errors.TYPE_STELLAR, errors.ERR_MONTHLY_OPERATION_LIMIT, 'RECEIVER MONTHLY OPERATION LIMIT IS EXCEEDED');
            }
        }

    })
    // get agent traits
    .then(function() {
        return horizon.accounts().traits(config.agent_public_key).call();
    })
    //check agent outcoming restrictions
    .then(function (traits) {
        if (traits.block_outcoming_payments == true) {
            return innerError(errors.TYPE_STELLAR, errors.OP_BLOCKED, 'AGENT OUTCOMING OPERATION BLOCK');
        }
    })
    // get agent limits
    .then(function() {
        return horizon.accounts().limits(config.agent_public_key).call();
    })
    // check agent outcoming operation limit
    .then(function(limits_data) {

        if (typeof limits_data.limits != 'undefined' && limits_data.limits.length > 0) {

            var limits = limits_data.limits;

            Object.keys(limits).forEach(function(key) {
                if (limits[key].asset_code == asset) {

                    //-1 is no limit
                    if(limits[key].max_operation_out > -1) {
                        if (limits[key].max_operation_out < parseFloat(parseFloat(amount).toFixed(2))) {
                            return innerError(errors.TYPE_STELLAR, errors.ERR_MAX_OPERATION_LIMIT, 'AGENT MAX OPERATION LIMIT IS EXCEEDED');
                        }
                    }

                    setted_agent_limits.daily   = limits[key].daily_max_out*1;
                    setted_agent_limits.monthly = limits[key].monthly_max_out*1;
                }
            });

        }
    })
    //get agent statistic
    .then(function() {
        return horizon.accounts().statisticsForAccount(config.agent_public_key).call();
    })
    // check agent statistic
    .then(function(statistic_data) {

        var used_agent_limits = {
            daily: 0,
            monthly: 0
        };

        if (typeof statistic_data.statistics != 'undefined' && statistic_data.statistics.length > 0) {

            var stats = statistic_data.statistics;

            Object.keys(stats).forEach(function (key) {
                if (stats[key].asset_code == asset) {
                    used_agent_limits.daily   += stats[key].outcome.daily*1;
                    used_agent_limits.monthly += stats[key].outcome.monthly*1;
                }
            });

        }

        //if daily limit setted for agent
        if (setted_agent_limits.daily > -1) {
            if (setted_agent_limits.daily < used_agent_limits.daily + parseFloat(parseFloat(amount).toFixed(2))) {
                //daily limit is EXCEEDED
                return innerError(errors.TYPE_STELLAR, errors.ERR_DAILY_OPERATION_LIMIT, 'AGENT DAILY OPERATION LIMIT IS EXCEEDED');
            }
        }

        //if monthly limit setted for agent
        if (setted_agent_limits.monthly > -1) {
            if (setted_agent_limits.monthly < used_agent_limits.monthly + parseFloat(parseFloat(amount).toFixed(2))) {
                //monthly limit is EXCEEDED
                return innerError(errors.TYPE_STELLAR, errors.ERR_MONTHLY_OPERATION_LIMIT, 'AGENT MONTHLY OPERATION LIMIT IS EXCEEDED');
            }
        }
        // Load agent account info
        return horizon.accounts().accountId(config.agent_public_key).call();

    })
    // check agent account balance
    .then(source => {

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

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(config.smtp.protocol + '://' + config.smtp.user + ':' + config.smtp.password + '@' + config.smtp.server);

// setup e-mail data with unicode symbols
var mailOptions = {
    from: '"Cashier" <cashier@smartmoney.com.ua>', // sender address
    to: config.notification_emails,
    subject: 'Attention, cashier.smartmoney.com.ua run', // Subject line
    text: 'Need to enter password', // plaintext body
    html: '<b>Need to enter password</b>' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    //console.log('Message sent: ' + info.response);
});

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

    horizon.loadAccount(agent_key.accountId())
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