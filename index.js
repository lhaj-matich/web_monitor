// Initialze push notification application
let Pushover = require("pushover-js").Pushover;
const puppeteer = require("puppeteer");
const config = require("./config");
const fs = require("fs");

const pushover = new Pushover(config.user, config.token); // Constructor responsible for sending notifications

// Utility Function
const delay = (time) => {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
};

const init = async () => {
    fs.writeFileSync(
        "logfile.txt",
        "[+] Application Started: " + new Date().toUTCString() + "\n"
    );
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 760 });

    const checkStatus = async () => {
        try {
            var i = 0;
            await page.goto(config.checkURL, { waitUntil: "networkidle0" });
            // await page.waitForSelector("something", {
            //     timeout: 5000
            // });
            const url = await page.url();
            if (url == config.checkURL) {
                await page.screenshot({
                    path: `./screenshotB${Math.round(Math.random() * 10)}.png`,
                    fullPage: true
                });
                while (i < 2) {
                    // This tag will wait 5 second if less it will go the evaluation
                    await page.waitForSelector(config.buttons.popupTag, {
                        visible: true,
                        timeout: 5000
                    });
                    const data = await page.evaluate((config) => {
                        const el = document.querySelector(config.buttons.popupTag);
                        return el ? el.innerText : false;
                    }, config);
                    console.log(data);
                    // if (data == !config.checkPhrase || !data) {
                    //     // await pushover
                    //     //     .send(
                    //     //         "Visa Alert",
                    //     //         "Rendez vous places are available or something is wrong with the API"
                    //     //     )
                    //     //     .then(console.log)
                    //     //     .catch(console.error);
                    //     console.log(data);
                    //     console.log("The rendez vous might still be available.");
                    //     config.status = false;
                    // }
                    await page.screenshot({
                        path: `./screenshotCheck${Math.round(
                            Math.random() * 10
                        )}.png`,
                        fullPage: true
                    });
                    console.log("Waiting...");
                    await delay(
                        5000 + Math.round(Math.round(Math.random() * 10))
                    ); //! This function should be rewritten in order to give random refresh values.
                    console.log("Reloading page.");
                    await page.reload({ waitUntil: "networkidle0" });
                    console.log("[+] Checking: " + new Date().toUTCString());
                    i++;
                }
            } else {
                await logIn();
                await checkPool();
            }
        } catch (e) {
            console.log(e);
            await browser.close();
            await delay(5000);
            await checkStatus();
        }
    };

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
            console.log("Logged on");
            await page.screenshot({
                path: `./screenshotLogin${Math.round(Math.random() * 10)}.png`,
                fullPage: true
            });
            fs.appendFileSync(
                "logfile.txt",
                "[+] logged in: " + new Date().toUTCString() + "\n"
            );
            // console.log("[+] Page swtich: " + new Date().toUTCString());
        } catch (e) {
            console.log(e);
            console.log("Debug: Retrying login !!!");
            await delay(5000);
            await logIn();
        }
    };
    await logIn();
    await checkStatus();
    // await checkPool();
    // This method should only be called when done processing the check up.
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
