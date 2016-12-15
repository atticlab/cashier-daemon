var config = {};

config.app = {
    port: 5051
};

config.auth = {
    user:       "username",
    password:   "password"
};

config.horizon_url       = 'http://blockchain.smartmoney.com.ua:80';
config.agent_public_key  = 'GA6CFLRZDEKBLOVHC62XWKDK3VH3TH233HLGC2OCZCC6D3T65AHVSUNM';
config.agent_key_hash    = 'eyJpdiI6Im1tNGFmQ3poOFF6UzJzTWhuK0VxQ0EiLCJ2IjoxLCJpdGVyIjoxMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJMdkoxN2E2WkVDYyIsImN0IjoiZ3U1dlZzUXZuVGhFTW5sYWN0RzhNZ2grY3NoeG1IZzV5bmZETk4zN1RienZjRFlRVzE2SlBuVzBYbnp4WDdFejJBMzk3cnY4MGlYVit6bTFVR3BXSmcifQ==';
config.master_key        = 'GAWIB7ETYGSWULO4VB7D6S42YLPGIC7TY7Y2SSJKVOTMQXV5TILYWBUA';

//email notification
config.notification_emails = 'for0work0@gmail.com'; //use comma as separator

//TODO: use own smtp
config.smtp = {
    protocol:   "smtps",
    server:     "smtp.gmail.com",
    user:       "forpokerstars7@gmail.com",
    password:   "bujhm929394"
};


module.exports = config;