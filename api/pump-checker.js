const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};
let rsiData = {};
let maData = {};

// Helper RSI function
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Moving Average
function calculateMA(data, period = 9) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((acc, val) => acc + val, 0) / period;
}

// Simple Breakout Detection
function detectBreakout(closes) {
  if (closes.length < 20) return null;
  const recentHigh = Math.max(...closes.slice(-20, -1));
  const latest = closes[closes.length - 1];
  return latest > recentHigh ? recentHigh : null;
}

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
      const volumeSpike = ((lastVolume - prevVolume) / (prevVolume || 1)) * 100;

      const buyPrice = parseFloat(ticker.buy);
      const sellPrice = parseFloat(ticker.sell);
      const spread = sellPrice - buyPrice;

      const coinName = symbol.replace('idr', '').toUpperCase() + '/IDR';

      // Update history data
      if (!rsiData[symbol]) rsiData[symbol] = [];
      if (!maData[symbol]) maData[symbol] = [];
      rsiData[symbol].push(lastPrice);
      maData[symbol].push(lastPrice);
      if (rsiData[symbol].length > 100) rsiData[symbol].shift();
      if (maData[symbol].length > 100) maData[symbol].shift();

      const rsi = calculateRSI(rsiData[symbol]);
      const ma9 = calculateMA(maData[symbol], 9);
      const ma21 = calculateMA(maData[symbol], 21);
      const isMAcrossUp = ma9 && ma21 && ma9 > ma21;

      const breakoutLevel = detectBreakout(maData[symbol]);

      const pumpScore = (
        (changePercent >= 5 ? 1 : 0) +
        (volumeSpike >= 100 ? 1 : 0) +
        (rsi >= 70 ? 1 : 0) +
        (isMAcrossUp ? 1 : 0)
      );

      if (pumpScore >= 1) {
        let pumpMsg = `🚀 *PUMP TERDETEKSI!*

🪙 Koin: *${coinName}*
💰 Harga Terbaru: *${lastPrice}*
📈 Kenaikan: *${changePercent.toFixed(2)}%*
📊 Volume Spike: *${volumeSpike.toFixed(2)}%*
📈 RSI: *${rsi ? rsi.toFixed(2) : '-'}*
📉 Spread: *${spread}*
📐 MA9: *${ma9?.toFixed(2)}*, MA21: *${ma21?.toFixed(2)}*${isMAcrossUp ? ' (📈 MA CROSS UP)' : ''}`;

        if (breakoutLevel) {
          pumpMsg += `\n📊 *BREAKOUT!* Harga melewati resistance sebelumnya di *${breakoutLevel}*`;
        }

        let spreadRisk = '', rekomendasi = '';
        if (spread <= 50) {
          spreadRisk = '🟢 *Risiko Rendah*';
          rekomendasi = '✅ *Layak dibeli*';
        } else if (spread <= 200) {
          spreadRisk = '🟡 *Risiko Sedang*';
          rekomendasi = '⚠️ *Hati-hati saat beli*';
        } else {
          spreadRisk = '🔴 *Risiko Tinggi*';
          rekomendasi = '🚫 *Tidak disarankan entry sekarang*';
        }

        pumpMsg += `\n\n📊 ${spreadRisk}\n${rekomendasi}`;

        const tp1 = Math.round(buyPrice * 1.02);
        const tp2 = Math.round(buyPrice * 1.05);
        const tp3 = Math.round(buyPrice * 1.10);
        const sl = Math.round(buyPrice * 0.97);

        pumpMsg += `\n\n🎯 *Strategi Perdagangan:*\n- Entry: < *${buyPrice}*\n- SL: *${sl}*\n- TP Aman (2%): *${tp1}*\n- TP Sedang (5%): *${tp2}*\n- TP Risky (10%): *${tp3}*`;

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, pumpMsg, { parse_mode: "Markdown" });
        }

        result.push(pumpMsg);
      }

      lastPrices[symbol] = lastPrice;
      lastVolumes[symbol] = lastVolume;
    }

    res.status(200).json({ status: 'ok', message: result });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
