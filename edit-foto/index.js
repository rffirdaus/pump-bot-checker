const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sharp = require('sharp');

// Ganti token dengan punyamu
const bot = new Telegraf('7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw');

// Ambil file dari Telegram
async function downloadPhoto(fileId, bot) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const res = await fetch(fileLink.href);
  const buffer = await res.buffer();
  return buffer;
}

// Generate SVG gradien dari 2 warna dengan opasitas halus
function generateGradientSvg(primary, secondary, width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${secondary}" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  `);
}

// Proses gambar + tambah gradien tanpa resize
async function applyGradient(buffer) {
  // Tidak ada resizing, tetap pakai ukuran asli gambar
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const primary = '#FF7F50';  // Warna utama (Coral, warna lembut)
  const secondary = '#98FB98';  // Warna sekunder (Pale Green)

  const gradient = generateGradientSvg(primary, secondary, metadata.width, metadata.height);

  // Terapkan gradien pada gambar tanpa mengubah ukuran
  const finalImage = await image
    .composite([{ input: gradient, blend: 'overlay' }])
    .toBuffer();

  return finalImage;
}

// Handle kiriman foto dari user
bot.on('photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo.pop().file_id;
    const originalImage = await downloadPhoto(fileId, bot);
    const editedImage = await applyGradient(originalImage);

    await ctx.replyWithPhoto({ source: editedImage }, { caption: '✨ Sudah dikasih sentuhan gradien yang lebih natural!' });
  } catch (err) {
    console.error('❌ Error:', err);
    ctx.reply('Oops! Gagal mengedit foto.');
  }
});

bot.launch();
console.log('🤖 Bot aktif! Kirim foto ke bot untuk melihat efek gradien otomatis.');
