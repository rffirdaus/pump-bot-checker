// Pastikan impor axios dan fs berada di bagian atas
const axios = require('axios'); // Mengimpor axios untuk melakukan request HTTP
const fs = require('fs');         // Mengimpor fs untuk menulis file
const path = require('path');     // Mengimpor path untuk mengelola path file

// Fungsi untuk melakukan sinkronisasi data coin
const syncCoinMap = async () => {
  try {
    // Mengambil data dari Indodax API
    const { data: indodaxData } = await axios.get('https://indodax.com/api/tickers');
    const indodaxCoins = Object.keys(indodaxData.tickers); // ['btcidr', 'ethidr', ...]

    // Mengambil data dari CoinGecko API
    const { data: geckoCoins } = await axios.get('https://api.coingecko.com/api/v3/coins/list');

    // Proses pemetaan berdasarkan symbol
    const mapped = {};
    for (const symbolIdr of indodaxCoins) {
      const symbol = symbolIdr.replace('idr', '').toLowerCase(); // Menghapus 'idr' dan menyesuaikan huruf kecil
      const match = geckoCoins.find(
        (coin) => coin.symbol.toLowerCase() === symbol
      );

      if (match) {
        mapped[symbolIdr] = match.id; // Jika ditemukan, simpan id CoinGecko ke dalam mapped
      }
    }

    // Menyimpan hasil pemetaan ke file JSON
    const filePath = path.join(__dirname, '../data/coinIdMap.json');
    fs.writeFileSync(filePath, JSON.stringify(mapped, null, 2)); // Menulis hasil pemetaan ke file

    console.log(`✅ Sukses sinkronisasi ${Object.keys(mapped).length} koin!`);
  } catch (error) {
    console.error('❌ Gagal sinkronisasi:', error.message);
  }
};

// Menjalankan sinkronisasi jika script dipanggil langsung
if (require.main === module) {
  syncCoinMap();
}

// Mengeksport fungsi sinkronisasi untuk digunakan di file lain
module.exports = syncCoinMap;
