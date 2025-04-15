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
      if (changePercent >= 8) {
        let pumpMsg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n💰 Harga Terbaru: *${lastPrice}*\n💰 Harga Sebelumnya: *${prevPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*`;

        // 🔍 Analisis Spread Harga (hanya jika pump terdeteksi)
        if (spread > 0) {
          let spreadRisk = '';
          if (spread <= 50) {
            spreadRisk = '🟢 *Risiko Rendah* — Pasar aktif, cocok untuk entry.';
          } else if (spread <= 200) {
            spreadRisk = '🟡 *Risiko Sedang* — Perlu hati-hati, cek volume dan arah pasar.';
          } else {
            spreadRisk = '🔴 *Risiko Tinggi* — Spread besar, potensi manipulasi atau pasar sepi.';
          }

          const rekomendasi = spread <= 50
            ? '✅ *Layak dibeli* — Spread kecil, pasar aktif.'
            : '⚠️ *Belum layak beli* — Spread terlalu besar, tunggu momen lebih baik.';

          pumpMsg += `\n\n🔍 *Analisis Spread:*\n💸 Harga Beli (Bid): *${buyPrice}*\n💸 Harga Jual (Ask): *${sellPrice}*\n📉 Spread: *${spread}*\n${spreadRisk}\n\n${rekomendasi}`;

          // 🎯 Target Jual jika spread masuk kategori rendah
          if (spread <= 50) {
            const hargaMasuk = buyPrice;

            const tpKecil = Math.round(hargaMasuk * 1.02);   // 2% - aman
            const tpSedang = Math.round(hargaMasuk * 1.05);  // 5% - sedang
            const tpBesar = Math.round(hargaMasuk * 1.10);   // 10% - berisiko

            pumpMsg += `\n\n🎯 *Rekomendasi Perdagangan:*\n✅ Beli di kisaran: *${hargaMasuk}*\n\n🎯 *Target Jual:*\n- 💼 TP Aman (2%): *${tpKecil}*\n- ⚖️ TP Sedang (5%): *${tpSedang}*\n- 🎲 TP Berisiko (10%): *${tpBesar}*`;
          }
        }

        // Fetch Fundamental Data from CoinGecko
        try {
          const coinGeckoData = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinName.toLowerCase()}`);
          const { market_cap, circulating_supply, total_supply, volume_24h } = coinGeckoData.data.market_data;

          const fundamentalMsg = `
          📊 *Analisis Fundamental:*\n
          💸 *Market Cap*: ${market_cap.toLocaleString()}\n
          🔄 *Circulating Supply*: ${circulating_supply.toLocaleString()}\n
          🔢 *Total Supply*: ${total_supply.toLocaleString()}\n
          📈 *Volume 24h*: ${volume_24h.toLocaleString()}
          `;

          pumpMsg += fundamentalMsg;
        } catch (error) {
          console.error('Error fetching fundamental data:', error.message);
          pumpMsg += "\n⚠️ Gagal mendapatkan data fundamental.";
        }

        // Kirim pesan ke Telegram
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
