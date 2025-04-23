const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw'); // ganti dengan token asli

const cache = {}; // Simpan histori harga tiap koin

// Hitung Moving Average
function calculateMA(data, period = 5) {
  if (!data || data.length < period) return '🔄 (menunggu data)';
  const recent = data.slice(-period);
  const sum = recent.reduce((acc, val) => acc + val, 0);
  return Math.floor(sum / period);
}

// Hitung RSI sederhana
function calculateRSI(prices, period = 5) {
  if (!prices || prices.length < period + 1) return '🔄 (menunggu data)';
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.floor(100 - 100 / (1 + rs));
}

// Format angka
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Ambil data depth chart
async function getDepthChart(pair) {
  try {
    const res = await axios.get(`https://indodax.com/api/${pair}/depth`);
    console.log(res, 'siniii')
    // if (res.data && res.data.bids) {
    //   return res.data; // Kembalikan data depth chart jika ada
    // } else {
    //   throw new Error('Data depth chart tidak ditemukan');
    // }
  } catch (error) {
    console.error('Error fetching depth chart:', error.message);
    return null;
  }
}

// Bot start message
bot.start((ctx) => {
  ctx.reply('Halo! Kirim nama koin + "indodax", contoh:\n\nloom indodax');
});

// Handle pesan teks
// Handle pesan teks
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const [coin, source] = text.split(' ');

  if (source !== 'indodax') {
    return ctx.reply('Format salah. Contoh: loom indodax');
  }

  const pair = `${coin}_idr`;

  try {
    // Log untuk memastikan pair yang benar
    console.log(`Mengambil data untuk pasangan: ${pair}`);

    const res = await axios.get(`https://indodax.com/api/${pair}/ticker`);

    // Log untuk memastikan response data yang diterima
    console.log('Response API:', res.data);

    if (!res.data || !res.data.ticker) {
      return ctx.reply(`⚠️ Data tidak ditemukan untuk koin "${coin}".`);
    }

    const lastPrice = parseInt(res.data.ticker.last);

    // Simpan ke cache
    if (!cache[coin]) cache[coin] = [];
    cache[coin].push(lastPrice);
    if (cache[coin].length > 50) cache[coin].shift(); // Simpan max 50 data

    // Hitung indikator
    const prices = cache[coin];
    const rsi = calculateRSI(prices, 5);
    const ma = calculateMA(prices, 5);

    // Ambil data depth chart
    const depth = await getDepthChart(pair);
    let buyAlert = '';
    if (depth && depth.bids) {
      const buyOrders = depth.bids.slice(0, 5); // Ambil 5 pembeli terbesar
      const totalBuyVolume = buyOrders.reduce((acc, order) => acc + parseFloat(order[1]), 0);
      const averageBuyPrice = buyOrders.reduce((acc, order) => acc + parseFloat(order[0]) * parseFloat(order[1]), 0) / totalBuyVolume;

      // Analisis apakah pembeli besar ada
      if (totalBuyVolume > 100) { // Jika total volume pembeli lebih dari 100 IDR
        buyAlert = `🚨 Pembeli besar terdeteksi di harga sekitar ${formatNumber(averageBuyPrice)} IDR. Ini mungkin sinyal untuk membeli.`;
      } else {
        buyAlert = '⚠️ Tidak ada pembeli besar yang terdeteksi.';
      }
    } else {
      buyAlert = '⚠️ Data depth chart tidak tersedia.';
    }

    // Hitung zona beli & target profit berdasarkan MA
    const base = typeof ma === 'number' ? ma : lastPrice;
    const buyZoneLow = Math.floor(base * 0.89);
    const buyZoneHigh = Math.floor(base * 0.94);
    const tp1 = Math.floor(base * 1.03);
    const tp2 = Math.floor(base * 1.08);
    const tp3 = Math.floor(base * 1.13);
    const sl = Math.floor(base * 0.85);

    let status = '';
    if (typeof rsi === 'string') {
      status = '⏳ Menunggu cukup data untuk analisis...';
    } else if (lastPrice < sl) {
      status = '📉 Status: Harga di bawah support, jangan beli dulu.';
    } else if (rsi < 30 && lastPrice >= buyZoneLow && lastPrice <= buyZoneHigh) {
      status = '✅ Status: Oversold dan di zona beli — bisa mulai cicil beli.';
    } else if (rsi > 70) {
      status = '⚠️ Status: Overbought, hindari membeli sekarang.';
    } else if (lastPrice >= buyZoneLow && lastPrice <= buyZoneHigh) {
      status = '✅ Status: Harga berada di zona beli.';
    } else if (lastPrice > buyZoneHigh) {
      status = '⚠️ Status: Harga di atas zona beli, tunggu koreksi.';
    } else {
      status = '⚠️ Status: Harga belum masuk zona beli.';
    }

    const message = `📊 ANALISIS ${coin.toUpperCase()}/IDR\n` +
      `Harga sekarang: ${formatNumber(lastPrice)} IDR\n\n` +
      `🟦 Buy area: ${formatNumber(buyZoneLow)} – ${formatNumber(buyZoneHigh)} IDR\n` +
      `❌ Stop Loss: < ${formatNumber(sl)} IDR\n` +
      `🎯 Target Profit:\n- TP1: ${formatNumber(tp1)} IDR\n- TP2: ${formatNumber(tp2)} IDR\n- TP3: ${formatNumber(tp3)} IDR\n\n` +
      `📈 MA (5): ${typeof ma === 'number' ? formatNumber(ma) : ma}\n` +
      `📊 RSI (5): ${typeof rsi === 'number' ? rsi : rsi}\n\n` +
      `${status}\n\n${buyAlert}`;

    ctx.reply(message);
  } catch (error) {
    console.error('Error:', error.message); // Menambahkan log error untuk mempermudah debug
    ctx.reply(`⚠️ Koin "${coin}" tidak ditemukan di Indodax.`);
  }
});



// Auto polling harga setiap 60 detik (biar cache cepat terisi)
setInterval(async () => {
  const coins = Object.keys(cache);
  for (const coin of coins) {
    const pair = `${coin}_idr`;
    try {
      const res = await axios.get(`https://indodax.com/api/${pair}/ticker`);
      const lastPrice = parseInt(res.data.ticker.last);
      cache[coin].push(lastPrice);
      if (cache[coin].length > 50) cache[coin].shift();
    } catch (err) {
      console.log(`Gagal polling harga ${coin}:`, err.message);
    }
  }
}, 60_000);

bot.launch();
console.log('🤖 Bot sedang berjalan...');
