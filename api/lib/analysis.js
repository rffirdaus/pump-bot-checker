const axios = require('axios');
const { RSI } = require('technicalindicators');
const coinIdMap = require('../data/coinIdMap.json');  // Import coinIdMap hasil sinkronisasi

// Fungsi untuk mengambil data harga dari CoinGecko
const getCoinGeckoData = async (coinId) => {
  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=idr&days=30`);
    return data;
  } catch (error) {
    console.error('❌ Gagal mengambil data dari CoinGecko:', error.message);
    return null;
  }
};

// Fungsi untuk menghitung RSI berdasarkan harga penutupan
const calculateRSI = (prices) => {
  const closePrices = prices.map((price) => price[1]);  // Ambil hanya harga penutupan
  const rsi = RSI.calculate({ values: closePrices, period: 14 });
  return rsi[rsi.length - 1];  // Ambil RSI terbaru
};

// Fungsi untuk mendapatkan rekomendasi harga masuk dan take profit
const getRecommendation = (rsi, lastPrice) => {
  let recommendation = '💡 Tidak ada rekomendasi saat ini';

  if (rsi > 70) {
    recommendation = `🔴 Overbought! Hindari beli, harga mungkin akan turun. Take Profit di harga: *${(lastPrice * 0.9).toFixed(2)}*`;
  } else if (rsi < 30) {
    recommendation = `🟢 Oversold! Waktu yang baik untuk beli, harga mungkin akan naik. Buy di harga: *${(lastPrice * 1.1).toFixed(2)}*`;
  } else {
    recommendation = `🟡 RSI normal, pertimbangkan kondisi pasar sebelum membeli.`;
  }

  return recommendation;
};

// Fungsi utama untuk analisis dan rekomendasi koin
const analyzeCoin = async (symbol, ticker) => {
  const coinId = coinIdMap[symbol];
  if (!coinId) {
    console.log(`⚠️ Koin ${symbol} tidak ditemukan di CoinGecko`);
    return null;
  }

  // Ambil data harga dan volume dari CoinGecko untuk analisis
  const coinData = await getCoinGeckoData(coinId);
  if (!coinData) {
    return null;
  }

  // Hitung RSI dari data harga terakhir (30 hari)
  const rsi = calculateRSI(coinData.prices);
  const lastPrice = parseFloat(ticker.last);

  // Dapatkan rekomendasi berdasarkan RSI dan harga
  const recommendation = getRecommendation(rsi, lastPrice);

  // Buat pesan analisis
  const msg = `
    🪙 Koin: *${symbol.toUpperCase()}*
    💰 Harga Terbaru: *${lastPrice}*
    📈 RSI: *${rsi.toFixed(2)}*
    ${recommendation}
  `;

  return msg;
};

module.exports = {
  analyzeCoin,
};
