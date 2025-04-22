const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');

const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw');

// Fungsi bantu buat simulasi moving average dari cache
function calculateMA(data, period = 5) {
  if (data.length < period) return null;
  const recent = data.slice(-period);
  const sum = recent.reduce((acc, val) => acc + val, 0);
  return Math.floor(sum / period);
}

// Fungsi bantu buat simulasi RSI dari cache
function calculateRSI(prices, period = 5) {
  if (prices.length < period + 1) return null;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.floor(100 - (100 / (1 + rs)));
}

// Simpan cache harga per coin
let cache = {};
const cacheFile = 'price_cache.json';
if (fs.existsSync(cacheFile)) {
  cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
}

setInterval(() => {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}, 10000); // autosave tiap 10 detik

bot.start((ctx) => {
  ctx.reply('Halo! Kirim nama koin + "indodax", contoh:\n\nloom indodax');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const [coin, source] = text.split(' ');

  if (source !== 'indodax') {
    return ctx.reply('Format salah. Contoh: loom indodax');
  }

  const pair = `${coin}_idr`;
  try {
    const res = await axios.get(`https://indodax.com/api/${pair}/ticker`);
    const last = parseInt(res.data.ticker.last);
    const high = parseInt(res.data.ticker.high);
    const low = parseInt(res.data.ticker.low);

    // Update cache harga
    if (!cache[coin]) cache[coin] = [];
    cache[coin].push(last);
    if (cache[coin].length > 50) cache[coin] = cache[coin].slice(-50);

    // Hitung indikator
    const ma5 = calculateMA(cache[coin], 5);
    const rsi = calculateRSI(cache[coin], 5);

    const buyZoneLow = Math.floor(ma5 * 0.94);
    const buyZoneHigh = Math.floor(ma5 * 0.98);
    const tp1 = Math.floor(ma5 * 1.05);
    const tp2 = Math.floor(ma5 * 1.1);
    const tp3 = Math.floor(ma5 * 1.15);
    const sl = Math.floor(ma5 * 0.90);

    let signal = '';
    if (rsi < 30 && last >= buyZoneLow && last <= buyZoneHigh) {
      signal = '✅ RSI rendah & harga di zona beli — saat yang bagus untuk masuk.';
    } else if (rsi > 70) {
      signal = '⚠️ RSI tinggi — pasar overbought, hati-hati.';
    } else if (last > buyZoneHigh) {
      signal = '⚠️ Harga terlalu tinggi — tunggu koreksi.';
    } else {
      signal = 'ℹ️ Tunggu sinyal lebih kuat — jangan buru-buru masuk.';
    }

    const message = `📊 ANALISIS ${coin.toUpperCase()}/IDR\nHarga sekarang: ${last} IDR\n\n🧮 Indikator:\n- MA(5): ${ma5} IDR\n- RSI(5): ${rsi}\n\n📈 Zona Beli: ${buyZoneLow} – ${buyZoneHigh}\n❌ Stop Loss: < ${sl} IDR\n🎯 TP1: ${tp1}\n🎯 TP2: ${tp2}\n🎯 TP3: ${tp3}\n\n${signal}`;

    ctx.reply(message);
  } catch (err) {
    ctx.reply(`Koin \"${coin}\" tidak ditemukan di Indodax.`);
  }
});

bot.launch();
console.log('Bot aktif dengan indikator MA & RSI...');
