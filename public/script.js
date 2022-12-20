const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const statusHolder = document.getElementById("status");
const onlineColor = "#21F900";
const offlineColor = "#ff0000";


playButton.addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("http://192.168.1.7:3000/api/v1/start", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  await displayStatus();
});

pauseButton.addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("http://192.168.1.7:3000/api/v1/stop", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  await displayStatus();
});

const displayStatus = async () => {
  // Fetch the status from the API
  fetch("http://192.168.1.7:3000/api/v1/status", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Display the response in the status class
      statusHolder.style.backgroundColor = data.status ? onlineColor : offlineColor;
    });
};

displayStatus();
