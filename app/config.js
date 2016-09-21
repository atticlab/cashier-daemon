var config = {};

config.app = {
    port: 5051
};

config.auth = {
    user:       "username",
    password:   "password"
};

config.horizon_url       = 'http://blockchain.smartmoney.com.ua:80';
config.agent_public_key  = 'GASM5GPXLOJIZUH3O3N6QFQ26NEDQEFZEQGWHL2RBMHHZYYMRHZ2PRUY'; //seed SBUIH532RFHUEV7EPBR6K24OSNUXQ4UZTHO3D7B32BXTYWZOJBINLZ4U
config.agent_key_hash    = 'eyJpdiI6Ijl6UlNIYlUvOEJCYmNFWFpISjNqdVE9PSIsInYiOjEsIml0ZXIiOjEwMDAsImtzIjoxMjgsInRzIjo2NCwibW9kZSI6ImNjbSIsImFkYXRhIjoiIiwiY2lwaGVyIjoiYWVzIiwic2FsdCI6IkJXekZoUXhqeTJjPSIsImN0IjoiSkRLa2FYZ3RTVlJsSmd4VHBOL014UjJQMGU1bC9xajdpdlgyUGNUTG5Lbzg0WTNxbHZLU1k5aUhRVERmeGFvaUlWSElHQXFFSDA3S1htbSs5cUI2VHc9PSJ9';
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