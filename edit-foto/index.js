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

// Proses gambar dengan efek cinematic
async function applyCinematicEffect(buffer) {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // 1. Color grading (sedikit lebih warm & contrast)
  const graded = await image
    .modulate({
      brightness: 0.95, // sedikit gelapin
      saturation: 1.2,   // lebih vivid
      hue: 10            // kasih tone agak warm
    })
    .linear(1.1, -10)    // tingkatkan kontras
    .toBuffer();

  // 2. Tambah cinematic black bars (letterbox)
  const blackBarHeight = Math.floor(metadata.width * 0.1); // 10% tinggi untuk black bar
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

// Handle kiriman foto dari user
bot.on('photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo.pop().file_id;
    const originalImage = await downloadPhoto(fileId, bot);
    const editedImage = await applyCinematicEffect(originalImage);

    await ctx.replyWithPhoto({ source: editedImage }, { caption: '🎬 Sudah diubah jadi foto bergaya cinematic!' });
  } catch (err) {
    console.error('❌ Error:', err);
    ctx.reply('Oops! Gagal mengedit foto.');
  }
});

// Mulai bot
bot.launch();
console.log('🤖 Bot aktif! Kirim foto ke bot untuk melihat efek cinematic otomatis.');
