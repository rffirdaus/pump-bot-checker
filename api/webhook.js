const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TELEGRAM_TOKEN = '7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const USERS_FILE = path.resolve('./users.json');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const message = req.body.message;

    if (!message || !message.chat || !message.chat.id) {
      console.log('Invalid message format:', JSON.stringify(req.body));
      return res.status(400).json({ message: 'Invalid Telegram update format' });
    }

    const chatId = message.chat.id;
    const text = message.text || '';

    if (text === '/start') {
      // Baca data user yang sudah ada
      let users = [];
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE);
        users = JSON.parse(raw);
      }

      // Tambahkan chatId jika belum ada
      if (!users.includes(chatId)) {
        users.push(chatId);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      }

      // Kirim balasan
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: '✅ Kamu berhasil berlangganan notifikasi *pump coin*!',
        parse_mode: 'Markdown',
      });
    }

    res.status(200).json({ message: 'Success', chatId });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
