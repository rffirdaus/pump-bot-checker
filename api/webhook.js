const axios = require('axios');

const TELEGRAM_TOKEN = '7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

let users = []; // hanya tersimpan saat instance aktif

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const message = req.body.message;

    if (!message || !message.chat || !message.chat.id) {
      console.log('Invalid message format:', JSON.stringify(req.body));
      return res.status(400).json({ message: 'Invalid message format' });
    }

    const chatId = message.chat.id;

    if (!users.includes(chatId)) {
      users.push(chatId);
      console.log(`✅ Registered new chatId: ${chatId}`);
    }

    // Kirim pesan balasan
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Halo! Kamu sudah terdaftar untuk notifikasi coin pump.',
    });

    return res.status(200).json({ message: 'Registered', chatId });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
