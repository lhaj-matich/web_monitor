const express = require("express");
const cors = require("cors");
const app = express();
const config = require("./config");

const { init } = require("./index");

const port = 3000;

const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200
};

app.use(express.json());

app.use(cors(corsOptions));

app.get("/api/v1/start", (req, res) => {
    if (!config.status) {
        config.status = true;
        init();
        res.status(200).json({
            status: "success",
            message: "application started succesfully."
        });
    } else {
        res.status(200).json({
            status: "failure",
            message: "application already up."
        });
    }
});

app.get("/api/v1/stop", (req, res) => {
    if (config.status) {
        config.status = false;
        res.status(200).json({
            status: "success",
            message: "application stopped succesfully."
        });
    } else {
        res.status(200).json({
            status: "failure",
            message: "application already idle."
        });
    }
});

app.listen(port, () => {
    console.log("Listenning on port " + port);
});
