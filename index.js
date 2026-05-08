const express = require('express');
const app = express();
app.use(express.json());

// ===== CẤU HÌNH =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'minhkhoi2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// ===== WEBHOOK VERIFY =====
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== NHẬN TIN NHẮN =====
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      const senderId = event.sender.id;
      const text = event.message.text;
      if (!text) continue;

      try {
        // Gửi typing indicator
        await sendTyping(senderId);
        
        // Gọi Claude AI
        const reply = await getAIReply(text);
        
        // Gửi reply
        await sendMessage(senderId, reply);
      } catch (err) {
        console.error('Error:', err);
        await sendMessage(senderId, 'Xin lỗi, hệ thống đang bận. Vui lòng gọi hotline để được hỗ trợ ngay.');
      }
    }
  }
});

// ===== GỌI CLAUDE AI =====
async function getAIReply(userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Bạn là trợ lý chăm sóc khách hàng của Xưởng Giặt Ủi Minh Khôi tại Đà Lạt.

THÔNG TIN DỊCH VỤ:
- Giặt ủi công nghiệp cho khách sạn, resort, homestay
- Giặt lẻ cho khách hàng cá nhân
- Giao nhận tận nơi tại Đà Lạt
- Giá: 7,000 - 14,000đ/kg tùy loại (chăn ga gối, đồ thường)
- Giờ làm việc: 7h - 18h hàng ngày
- Địa chỉ: Đà Lạt, Lâm Đồng
- Hotline: liên hệ qua Facebook Messenger này

CÁCH TRẢ LỜI:
- Thân thiện, ngắn gọn, chuyên nghiệp
- Dưới 150 chữ mỗi tin
- Nếu khách hỏi giá cụ thể → cho biết khoảng giá và đề nghị báo giá chính xác qua tin nhắn
- Nếu khách muốn đặt lịch → hỏi địa chỉ và thời gian thuận tiện
- Không bịa thông tin không có trong hướng dẫn này`,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || 'Cảm ơn bạn đã liên hệ Minh Khôi! Chúng tôi sẽ phản hồi sớm nhất.';
}

// ===== GỬI TIN NHẮN =====
async function sendMessage(recipientId, text) {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
}

async function sendTyping(recipientId) {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: 'typing_on'
    })
  });
}

app.get('/', (req, res) => res.send('Minh Khoi Messenger Bot running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
