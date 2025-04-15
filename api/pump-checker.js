const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let lastPrices = {};
let lastVolumes = {};

// Fungsi untuk mendapatkan data koin spesifik (misalnya BTC) dari CoinGecko
async function getCoinGeckoData(coinId) {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = response.data;

    const marketCap = data.market_data.market_cap.idr; // Kapitalisasi Pasar
    const totalSupply = data.market_data.total_supply; // Pasokan Koin
    const circulatingSupply = data.market_data.circulating_supply; // Pasokan Beredar
    const volume24h = data.market_data.total_volumes[0].usd; // Volume 24 Jam dalam USD

    return {
      marketCap,
      totalSupply,
      circulatingSupply,
      volume24h
    };
  } catch (err) {
    console.error('Error fetching CoinGecko data:', err.message);
    return null;
  }
}

// Fungsi untuk mendapatkan analisis koin
async function getCoinAnalysis(symbol) {
  try {
    const { data } = await axios.get('https://indodax.com/api/tickers');
    const tickers = data.tickers;

    const symbolLowerCase = symbol.toLowerCase();  // Konversi simbol menjadi huruf kecil
    const ticker = tickers[symbolLowerCase];
    if (!ticker) return `Koin ${symbol} tidak ditemukan.`;

    const lastPrice = parseFloat(ticker.last);
    const prevPrice = lastPrices[symbolLowerCase] || lastPrice;
    const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

    const buyPrice = parseFloat(ticker.buy);
    const sellPrice = parseFloat(ticker.sell);
    const spread = sellPrice - buyPrice;

    const coinName = symbolLowerCase.replace('idr', '').toUpperCase() + '/IDR';

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

    // Mengambil data fundamental dari CoinGecko
    const coinGeckoData = await getCoinGeckoData(symbolLowerCase.replace('idr', ''));
    if (coinGeckoData) {
      pumpMsg += `\n\n📊 *Analisis Fundamental:*\n- 💎 Kapitalisasi Pasar: *${coinGeckoData.marketCap} IDR*\n- 🪙 Pasokan Total: *${coinGeckoData.totalSupply}*\n- 🔄 Pasokan Beredar: *${coinGeckoData.circulatingSupply}*\n- 💵 Volume 24 Jam: *${coinGeckoData.volume24h} USD*`;
    }

    return pumpMsg;
  } catch (err) {
    console.error('Error fetching data:', err.message);
    return 'Terjadi kesalahan dalam mengambil data.';
  }
}

// Command handler untuk memproses perintah /<coin>
// Tanpa pemetaan manual, langsung mengonversi input ke simbol Indodax
bot.onText(/\/(\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const coinInput = match[1].toLowerCase();  // Ambil input koin, misalnya btc
  
  // Tambahkan 'idr' ke simbol koin yang dimasukkan
  const coinSymbol = coinInput + 'idr';  // Membuat simbol seperti 'btc' menjadi 'btcidr'

  // Dapatkan analisis untuk koin yang diminta
  const analysisMessage = await getCoinAnalysis(coinSymbol);
  bot.sendMessage(chatId, analysisMessage, { parse_mode: "Markdown" });
});

// Command handler untuk menangani pesan kosong atau perintah yang tidak dikenali
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && !msg.text.startsWith('/')) {
    const infoMessage = await getCoinAnalysis('btcidr');  // Defaultkan ke BTC atau koin lain
    bot.sendMessage(chatId, infoMessage, { parse_mode: "Markdown" });
  }
});
