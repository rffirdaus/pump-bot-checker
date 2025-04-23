const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = "7531708117:AAG8zzE8TEGrS05Qq385g_8L0MBtiE6BdIw";
const CHAT_IDS = ["903532698", "1272569833", "1379981451"];
const bot = new TelegramBot(TELEGRAM_TOKEN);

let lastPrices = {};
let lastVolumes = {};
let rsiData = {};
let maData = {};
let macdHistory = {};

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
}

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
  const slice = data.slice(-period);
  return slice.reduce((acc, val) => acc + val, 0) / period;
}

function detectBreakout(closes) {
  if (closes.length < 20) return null;
  const recentHigh = Math.max(...closes.slice(-20, -1));
  const latest = closes[closes.length - 1];
  return latest > recentHigh ? recentHigh : null;
}

function calculateMACD(closes, symbol, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  if (closes.length < longPeriod + signalPeriod) return null;

  const shortEMA = calculateEMA(closes.slice(-longPeriod - signalPeriod), shortPeriod);
  const longEMA = calculateEMA(closes.slice(-longPeriod - signalPeriod), longPeriod);
  const macdLine = shortEMA.map((val, idx) => val - longEMA[idx]);

  const signalLine = calculateEMA(macdLine.slice(-signalPeriod), signalPeriod);
  const latestMACD = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];

  macdHistory[symbol] = macdLine;

  return { macd: latestMACD, signal: latestSignal };
}

async function sendMessageToAllChats(message) {
  for (const chatId of CHAT_IDS) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`Failed to send message to chat ${chatId}:`, err.message);
    }
  }
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
      const volumeSpike = prevVolume > 0 ? ((lastVolume - prevVolume) / prevVolume) * 100 : 0;

      const buyPrice = parseFloat(ticker.buy);
      const sellPrice = parseFloat(ticker.sell);
      const spread = sellPrice - buyPrice;
      const coinName = symbol.replace('idr', '').toUpperCase() + '/IDR';

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
      const macdData = calculateMACD(maData[symbol], symbol);
      const macd = macdData ? macdData.macd : 0;

      const pumpScore = (
        (changePercent >= 4 ? 1 : 0) +
        (volumeSpike >= 70 ? 1 : 0) +
        (rsi >= 65 ? 1 : 0) +
        (isMAcrossUp ? 1 : 0) +
        (macd > 0 ? 1 : 0)
      );

      const probability = (pumpScore / 5) * 100;

      if (changePercent >= 9) {
        if (pumpScore === 2) {
          let msg = `📡 *Koin Mendekati Pump!*\n\n🪙 *${coinName}*\n💰 Harga: *${lastPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*\n📊 Volume: *${volumeSpike.toFixed(2)}%*\n📐 RSI: *${rsi?.toFixed(2) || '-'}*`;
  
          if (isMAcrossUp) msg += `\n📐 *MA Cross Up terdeteksi!*`;
          if (breakoutLevel) msg += `\n📊 *Level breakout di* ${breakoutLevel}`;
          msg += `\n\n⚠️ Belum ada konfirmasi penuh, tapi ada indikasi awal.\nPantau terus dan siapkan strategi.`;
  
          await sendMessageToAllChats(msg);
        }
  
        if (pumpScore >= 3) {
          let msg = `🚀 *PUMP TERDETEKSI!*\n\n🪙 *${coinName}*\n💰 Harga: *${lastPrice}*\n📈 Kenaikan: *${changePercent.toFixed(2)}%*\n📊 Volume: *${volumeSpike.toFixed(2)}%*\n📐 RSI: *${rsi?.toFixed(2) || '-'}*\n📉 Spread: *${spread}*\n📐 MA9: *${ma9?.toFixed(2)}*, MA21: *${ma21?.toFixed(2)}*${isMAcrossUp ? ' (📈 MA CROSS UP)' : ''}`;
  
          if (breakoutLevel) {
            msg += `\n📊 *BREAKOUT!* Harga melewati resistance sebelumnya di *${breakoutLevel}*`;
          }
  
          msg += `\n\n📊 *Skor Probabilitas Pump: ${probability.toFixed(0)}%*`;
  
          let spreadRisk = '', rekomendasi = '';
          if (spread <= 50) {
            spreadRisk = '🟢 *Risiko Rendah*';
            rekomendasi = '✅ *Layak dibeli*';
          } else if (spread <= 200) {
            spreadRisk = '🟡 *Risiko Sedang*';
            rekomendasi = '⚠️ *Hati-hati saat entry*';
          } else {
            spreadRisk = '🔴 *Risiko Tinggi*';
            rekomendasi = '🚫 *Tidak disarankan entry*';
          }
  
          msg += `\n\n📊 ${spreadRisk}\n${rekomendasi}`;
  
          let tp1, tp2, tp3, sl;
          if (probability >= 80) {
            tp1 = Math.round(buyPrice * 1.05);
            tp2 = Math.round(buyPrice * 1.10);
            tp3 = Math.round(buyPrice * 1.15);
            sl = Math.round(buyPrice * 0.95);
          } else if (probability >= 60) {
            tp1 = Math.round(buyPrice * 1.03);
            tp2 = Math.round(buyPrice * 1.07);
            tp3 = Math.round(buyPrice * 1.10);
            sl = Math.round(buyPrice * 0.97);
          } else {
            tp1 = Math.round(buyPrice * 1.02);
            tp2 = Math.round(buyPrice * 1.05);
            tp3 = Math.round(buyPrice * 1.10);
            sl = Math.round(buyPrice * 0.98);
          }
  
          msg += `\n\n🎯 *Strategi Trading:*\n- Entry: < *${buyPrice}*\n- SL: *${sl}*\n- TP 2%: *${tp1}*\n- TP 5%: *${tp2}*\n- TP 10%: *${tp3}*`;
  
          await sendMessageToAllChats(msg);
          result.push(msg);
        }
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
