const fs = require('fs');
const express = require('express');
const cors = require('cors');
const app = express();

const port = 3000;
const Bugs = JSON.parse(fs.readFileSync('./data.json',{encoding: 'utf8'}));

const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}

app.use(express.json());

app.use(cors(corsOptions));

app.get('/api/v1/start', (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            file: ""
        }
    })
})

app.get('/api/v1/stop', (req, res) => {
    res.status(200).json({
        Bugs
    })
})

app.listen(port, () => {
    console.log('Listenning on port ' + port);
})