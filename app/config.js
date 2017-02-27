var config = {};

config.app = {
    port: 5051
};

config.auth = {
    user: "username",
    password: "password"
};

config.horizon_url = process.env.HORIZON_HOST;
config.master_key = process.env.MASTER_KEY;

module.exports = config;