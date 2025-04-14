const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const bot = new TelegramBot(TOKEN);

let lastPrices = {};
let sentCoins = new Set();

module.exports = async (req, res) => {
  try {
    const { data } = await axios.get('https://indodax.com/api/tickers');
    const tickers = data.tickers;

    const users = JSON.parse(fs.readFileSync(path.resolve('./users.json')));

    let result = [];

    for (const [symbol, ticker] of Object.entries(tickers)) {
      const lastPrice = parseFloat(ticker.last);
      const prevPrice = lastPrices[symbol] || lastPrice;
      const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
      console.log(changePercent, 'suksesssss')
      if (changePercent >= 10 && !sentCoins.has(symbol)) {
        const msg = `🚀 *KOIN NAIK CEPAT!*\n\n🪙 Koin: *${symbol.toUpperCase()}*\n💰 Harga: *${lastPrice}*\n📈 Naik: *${changePercent.toFixed(2)}%*`;

        for (const userId of users) {
          await bot.sendMessage(userId, msg, { parse_mode: 'Markdown' });
        }

        result.push(symbol);
        sentCoins.add(symbol);
      }

      lastPrices[symbol] = lastPrice;
    }

    setTimeout(() => sentCoins.clear(), 3600000); // reset sent coins tiap jam

    res.status(200).json({ status: 'ok', pumped: result });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
