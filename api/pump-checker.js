const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let lastPrices = {};
let lastVolumes = {};

// Fungsi untuk mendapatkan data koin spesifik (misalnya BTC)
async function getCoinAnalysis(symbol) {
  try {
    const { data } = await axios.get('https://indodax.com/api/tickers');
    const tickers = data.tickers;

    // Ambil data koin berdasarkan simbol yang diberikan
    const ticker = tickers[symbol];
    if (!ticker) return `Koin ${symbol.toUpperCase()} tidak ditemukan.`;

    const lastPrice = parseFloat(ticker.last);
    const prevPrice = lastPrices[symbol] || lastPrice;
    const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

    const buyPrice = parseFloat(ticker.buy);
    const sellPrice = parseFloat(ticker.sell);
    const spread = sellPrice - buyPrice;

    const coinName = symbol.replace('idr', '').toUpperCase() + '/IDR';

    // 🚀 Pump Alert
    let pumpMsg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n💰 Harga Terbaru: *${lastPrice}*\n💰 Harga Sebelumnya: *${prevPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*`;

    // 🔍 Analisis Spread Harga (hanya jika pump terdeteksi)
    if (spread > 0) {
      const rekomendasi = spread < 0.0000005
        ? '✅ *Layak dibeli* — Spread kecil, pasar aktif.'
        : '⚠️ *Belum layak beli* — Spread terlalu besar, tunggu momen lebih baik.';

      pumpMsg += `\n\n🔍 *Analisis Spread:*\n💸 Harga Beli (Bid): *${buyPrice}*\n💸 Harga Jual (Ask): *${sellPrice}*\n📉 Spread: *${spread}*\n\n${rekomendasi}`;

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

    return pumpMsg;
  } catch (err) {
    console.error('Error fetching data:', err.message);
    return 'Terjadi kesalahan dalam mengambil data.';
  }
}

// Command handler untuk memproses perintah /<coin>
bot.onText(/\/(\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const coinSymbol = match[1].toLowerCase() + 'idr';  // ubah ke format yang sesuai dengan API Indodax

  // Dapatkan analisis untuk koin yang diminta
  const analysisMessage = await getCoinAnalysis(coinSymbol);
  bot.sendMessage(chatId, analysisMessage, { parse_mode: "Markdown" });
});

