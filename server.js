const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const USERS_FILE = 'users.json';
const TWEETS_FILE = 'tweets.json';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (users[username]) {
        return res.status(400).json({ error: 'User already exists' });
    }
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    users[username] = { hash };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    res.status(200).json({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users[username];
    if (!user) {
        return res.status(400).json({ error: 'User does not exist' });
    }
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.hash !== hash) {
        return res.status(400).json({ error: 'Invalid password' });
    }
    res.status(200).json({ message: 'Login successful' });
});

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const tweet = JSON.parse(message);
        const tweets = JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf8'));
        tweets.push(tweet);
        fs.writeFileSync(TWEETS_FILE, JSON.stringify(tweets));
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(tweets));
            }
        });
    });
});

server.listen(4800, () => {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
    if (!fs.existsSync(TWEETS_FILE)) fs.writeFileSync(TWEETS_FILE, '[]');
    console.log('Server is listening on port 4800');
});
