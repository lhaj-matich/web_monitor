// Initialze push notification application
let Pushover = require("pushover-js").Pushover;
const puppeteer = require("puppeteer");
const fs = require("fs");
// Config file which contains all the key values
const config = require("./config");
// Constructor responsible for sending notifications
const pushover = new Pushover(config.user, config.token);

//? Utility function
const delay = (time) => {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
};

//? Logout function
exports.logOut = async () => {
    config.status = false;
    fs.appendFileSync(config.logFile, `[-] ${new Date().toLocaleString()} Application stopped` + "\n");
};

//? Script start function
exports.init = async () => {
    fs.writeFileSync(config.logFile, `[+] ${new Date().toLocaleString()} Application started` + "\n");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 760 });
    //? Login function
    const logIn = async () => {
        try {
            await page.goto(config.homeURL, { waitUntil: "networkidle0" });
            await Promise.all([page.click(config.buttons.loginAccessButton), page.waitForNavigation({ waitUntil: "networkidle0" })]);
            await page.type("#username", config.CREDS.username);
            await page.type("#password", config.CREDS.password);
            await Promise.all([page.click(config.buttons.loginButton), page.waitForNavigation({ waitUntil: "networkidle0" })]);
            fs.appendFileSync(config.logFile, `[+] ${new Date().toLocaleString()} Logged in successfully.` + "\n");
        } catch (e) {
            fs.appendFileSync(config.logFile, `[-] ${new Date().toLocaleString()} LoginError: ${e.message}` + "\n");
            await pushover.setSound("long_default").send("Visa Alert", `[-] LoginError: ${e.message}`);
            await delay(10000);
            await logIn();
        }
    };
    //? Check function
    const checkStatus = async () => {
        await logIn();
        await page.goto(config.checkURL, { waitUntil: "networkidle0" });
        await page.waitForSelector(config.buttons.popupTag, {
            visible: true,
            timeout: 20000
        }).catch((e) => {
            fs.appendFileSync(
                config.logFile,
                `[+] ${new Date().toLocaleString()} ${e.message}` + "\n"
            );
        })
        try {
            while (config.status) {
                const url = await page.url();
                if (url == config.checkURL) {
                    const data = await page.evaluate((config) => {
                        const el = document.querySelector(config.buttons.popupTag);
                        return el ? el.innerText : false;
                    }, config);
                    if (data == !config.checkPhrase || !data) {
                        await pushover.setSound("long_default").send(
                            "Visa Alert - Places",
                            "Rendez vous places are available. Please stop the program and check."
                        );
                        config.status = false;
                    }
                    await page.screenshot({
                        path: config.screenShot,
                        fullPage: true
                    });
                    await fs.appendFileSync(
                        config.logFile,
                        `[+] ${new Date().toLocaleString()} ${data ? data : "Selector not found: Please stop application and go check"}` + "\n"
                    );
                    if (config.status) {
                        await delay(config.status ? config.refreshRate + Math.round(Math.random() * config.refreshDelay) : 1000);
                        await page.reload({ waitUntil: "networkidle0" });
                    }
                } else {
                    await checkStatus();
                }
            }
        } catch (e) {
            fs.appendFileSync(config.logFile, `[-] ${new Date().toLocaleString()} CheckError: ${e.message}` + "\n");
            await pushover.setSound("long_default").send("Visa Alert: check error", `[-] ${new Date().toLocaleString()} CheckError: ${e.message}`);
            await delay(config.loginDelay);
            await checkStatus();
        }
    };
    await checkStatus();
    await browser.close();
};

// ? Task
//?DONE: Create a basic html page that will show the status of the api.
//?DONE: Request for status.
//?DONE: Create a route that will be responsible for stopping the script.
//?DONE: Create a route that will be responsible for starting the script.
//?DONE: Check if creds are still in place : login infomations.
//?DONE: Function that will change the status of the application.
//?DONE: Rewrite the check function.
//?DONE: Add a function for the login process.
