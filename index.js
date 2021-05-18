// Initialze push notification application
let Pushover = require( 'pushover-js').Pushover;
const puppeteer = require('puppeteer');
const config = require('./config');

const pushover = new Pushover(config.user, config.token) // Constructor responsible for sending notifications

// Utility Function
const delay = (time) => {
  return new Promise(function(resolve) { 
    setTimeout(resolve, time)
  });
}

const init = async () => {
   //? The section below is responsible for the login phase
    try {
      const browser = await puppeteer.launch(); //! This will need some other params when deploying to heruko
      const page = await browser.newPage();
      await page.setViewport({width: 1200, height: 760});
      await page.goto('https://candidature.1337.ma/users/sign_in',  { waitUntil: 'networkidle0' });
      await page.type('#user_email', config.CREDS.username);
      await page.type('#user_password', config.CREDS.password);
      await Promise.all([
        page.click('#new_user > div.form-inputs > div.form-actions > input'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);
      console.log('login is done.'); //? Output that indicates that the login was sucessfull
      await checkPool();
    } catch {
      console.log('Error Retrying');
      await delay(5000);
      await init();
      await checkPool();
    }



    const logIn = async () => {
      try {
        await page.goto('https://candidature.1337.ma/users/sign_in',  { waitUntil: 'networkidle0' });
        await page.type('#user_email', config.CREDS.username);
        await page.type('#user_password', config.CREDS.password);
        await Promise.all([
          page.click('#new_user > div.form-inputs > div.form-actions > input'),
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);
      }catch {
        await delay(5000);
        await logIn();
      }
    }

    // const logOut = async () => {
    //   try {
    //     await Promise.all([
    //       page.click('#subs-login > a'),
    //       page.waitForNavigation({ waitUntil: 'networkidle0' }),
    //     ]);
    //   }catch (e) {
    //     delay(5000);
    //     await logOut();
    //   }
    // }

    const checkPool = async () => {
      try {
        const url = await page.url();
        if (url == config.checkURL){
          while (config.status) {
            const data = await page.evaluate(() => {
              const el = document.querySelector('#subs-content > p');
              return el ? el.innerText : false
            })
            if (data == !config.checkPhrase || !data){
              await pushover.send('1337 Pool Alert', 'Pool places are available please login to your account').then(console.log).catch(console.error);
              config.status = false;
            }
            await delay(15000 + Math.random() * 10);
            await page.reload({waitUntil: 'networkidle0'});
            console.log('Checking Pool');
          }
        } else {
          await logIn();
          await checkPool();
        }
      }catch {
        await delay(5000);
        await checkPool();
      }
    }

    

    await browser.close();
    //TODO:   Main: Seperate the API into seprate functions
    //?DONE:   >Need a function that will be responsible for logout to test the api behaviour
    //?DONE:   >Need to orginaze the part responsible for the ckeck Process
    //?DONE:   >Add a function for the login process
    //TODO:   >Route for the check status
    //TODO:   >Route for process start in case of failure or false alterts
    //TODO:   >Add chabbot url as a alternative for pushover api
    // const i = 4;
    // while (i > 0) {
    //   const data = await page.evaluate(() => {
    //     const el = document.querySelector('#subs-content > p');
    //     return el ? el.innerText : false
    //   })
    //   const url = await page.url();
    //   console.log(url);
    //   if (data == !config.checkPhrase || !data){
    //     console.log(data);
    //     await pushover.send('1337 Pool Alert', 'Pool places are available please login to your account').then(console.log).catch(console.error);
    //     config.status = false;
    //   }else {
    //     console.log(data);
    //   }
    //   await delay(15000);
    //   await page.reload({waitUntil: 'networkidle0'});
    //   i--;
    // }
    // await logOut();
    // 
   
}

init();



// ? Task
// TODO: [-] Create UI
// TODO: [-] Request for status
// ?DONE: [-] Check if creds are still in place : login infomations

// Simple notification (without personalization)
// const Alert = () => {
//   pushover.send('1337 Pool Alert', 'Pool places are available please login to your account').then(console.log).catch(console.error)
// }

// new MutationObserver(function(mutations) {
//   Alert();
// }).observe(
//   document.querySelector('html'), {
//       subtree: true,
//       characterData: true,
//       childList: true
//   }
// );

        // await page.reload({waitUntil: 'networkidle0'});
        // const url = await page.url();
        // console.log(url);


        // await page.waitForNavigation({timeout: 5000});
        // const data = await page.evaluate(() => {
        //   const el = document.querySelector('#subs-content > p');
        //   return el ? el.innerText : false
        // })
        // if (data == !config.checkPhrase || !data){
        //   console.log(data);
        //   await pushover.send('1337 Pool Alert', 'Pool places are available please login to your account').then(console.log).catch(console.error);
        //   CS = false;
        // }
        // else {
        //   console.log('Nothing changed');
        // }