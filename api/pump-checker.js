const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};

module.exports = async (req, res) => {
  try {
    const { data } = await axios.get('https://indodax.com/api/tickers');
    const tickers = data.tickers;

    let result = [];

    for (const [symbol, ticker] of Object.entries(tickers)) {
      const lastPrice = parseFloat(ticker.last);
      const prevPrice = lastPrices[symbol] || lastPrice;
      const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

      if (changePercent >= 10) {
        const msg = `🚀 *PUMP ALERT!*\n\n🪙 Koin: *${symbol.toUpperCase()}*\n💰 Harga: *${lastPrice}*\n📈 Naik: *${changePercent.toFixed(2)}%*`;

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        }

        result.push(msg);
      }

      lastPrices[symbol] = lastPrice;
    }

    res.status(200).json({ status: 'ok', message: result });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
