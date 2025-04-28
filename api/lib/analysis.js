const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sharp = require('sharp');
const axios = require('axios');

// Bot Token
const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw');

// Cache harga untuk analisa
const cache = {};

// ============ ✨ Fungsi Edit Foto Cinematic ============
async function downloadPhoto(fileId) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const res = await fetch(fileLink.href);
  const buffer = await res.buffer();
  return buffer;
}

async function applyCinematicEffect(buffer) {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Color grading
  const graded = await image
    .modulate({
      brightness: 0.95,
      saturation: 1.2,
      hue: 10
    })
    .linear(1.1, -10)
    .toBuffer();

  // Cinematic black bars
  const blackBarHeight = Math.floor(metadata.width * 0.1);
  const topBar = Buffer.from(
    `<svg width="${metadata.width}" height="${blackBarHeight}">
      <rect width="100%" height="100%" fill="black"/>
    </svg>`
  );
  const bottomBar = Buffer.from(
    `<svg width="${metadata.width}" height="${blackBarHeight}">
      <rect width="100%" height="100%" fill="black"/>
    </svg>`
  );

  const finalImage = await sharp(graded)
    .composite([
      { input: topBar, top: 0, left: 0 },
      { input: bottomBar, top: metadata.height - blackBarHeight, left: 0 }
    ])
    .toBuffer();

  return finalImage;
}

// ============ 📈 Fungsi Analisis Crypto ============

function calculateMA(data, period = 5) {
  if (!data || data.length < period) return '🔄 (menunggu data)';
  const recent = data.slice(-period);
  const sum = recent.reduce((acc, val) => acc + val, 0);
  return Math.floor(sum / period);
}

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

function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

async function getDepthChart(pair) {
  try {
    const res = await axios.get(`https://indodax.com/api/${pair}/depth`);
    return res.data;
  } catch (error) {
    console.error('Error fetching depth chart:', error.message);
    return null;
  }
}

// ============ 🚀 Event Handling ============

// User kirim foto
bot.on('photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo.pop().file_id;
    const originalImage = await downloadPhoto(fileId);
    const editedImage = await applyCinematicEffect(originalImage);

    await ctx.replyWithPhoto({ source: editedImage }, { caption: '🎬 Sudah diubah jadi foto bergaya cinematic!' });
  } catch (err) {
    console.error('❌ Error edit foto:', err);
    ctx.reply('Oops! Gagal mengedit foto.');
  }
});

// User kirim teks
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const [coin, source] = text.split(' ');

  if (source !== 'indodax') {
    return ctx.reply('Format salah. Contoh: loom indodax');
  }

  const pair = `${coin}_idr`;

  try {
    const res = await axios.get(`https://indodax.com/api/${pair}/ticker`);
    if (!res.data || !res.data.ticker) {
      return ctx.reply(`⚠️ Data tidak ditemukan untuk koin "${coin}".`);
    }

    const lastPrice = parseInt(res.data.ticker.last);
    if (!cache[coin]) cache[coin] = [];
    cache[coin].push(lastPrice);
    if (cache[coin].length > 50) cache[coin].shift();

    const prices = cache[coin];
    const rsi = calculateRSI(prices, 5);
    const ma = calculateMA(prices, 5);

    const depth = await getDepthChart(pair);
    let buyAlert = '', dominance = '', alertStatus = '';

    if (depth) {
      const buyOrders = depth.buy.slice(0, 10);
      const sellOrders = depth.sell.slice(0, 10);

      const buyVolume = buyOrders.reduce((acc, order) => acc + parseFloat(order[1]), 0);
      const sellVolume = sellOrders.reduce((acc, order) => acc + parseFloat(order[1]), 0);

      dominance = buyVolume > sellVolume
        ? '📉 Dominasi: Lebih banyak PEMBELI (buyer dominance)'
        : '📈 Dominasi: Lebih banyak PENJUAL (seller dominance)';

      const totalBuyValue = buyOrders.reduce((acc, order) => acc + parseFloat(order[0]) * parseFloat(order[1]), 0);
      const avgBuyPrice = totalBuyValue / buyVolume;

      if (buyVolume > sellVolume && buyVolume > 100) {
        buyAlert = `🚨 Pembeli besar terdeteksi di harga sekitar ${formatNumber(avgBuyPrice)} IDR`;
      } else {
        buyAlert = '⚠️ Tidak ada pembeli besar dominan.';
      }
    } else {
      buyAlert = '⚠️ Data depth chart tidak tersedia.';
    }

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
      status = '📉 Harga di bawah support, jangan beli dulu.';
    } else if (rsi < 30 && lastPrice >= buyZoneLow && lastPrice <= buyZoneHigh) {
      status = '✅ Oversold & di zona beli — bisa mulai cicil beli.';
    } else if (rsi > 70) {
      status = '⚠️ Overbought, hindari beli.';
    } else if (lastPrice >= buyZoneLow && lastPrice <= buyZoneHigh) {
      status = '✅ Harga di zona beli.';
    } else if (lastPrice > buyZoneHigh) {
      status = '⚠️ Harga di atas zona beli, tunggu koreksi.';
    } else {
      status = '⚠️ Harga belum masuk zona beli.';
    }

    if (status.includes('✅') && buyAlert.includes('Pembeli besar')) {
      alertStatus = '\n🚀 **LAYAK BELI SEKARANG!**';
    } else {
      alertStatus = '\n⛔ **TUNGGU DULU, BELUM AMAN**';
    }

    const message = `📊 ANALISIS ${coin.toUpperCase()}/IDR\n` +
      `Harga sekarang: ${formatNumber(lastPrice)} IDR\n\n` +
      `🟦 Buy area: ${formatNumber(buyZoneLow)} – ${formatNumber(buyZoneHigh)} IDR\n` +
      `❌ Stop Loss: < ${formatNumber(sl)} IDR\n` +
      `🎯 Target Profit:\n- TP1: ${formatNumber(tp1)} IDR\n- TP2: ${formatNumber(tp2)} IDR\n- TP3: ${formatNumber(tp3)} IDR\n\n` +
      `📈 MA (5): ${typeof ma === 'number' ? formatNumber(ma) : ma}\n` +
      `📊 RSI (5): ${typeof rsi === 'number' ? rsi : rsi}\n` +
      `${dominance}\n${buyAlert}\n\n${status}${alertStatus}`;

    ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error analysis:', error.message);
    ctx.reply(`⚠️ Koin "${coin}" tidak ditemukan di Indodax.`);
  }
});

// ============ 🏁 Mulai Bot ============
bot.launch();
console.log('🤖 Bot berjalan... Siap menerima foto atau teks!');
