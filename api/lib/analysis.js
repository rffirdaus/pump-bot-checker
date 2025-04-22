// Install terlebih dahulu: npm install telegraf axios

const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw');

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
    const price = parseInt(res.data.ticker.last);

    // Simulasi analisis
    const buyZoneLow = Math.floor(price * 0.89);
    const buyZoneHigh = Math.floor(price * 0.94);
    const tp1 = Math.floor(price * 1.03);
    const tp2 = Math.floor(price * 1.08);
    const tp3 = Math.floor(price * 1.13);
    const sl = Math.floor(price * 0.85);

    let status = '';
    if (price < sl) {
      status = '📉 Status: Harga di bawah support, jangan beli dulu.';
    } else if (price >= buyZoneLow && price <= buyZoneHigh) {
      status = '✅ Status: Harga berada di zona beli — kamu bisa mulai cicil beli.';
    } else if (price > buyZoneHigh) {
      status = '⚠️ Status: Harga masih di atas zona beli — tunggu koreksi.';
    } else {
      status = '⚠️ Status: Harga belum masuk zona aman untuk beli.';
    }

    const message = `📊 ANALISIS ${coin.toUpperCase()}/IDR\nHarga sekarang: ${price} IDR\n\n🟦 Buy area: ${buyZoneLow} – ${buyZoneHigh} IDR\n❌ Stop Loss: < ${sl} IDR\n🎯 Target Profit:\n- TP1: ${tp1} IDR\n- TP2: ${tp2} IDR\n- TP3: ${tp3} IDR\n\n${status}`;

    ctx.reply(message);
  } catch (error) {
    ctx.reply(`Koin \"${coin}\" tidak ditemukan di Indodax.`);
  }
});

bot.launch();
console.log('Bot sedang berjalan...');
