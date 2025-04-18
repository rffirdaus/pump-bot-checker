const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833", "1379981451"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};
let priceHistory = {};

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

function calculateMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((acc, val) => acc + val, 0) / period;
}

function detectBreakout(closes) {
  if (closes.length < 20) return null;
  const recentHigh = Math.max(...closes.slice(-20, -1));
  const latest = closes[closes.length - 1];
  return latest > recentHigh ? recentHigh : null;
}

function detectBullishEngulfing(closes) {
  if (closes.length < 3) return false;
  const prev = closes[closes.length - 2];
  const curr = closes[closes.length - 1];
  return curr > prev * 1.02;
}

function calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  if (prices.length < longPeriod + signalPeriod) return null;
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    return data.reduce((acc, val, i) => {
      if (i === 0) return [val];
      acc.push(val * k + acc[i - 1] * (1 - k));
      return acc;
    }, []);
  };
  const emaShort = ema(prices.slice(-longPeriod - signalPeriod), shortPeriod);
  const emaLong = ema(prices.slice(-longPeriod - signalPeriod), longPeriod);
  const macdLine = emaShort.map((val, i) => val - emaLong[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const latest = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return latest > signal ? "bullish" : "neutral";
}

module.exports = async (req, res) => {
  try {
    const { data } = await axios.get("https://indodax.com/api/tickers");
    const tickers = data.tickers;
    const result = [];

    for (const [symbol, ticker] of Object.entries(tickers)) {
      const lastPrice = parseFloat(ticker.last);
      const prevPrice = lastPrices[symbol] || lastPrice;
      const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

      const volume = parseFloat(ticker.volume);
      const prevVolume = lastVolumes[symbol] || volume;
      const volumeSpike = ((volume - prevVolume) / (prevVolume || 1)) * 100;

      const buyPrice = parseFloat(ticker.buy);
      const sellPrice = parseFloat(ticker.sell);
      const spread = sellPrice - buyPrice;
      const coinName = symbol.replace("idr", "").toUpperCase() + "/IDR";

      if (!priceHistory[symbol]) priceHistory[symbol] = [];
      priceHistory[symbol].push(lastPrice);
      if (priceHistory[symbol].length > 150) priceHistory[symbol].shift();

      const closes = priceHistory[symbol];
      const rsi = calculateRSI(closes);
      const ma9 = calculateMA(closes, 9);
      const ma21 = calculateMA(closes, 21);
      const macd = calculateMACD(closes);
      const breakout = detectBreakout(closes);
      const engulf = detectBullishEngulfing(closes);

      let score = 0;
      if (changePercent >= 5) score += 25;
      if (volumeSpike >= 100) score += 25;
      if (rsi && rsi >= 70) score += 15;
      if (ma9 && ma21 && ma9 > ma21) score += 10;
      if (breakout) score += 10;
      if (macd === "bullish") score += 10;
      if (engulf) score += 5;

      const pumpProbability = Math.min(100, score);

      if (pumpProbability >= 70) {
        let msg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 Koin: *${coinName}*\n💰 Harga Terbaru: *${lastPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*\n📊 Volume Spike: *${volumeSpike.toFixed(2)}%*\n📈 RSI: *${rsi?.toFixed(2)}*\n📐 MA9: *${ma9?.toFixed(2)}*, MA21: *${ma21?.toFixed(2)}* ${ma9 > ma21 ? "(📈 MA CROSS UP)" : ""}\n📊 MACD: *${macd}*${engulf ? "\n📌 Candlestick: *Bullish Engulfing*" : ""}`;

        if (breakout) {
          msg += `\n📊 *BREAKOUT!* Harga melewati resistance sebelumnya di *${breakout}*`;
        }

        msg += `\n\n🔎 *Kemungkinan pump: ${pumpProbability}%*`;

        let risk = "";
        let rekom = "";
        if (spread <= 50) {
          risk = "🟢 *Risiko Rendah*";
          rekom = "✅ *Layak dibeli*";
        } else if (spread <= 200) {
          risk = "🟡 *Risiko Sedang*";
          rekom = "⚠️ *Hati-hati saat entry*";
        } else {
          risk = "🔴 *Risiko Tinggi*";
          rekom = "🚫 *Tidak disarankan entry*";
        }

        msg += `\n\n${risk}\n${rekom}`;

        const sl = Math.round(buyPrice * 0.97);
        const tp = Math.round(buyPrice * (1 + pumpProbability / 100)); // Dinamis

        msg += `\n\n🎯 *Strategi:* \n- Entry: < *${buyPrice}*\n- SL: *${sl}*\n- TP: *${tp}*`;

        for (const chatId of CHAT_IDS) {
          await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        }

        result.push(msg);
      }

      lastPrices[symbol] = lastPrice;
      lastVolumes[symbol] = volume;
    }

    res.status(200).json({ status: "ok", message: result });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
