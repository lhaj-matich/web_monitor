// Initialze push notification application
let Pushover = require("pushover-js").Pushover;
const puppeteer = require("puppeteer");
const config = require("./config");

const pushover = new Pushover(config.user, config.token); // Constructor responsible for sending notifications

// Utility Function
const delay = (time) => {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
};

const checkPool = async () => {
    try {
        const url = await page.url();
        if (url == config.checkURL) {
            while (config.status) {
                const data = await page.evaluate(() => {
                    const el = document.querySelector("#subs-content > p");
                    return el ? el.innerText : false;
                });
                if (data == !config.checkPhrase || !data) {
                    await pushover
                        .send(
                            "Visa Alert",
                            "Rendez vous places are available or something is wrong with the API"
                        )
                        .then(console.log)
                        .catch(console.error);
                    config.status = false;
                }
                await delay(15000 + Math.random() * 10);
                await page.reload({ waitUntil: "networkidle0" });
                console.log("[+] Checking: " + new Date().toUTCString());
            }
        } else {
            await logIn();
            await checkPool();
        }
    } catch {
        await delay(5000);
        await checkPool();
    }
};

const init = async () => {
    console.log("[+] Application Started: " + new Date().toUTCString());
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 760 });
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
            console.log("[+] logged in: " + new Date().toUTCString());
            await page.goto(config.checkURL, { waitUntil: "networkidle0" });
            console.log("[+] Page swtich: " + new Date().toUTCString());
            await page.screenshot({
                path: "./screenshot.png",
                fullPage: true
            });
        } catch (e) {
            console.log("Debug: Retrying login !!!");
            await delay(5000);
            await logIn();
        }
    };
    await logIn();

    // await checkPool();
    await browser.close();
};

init();

// ? Task
// TODO: [-] Create UI
// TODO: [-] Request for status
// ?DONE: [-] Check if creds are still in place : login infomations

//TODO:   Main: Seperate the API into seprate functions
//?DONE:   >Need a function that will be responsible for logout to test the api behaviour
//?DONE:   >Need to orginaze the part responsible for the ckeck Process
//?DONE:   >Add a function for the login process
//TODO:   >Route for the check status
//TODO:   >Route for process start in case of failure or false alterts
//TODO:   >Add chabbot url as a alternative for pushover api
