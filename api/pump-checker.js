const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_ID = "903532698";
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
        const msg = `🚀 PUMP ALERT\n\nKoin: ${symbol.toUpperCase()}\nHarga: ${lastPrice}\nNaik: ${changePercent.toFixed(2)}%`;
        await bot.sendMessage(CHAT_ID, msg);
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
