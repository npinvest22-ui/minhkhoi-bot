const express = require(‘express’);
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || ‘minhkhoi2026’;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || ‘’;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ‘’;

app.get(’/webhook’, (req, res) => {
const mode = req.query[‘hub.mode’];
const token = req.query[‘hub.verify_token’];
const challenge = req.query[‘hub.challenge’];
if (mode === ‘subscribe’ && token === VERIFY_TOKEN) {
console.log(‘Webhook verified!’);
res.status(200).send(challenge);
} else {
res.sendStatus(403);
}
});

app.post(’/webhook’, async (req, res) => {
const body = req.body;
if (body.object !== ‘page’) return res.sendStatus(404);
res.status(200).send(‘EVENT_RECEIVED’);

for (const entry of body.entry || []) {
for (const event of entry.messaging || []) {
if (!event.message || event.message.is_echo) continue;
const senderId = event.sender.id;
const text = event.message.text;
if (!text) continue;
console.log(’Message from ’ + senderId + ’: ’ + text);
try {
await sendTyping(senderId);
const reply = await getAIReply(text);
await sendMessage(senderId, reply);
} catch (err) {
console.error(‘Error:’, err.message);
await sendMessage(senderId, ‘Xin loi, he thong dang ban. Vui long thu lai sau.’);
}
}
}
});

async function getAIReply(userMessage) {
const res = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’
},
body: JSON.stringify({
model: ‘claude-haiku-4-5-20251001’,
max_tokens: 500,
system: ‘Ban la tro ly cham soc khach hang cua Xuong Giat Ui Minh Khoi tai Da Lat. Dich vu: giat ui cong nghiep cho khach san resort homestay va giat le ca nhan. Giao nhan tan noi. Gia: 7000-14000d/kg tuy loai. Gio lam: 7h-18h hang ngay. Tra loi ngan gon than thien chuyen nghiep duoi 150 chu.’,
messages: [{ role: ‘user’, content: userMessage }]
})
});
const data = await res.json();
if (data.error) {
console.error(‘Claude error:’, JSON.stringify(data.error));
return ‘Cam on ban da lien he Minh Khoi! Chung toi se phan hoi som nhat.’;
}
return data.content[0].text;
}

async function sendMessage(recipientId, text) {
const res = await fetch(‘https://graph.facebook.com/v19.0/me/messages?access_token=’ + PAGE_ACCESS_TOKEN, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
recipient: { id: recipientId },
message: { text: text }
})
});
const data = await res.json();
if (data.error) console.error(‘Send error:’, JSON.stringify(data.error));
}

async function sendTyping(recipientId) {
await fetch(‘https://graph.facebook.com/v19.0/me/messages?access_token=’ + PAGE_ACCESS_TOKEN, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
recipient: { id: recipientId },
sender_action: ‘typing_on’
})
});
}

app.get(’/’, (req, res) => res.send(‘Minh Khoi Bot running!’));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(’Bot running on port ’ + PORT);
setInterval(function() {
fetch(‘https://minhkhoi-bot.onrender.com/’).then(function() {
console.log(‘Keepalive ok’);
}).catch(function(e) {
console.log(’Keepalive fail: ’ + e.message);
});
}, 840000);
});
