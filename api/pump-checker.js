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
      if (changePercent >= 1) {
        let pumpMsg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n💰 Harga Terbaru: *${lastPrice}*\n💰 Harga Sebelumnya: *${prevPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*`;

        // 🔍 Analisis Spread Harga (hanya jika pump terdeteksi)
        if (spread > 0) {
          const rekomendasi = spread < 0.0000005
            ? '✅ *Layak dibeli* — Spread kecil, pasar aktif.'
            : '⚠️ *Belum layak beli* — Spread terlalu besar, tunggu momen lebih baik.';
        
          pumpMsg += `\n\n🔍 *Analisis Spread:*\n💸 Harga Beli: *${buyPrice}*\n💸 Harga Jual: *${sellPrice}*\n📉 Spread: *${spread}*\n\n${rekomendasi}`;
        
          // Tambah Rekomendasi Entry dan TP jika spread oke
          if (spread < 0.0000005) {
            const hargaMasuk = buyPrice;
          
            // Target jual berdasarkan kategori risiko
            const tpKecil = Math.round(hargaMasuk * 1.02);   // 2% - aman
            const tpSedang = Math.round(hargaMasuk * 1.05);  // 5% - sedang
            const tpBesar = Math.round(hargaMasuk * 1.10);   // 10% - berisiko
          
            pumpMsg += `\n\n🎯 *Rekomendasi Perdagangan:*\n✅ Beli di kisaran: *${hargaMasuk}*\n\n🎯 *Target Jual:*\n- 💼 TP Aman (2%): *${tpKecil}*\n- ⚖️ TP Sedang (5%): *${tpSedang}*\n- 🎲 TP Berisiko (10%): *${tpBesar}*`;
          }
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
