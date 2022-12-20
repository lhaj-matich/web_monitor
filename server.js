const express = require("express");
const cors = require("cors");
const app = express();
const config = require("./config");

const { init, logOut } = require("./index");

const port = 3000;

const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200
};

app.use(express.static('./public'));

app.use(express.json());

app.use(cors(corsOptions));

app.get("/api/v1/start", (req, res) => {
    if (!config.status) {
        console.log(`[+] ${new Date().toLocaleString()} The script started succesfully.`);
        init();
        config.status = true;
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
        logOut();
        console.log(`[+] ${new Date().toLocaleString()} The script stopped succesfully.`);
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

app.get("/api/v1/status", (req, res) => {
    res.status(200).json({
        status: config.status,
    });
});

app.listen(port, () => {
    console.log(`[+] ${new Date().toLocaleString()} Application started on port: ${port}`);
});
