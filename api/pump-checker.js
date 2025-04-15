const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};

const coinIdMap = {
  btcidr: 'bitcoin',
  ethidr: 'ethereum',
  usdtidr: 'tether',
  dogeidr: 'dogecoin',
  solidr: 'solana',
  trxidr: 'tron',
  xrpidr: 'ripple',
  adaidr: 'cardano',
  shibidr: 'shiba-inu',
};

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

      // Analisis kenaikan harga (10% atau lebih)
      if (changePercent >= 10) {
        const pumpMsg = `🚀 *PUMP ALERT!*\n\n🪙 Koin: *${symbol.toUpperCase()}*\n💰 Harga Terbaru: *${lastPrice}*\n💰 Harga Sebelumnya: *${prevPrice}* \n📈 Naik: *${changePercent.toFixed(2)}%*`;
        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, pumpMsg, { parse_mode: "Markdown" });
        }
        result.push(pumpMsg);
      }

      // Analisis perubahan volume (lebih dari 5000)
      if (volumeChange > 5000) {
        const volumeMsg = `💥 *ALERT VOLUME BESAR!*\n\n🪙 Koin: *${symbol.toUpperCase()}*\n📊 Volume Terbaru: *${lastVolume}*\n📊 Volume Sebelumnya: *${prevVolume}*\n📈 Perubahan Volume: *${volumeChange}*`;
        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, volumeMsg, { parse_mode: "Markdown" });
        }
        result.push(volumeMsg);
      }

      // Analisis spread Buy/Sell dan rekomendasi
      const buyPrice = parseFloat(ticker.buy);
      const sellPrice = parseFloat(ticker.sell);
      const spread = sellPrice - buyPrice;

      if (spread < 0.0000005) {
        const spreadMsg = `📉 Spread pasar untuk ${coinIdMap[symbol]} sangat sempit.\nHarga Beli: *${buyPrice}* | Harga Jual: *${sellPrice}*\nSpread: *${spread}* (Sempit)\nSaran: Pasar aktif, pertimbangkan untuk melakukan Buy/Sell.`;
        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, spreadMsg, { parse_mode: "Markdown" });
        }
        result.push(spreadMsg);
      } else if (buyPrice < sellPrice) {
        const spreadMsg = `📈 Spread pasar untuk ${coinIdMap[symbol]} lebih lebar.\nHarga Beli: *${buyPrice}* | Harga Jual: *${sellPrice}*\nSpread: *${spread}* (Lebar)\nSaran: Perhatikan pergerakan harga, kemungkinan akan ada kenaikan harga.`;
        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, spreadMsg, { parse_mode: "Markdown" });
        }
        result.push(spreadMsg);
      }

      // Update harga dan volume untuk pemeriksaan berikutnya
      lastPrices[symbol] = lastPrice;
      lastVolumes[symbol] = lastVolume;
    }

    res.status(200).json({ status: 'ok', message: result });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
