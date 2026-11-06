import { initDatabase, dbConfig } from '../config/db.js';

async function main() {
  console.log('========================================================');
  console.log('⚡ Menginisialisasi Database MySQL KasirKu...');
  console.log(`Target: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('========================================================');

  const success = await initDatabase();

  if (success) {
    console.log('✅ Inisialisasi Database dan Seed Berhasil!');
    process.exit(0);
  } else {
    console.error('❌ Inisialisasi Database Gagal.');
    console.error('Pastikan service MySQL Anda aktif dan kredensial di file .env sudah sesuai.');
    process.exit(1);
  }
}

main();

