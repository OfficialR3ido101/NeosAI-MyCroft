const WebSocket = require('ws');
const wss = require('ws').Server;
const { exec, execSync } = require('node:child_process');
const express = require('express')
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('node:path');
const { resolve } = require('node:path');
require('dotenv').config()



const ws = new WebSocket(`ws://${process.env.MYCROFT_WS_IP}:${process.env.MYCROFT_WS_PORT}/core`);
const neosWS = new wss({ host: '0.0.0.0', port: 6969 });

neosWS.on('connection', (conn => {
    conn.on('message', (msg) => {
        generateTTS(conn, msg.toString())
        conn.close()
    })
}))

ws.setMaxListeners(64)

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const url = process.env.URL;
const port = process.env.PORT;
const playdir = process.env.PLAY_DIRECTORY;
const playurl = `${url}:${port}/${playdir}/`;

ws.on('open', () => {
    console.log("WebSocket connection opened");
});

let currentRequest = null;
let messageSent = false;

function generateTTS(res, text) {
    if (currentRequest !== null) {
        res.send("Ignoring new request, currently processing another one.");
        return;
    }
    currentRequest = res;
    
    if (ws.readyState === WebSocket.OPEN) {
        // Send a message to Mycroft when the connection is opened
        const mycroftQuestion = text;
        const mycroftType = 'recognizer_loop:utterance';
        const mycroftData = { utterances: [mycroftQuestion] };
        const message = { type: mycroftType, data: mycroftData };
        ws.send(JSON.stringify(message));
    }

    ws.on('message', (data) => {
        // ...
        if (!messageSent) {

            try {
                
                if (!messageSent) {
                    execSync(`mimic3 "${chat.data.utterance}" | sox -t wav - -t ogg ${outputFile}`);
                    res.send(playurl + `${uuid}.ogg`)
                }
    
            } catch (e) {
                console.error(e);
            }
            currentRequest = null;
            messageSent = true;
        }
    });
}

function generateTTS(res, text) {
    console.log(text)
    let uuid = uuidv4();
    let messageSent = false
    if (ws.readyState === WebSocket.OPEN) {
        // Send a message to Mycroft when the connection is opened
        const mycroftQuestion = text;
        const mycroftType = 'recognizer_loop:utterance';
        const mycroftData = { utterances: [mycroftQuestion] };
        const message = { type: mycroftType, data: mycroftData };
        ws.send(JSON.stringify(message));
    }
    ws.on('message', (data) => {
        if (!data.includes('expect_response')) return;
        const chat = JSON.parse(data)
        const outputFile = path.join(__dirname, 'storage', `${uuid}.ogg`);

        try {
            execSync(`mimic3 "${chat.data.utterance}" | sox -t wav - -t ogg ${outputFile}`);
            if (!messageSent) {
                res.send(playurl + `${uuid}.ogg`)
                res.close()
                messageSent = true
            }

        } catch (e) {
            console.error(e);
        }
        messageSent = false;
    });
}


app.use('/play', express.static('storage'));

app.listen(3000)