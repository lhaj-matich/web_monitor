// Initialze push notification application
let Pushover = require("pushover-js").Pushover;
const puppeteer = require("puppeteer");
const fs = require("fs");
// Config file which contains all the key values
const config = require("./config");
// Constructor responsible for sending notifications
const pushover = new Pushover(config.user, config.token);

// Utility function
const delay = (time) => {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
};

// Script start function
const init = async () => {
    fs.appendFileSync(config.logFile, `[+] ${new Date().toUTCString()} Application started` + "\n");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 760 });
    //? Logout function
    const logOut = async () => {
        config.status = false;
        await delay(5000);
        await browser.close();
        fs.appendFileSync(config.logFile, `[-] ${new Date().toUTCString()} Application stopped` + "\n");
    };
    //? Login function
    const logIn = async () => {
        try {
            await page.goto(config.homeURL, { waitUntil: "networkidle0" });
            await Promise.all([
                page.click(config.buttons.loginAccessButton),
                page.waitForNavigation({ waitUntil: "networkidle0" })
            ]);
            await page.type("#username", config.CREDS.username);
            await page.type("#password", config.CREDS.password);
            await Promise.all([
                page.click(config.buttons.loginButton),
                page.waitForNavigation({ waitUntil: "networkidle0" })
            ]);
            fs.appendFileSync(config.logFile, `[+] ${new Date().toUTCString()} Logged in succesfully.` + "\n");
        } catch (e) {
            fs.appendFileSync(config.logFile, `[-] ${new Date().toUTCString()} LoginError: ${e.Message}` + +"\n");
            await pushover.send("Visa Alert", `[-] LoginError: ${e.Message}`);
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
            timeout: 10000
        });
        try {
            while (config.status) {
                const url = await page.url();
                if (url == config.checkURL) {
                    const data = await page.evaluate((config) => {
                        const el = document.querySelector(config.buttons.popupTag);
                        return el ? el.innerText : false;
                    }, config);
                    if (data == !config.checkPhrase || !data) {
                        // await pushover.send(
                        //     "Visa Alert",
                        //     "Rendez vous places are available or something is wrong with the API"
                        // );
                        console.log("Sending the alert!!!");
                        await logOut();
                    }
                    console.log("No places are available");
                    await page.screenshot({
                        path: `./screenshot.png`,
                        fullPage: true
                    });
                    await delay(5000 + Math.round(Math.round(Math.random() * 10))); //! This function should be rewritten in order to give random refresh values.
                    await page.reload({ waitUntil: "networkidle0" });
                    fs.appendFileSync(
                        config.logFile,
                        `[+] ${new Date().toUTCString()} ${data ? data : "No text in selector"}` + "\n"
                    );
                } else {
                    await checkStatus();
                }
            }
        } catch (e) {
            fs.appendFileSync(config.logFile, `[-] ${new Date().toUTCString()} CheckError: ${e.Message}` + +"\n");
            await logOut();
            await checkStatus();
        }
    };
    await checkStatus();
    await browser.close();
};

init();

// ? Task
// TODO: [-] Create a basic html page that will show the status of the api
// TODO: [-] Create UI
// TODO: [-] Request for status
// TODO: [-] Create a route that will be responsible for stopping the script
// TODO: [-] Create a route that will be responsible for starting the script
// ?DONE: [-] Check if creds are still in place : login infomations
//?DONE:   >Need a function that will be responsible for logout to test the api behaviour
//?DONE:   >Need to orginaze the part responsible for the ckeck Process
//?DONE:   >Add a function for the login process
//TODO:   >Route for process start in case of failure or false alterts
//TODO:   >Add chabbot url as a alternative for pushover api
