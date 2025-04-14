const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TELEGRAM_TOKEN = '7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw'; // Ganti dengan token kamu
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const message = req.body.message;
    if (!message || !message.chat || !message.chat.id) {
      return res.status(400).json({ message: 'Invalid Telegram update format' });
    }

    const chatId = message.chat.id;

    // Simpan chatId ke users.json
    const filePath = path.resolve('./users.json');
    let users = [];

    if (fs.existsSync(filePath)) {
      users = JSON.parse(fs.readFileSync(filePath));
    }

    if (!users.includes(chatId)) {
      users.push(chatId);
      fs.writeFileSync(filePath, JSON.stringify(users));
    }

    // Kirim balasan
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Halo! Kamu sekarang akan menerima notifikasi pump coin.',
    });

    res.status(200).json({ message: 'Success', chatId });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
