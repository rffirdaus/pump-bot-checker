const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sharp = require('sharp');
const Vibrant = require('node-vibrant');

// Ganti token dengan punyamu
const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw');

// Ambil file dari Telegram
async function downloadPhoto(fileId, bot) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const res = await fetch(fileLink.href);
  const buffer = await res.buffer();
  return buffer;
}

// Generate SVG gradien dari 2 warna
function generateGradientSvg(primary, secondary, width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${secondary}" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  `);
}

// Proses gambar + tambah gradien
async function applyGradient(buffer) {
  const resized = await sharp(buffer).resize(800, 800).toBuffer();
  const palette = await Vibrant.from(resized).getPalette();

  const primary = palette.Vibrant?.getHex() || '#333333';
  const secondary = palette.Muted?.getHex() || '#777777';

  const gradient = generateGradientSvg(primary, secondary, 800, 800);

  return sharp(resized)
    .composite([{ input: gradient, blend: 'overlay' }])
    .toBuffer();
}

// Handle kiriman foto dari user
bot.on('photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo.pop().file_id;
    const originalImage = await downloadPhoto(fileId, bot);
    const editedImage = await applyGradient(originalImage);

    await ctx.replyWithPhoto({ source: editedImage }, { caption: '✨ Sudah dikasih sentuhan gradien sesuai nuansa fotomu!' });
  } catch (err) {
    console.error('❌ Error:', err);
    ctx.reply('Oops! Gagal mengedit foto.');
  }
});

bot.launch();
console.log('🤖 Bot aktif! Kirim foto ke bot untuk melihat efek gradien otomatis.');
