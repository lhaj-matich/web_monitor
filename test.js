let Pushover = require("pushover-js").Pushover;
const config = require("./config");

const pushover = new Pushover(config.user, config.token);

const sendNotification = async () => {
    await pushover
        .setSound("classical")
        .send("Visa Alert - Places", "This is a test notification to see if everything is working properly.");
};

sendNotification();
