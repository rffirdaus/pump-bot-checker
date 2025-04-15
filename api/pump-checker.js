const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};

module.exports = async (req, res) => {
  try {
    const { data } = await axios.get('https://indodax.com/api/tickers');
    const tickers = data.tickers;
    let result = [];

    for (const [symbol, ticker] of Object.entries(tickers)) {
      const lastPrice = parseFloat(ticker.last);
      const prevPrice = lastPrices[symbol] || lastPrice;
      const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

      const lastVolume = parseFloat(ticker.volume);
      const prevVolume = lastVolumes[symbol] || lastVolume;
      const volumeChange = lastVolume - prevVolume;

      const buyPrice = parseFloat(ticker.buy);
      const sellPrice = parseFloat(ticker.sell);
      const spread = sellPrice - buyPrice;

      const coinName = symbol.replace('idr', '').toUpperCase() + '/IDR';

      // 🚀 Pump Alert
      if (changePercent >= 10) {
        let pumpMsg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n💰 Harga Terbaru: *${lastPrice}*\n💰 Harga Sebelumnya: *${prevPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*`;

        // 🔍 Analisis Spread Harga (hanya jika pump terdeteksi)
        if (spread > 0) {
          pumpMsg += `\n\n🔍 *Analisis Spread:*\n💸 Harga Beli: *${buyPrice}*\n💸 Harga Jual: *${sellPrice}*\n📉 Spread: *${spread}*\n📌 Saran: ${
            spread < 0.0000005
              ? 'Pasar aktif, bisa pertimbangkan untuk beli/jual.'
              : 'Spread besar, waspada sebelum ambil posisi.'
          }`;
        }

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, pumpMsg, { parse_mode: "Markdown" });
        }

        result.push(pumpMsg);
      }

      // 💥 Volume Besar
      if (volumeChange > 5000) {
        const volumeMsg = `💥 *VOLUME BESAR TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n📊 Volume Sekarang: *${lastVolume}*\n📊 Volume Sebelumnya: *${prevVolume}*\n📈 Perubahan Volume: *${volumeChange}*`;

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, volumeMsg, { parse_mode: "Markdown" });
        }

        result.push(volumeMsg);
      }

      // Simpan data terakhir untuk pengecekan berikutnya
      lastPrices[symbol] = lastPrice;
      lastVolumes[symbol] = lastVolume;
    }

    res.status(200).json({ status: 'ok', message: result });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
