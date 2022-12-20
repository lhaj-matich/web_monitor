let Pushover = require("pushover-js").Pushover;
const config = require("./config");

const pushover = new Pushover(config.user, config.token);

const sendNotification = async () => {
    await pushover
        .setSound("long_default")
        .send("Visa Alert - Places", "Testing the notification sound 2");
};

sendNotification();
