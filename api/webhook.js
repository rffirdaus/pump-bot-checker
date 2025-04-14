const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TELEGRAM_TOKEN = '7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const message = req.body.message;

    if (!message || !message.chat || !message.chat.id) {
      return res.status(400).json({ message: 'Invalid message format' });
    }

    const chatId = message.chat.id;
    const filePath = path.resolve('./users.json');
    let users = [];

    // Baca users.json kalau ada
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      users = JSON.parse(fileContent || '[]');
    }

    // Tambahkan chatId kalau belum ada
    if (!users.includes(chatId)) {
      users.push(chatId);
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    }

    // Kirim pesan ke user
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: '✅ Kamu sudah terdaftar untuk menerima notifikasi pump coin.',
    });

    return res.status(200).json({ message: 'User registered', chatId });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
