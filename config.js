module.exports = {
    user: "u1qmabz6pkbfnuecchzt9vusfbh7i2",
    token: "abjx7dh96vwpugu4jz67hjrcx8vg7h",
    CREDS: {
        username: "CMM.sud@hotmail.com",
        password: "CMMsud@2021"
    },
    status: false,
    homeURL: "https://visas-de.tlscontact.com/visa/ma/maRBA2de/home",
    checkURL: "https://visas-de.tlscontact.com/appointment/ma/maRBA2de/1575078",
    checkPhrase: "Désolé, il n'y a pas de rendez-vous disponible pour le moment, veuillez vérifier plus tard.",
    buttons: {
        loginAccessButton:
            "#tls-navbar > div > div.tls-navbar--links.-closed.height52 > div.tls-log > div.tls-navbar--slot.tls-navbar-right > a",
        loginButton: "#kc-login",
        popupTag:
            "#app > div.tls-appointment > div.tls-popup-display > div.tls-popup-display--container > div > div > div.tls-popup--body > div:nth-child(2) > div:nth-child(1) > div"
    },
    refreshRate: 20000, // 20 seconds
    refreshDelay: 20000, // 20 seconds
    loginDelay: 10000, // 10 seconds
    logFile: "./public/assets/logfile.txt",
    screenShot: "./public/assets/screenshot.png"
};