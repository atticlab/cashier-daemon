var config = {};

config.app = {
    port: 5051
};

config.auth = {
    user:       "username",
    password:   "password"
};

config.horizon_url       = 'http://dev.stellar.attic.pw:8010';
config.agent_public_key  = 'GDYYQYKJ3XRYNPPY53RK3LBVYXUGMNJIFWADG3UFK7DZLJEZHJ7KQ2D2'; //SBUTLQ4S2C3RMZ6GFBE7VUBH7X6RQN2WW3GOK4PUKWNKHMRHA4CDJDZH
config.agent_key_hash    = 'eyJpdiI6Ii9HbWFTWDFXN1A4UTdTbGFxblJyV1E9PSIsInYiOjEsIml0ZXIiOjEwMDAsImtzIjoxMjgsInRzIjo2NCwibW9kZSI6ImNjbSIsImFkYXRhIjoiIiwiY2lwaGVyIjoiYWVzIiwic2FsdCI6IncyVzh6SFJ1RTRzPSIsImN0IjoiNG5nMitOS3V0WUNMaTF2ZUpOc3VJaXovWHU3ZiszMVlFeGdTU3dnc0d5TzV2Q1owTXRhQmUxOUNPLzUxK2tqQkRxTHZseE12aytnWlZnY2JWUWRiVlE9PSJ9';
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