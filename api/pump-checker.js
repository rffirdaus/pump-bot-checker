const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833", "1379981451"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};
let priceHistory = {}; // For multi-timeframe & patterns

// RSI Calculation
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

function calculateMA(data, period = 9) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((acc, val) => acc + val, 0) / period;
}

function detectBreakout(data) {
  if (data.length < 20) return null;
  const resistance = Math.max(...data.slice(-20, -1));
  return data[data.length - 1] > resistance ? resistance : null;
}

function calculateProbability(score, total) {
  return Math.round((score / total) * 100);
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

      // Init
      if (!priceHistory[symbol]) priceHistory[symbol] = [];
      priceHistory[symbol].push(lastPrice);
      if (priceHistory[symbol].length > 100) priceHistory[symbol].shift();

      const rsi = calculateRSI(priceHistory[symbol]);
      const ma9 = calculateMA(priceHistory[symbol], 9);
      const ma21 = calculateMA(priceHistory[symbol], 21);
      const maCrossUp = ma9 && ma21 && ma9 > ma21;
      const breakout = detectBreakout(priceHistory[symbol]);

      // Scoring
      const conditions = [
        changePercent >= 5,
        volumeSpike >= 100,
        rsi >= 70,
        maCrossUp,
        !!breakout,
        spread < 100
      ];
      const score = conditions.filter(Boolean).length;
      const probability = calculateProbability(score, conditions.length);

      // Signal
      if (score >= 4) {
        let msg = `🚀 *PUMP TERDETEKSI!*

🪙 Koin: *${coinName}*
💰 Harga Terbaru: *${lastPrice}*
📈 Kenaikan: *${changePercent.toFixed(2)}%*
📊 Volume Spike: *${volumeSpike.toFixed(2)}%*
📈 RSI: *${rsi ? rsi.toFixed(2) : '-'}*
📐 MA9: *${ma9?.toFixed(2)}*, MA21: *${ma21?.toFixed(2)}*${maCrossUp ? ' (📈 MA CROSS UP)' : ''}
📉 Spread: *${spread}*
🎯 *Kemungkinan Pump: ${probability}%*`;

        if (breakout) {
          msg += `\n📊 *BREAKOUT!* Harga melewati resistance sebelumnya di *${breakout}*`;
        }

        let risk = '', advice = '';
        if (spread < 50) {
          risk = '🟢 *Risiko Rendah*';
          advice = '✅ *Layak dibeli*';
        } else if (spread < 200) {
          risk = '🟡 *Risiko Sedang*';
          advice = '⚠️ *Hati-hati saat beli*';
        } else {
          risk = '🔴 *Risiko Tinggi*';
          advice = '🚫 *Tidak disarankan entry sekarang*';
        }

        msg += `\n\n📊 ${risk}\n${advice}`;

        const tp = Math.round(buyPrice * (1 + probability / 200));
        const sl = Math.round(buyPrice * 0.97);

        msg += `\n\n🎯 *Strategi Perdagangan:*
- Entry: < *${buyPrice}*
- SL: *${sl}*
- TP Potensial: *${tp}*`;

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        }

        result.push(msg);
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
