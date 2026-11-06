import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kasirku_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  connectTimeout: 2000,
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastAttemptTime = 0;
let isConnecting = false;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export function isDbConnected(): boolean {
  return isConnected;
}

/**
 * Cek status koneksi atau coba reconnect otomatis jika sedang offline
 */
export async function checkOrReconnectDb(): Promise<boolean> {
  if (isConnected && pool) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      isConnected = false;
    }
  }

  // Hindari spamming reconnect berulang dalam selang waktu < 2 detik
  const now = Date.now();
  if (now - lastAttemptTime < 2000 || isConnecting) {
    return isConnected;
  }

  lastAttemptTime = now;
  return await initDatabase(false);
}

/**
 * Inisialisasi Database dan Tabel Otomatis
 * Membuat database kasirku_db jika belum ada, membuat tabel, dan seeding kategori & produk jika kosong.
 */
export async function initDatabase(logNotice = true): Promise<boolean> {
  if (isConnecting) return isConnected;
  isConnecting = true;

  let bootstrapConnection: mysql.Connection | null = null;
  try {
    // 1. Koneksi awal tanpa menentukan database untuk memastikan DB target exists
    bootstrapConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 2000,
    });

    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await bootstrapConnection.end();
    bootstrapConnection = null;

    // 2. Buat koneksi pool ke database target
    if (pool) {
      try {
        await pool.end();
      } catch {}
      pool = null;
    }
    const currentPool = getPool();

    // 3. Buat Tabel Categories
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`slug\` VARCHAR(50) NOT NULL UNIQUE,
        \`name\` VARCHAR(100) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Buat Tabel Products
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(50) NOT NULL,
        \`price\` INT NOT NULL DEFAULT 0,
        \`popular\` TINYINT(1) NOT NULL DEFAULT 0,
        \`image\` VARCHAR(500) NOT NULL,
        \`desc\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_category\` (\`category\`),
        INDEX \`idx_popular\` (\`popular\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Buat Tabel Transactions
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` VARCHAR(50) NOT NULL UNIQUE,
        \`date\` VARCHAR(50) NOT NULL,
        \`time\` VARCHAR(20) NOT NULL,
        \`customer\` VARCHAR(150) NOT NULL DEFAULT 'Pelanggan Umum',
        \`cashier\` VARCHAR(100) NOT NULL DEFAULT 'Kasir 01 (Siti)',
        \`subtotal\` INT NOT NULL DEFAULT 0,
        \`tax\` INT NOT NULL DEFAULT 0,
        \`total\` INT NOT NULL DEFAULT 0,
        \`method\` ENUM('cash', 'qris', 'debit') NOT NULL DEFAULT 'cash',
        \`cash_given\` INT DEFAULT NULL,
        \`change_amount\` INT DEFAULT NULL,
        \`status\` ENUM('Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Selesai',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_order_id\` (\`order_id\`),
        INDEX \`idx_method\` (\`method\`),
        INDEX \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Buat Tabel Transaction Items
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS \`transaction_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`transaction_id\` INT NOT NULL,
        \`product_id\` INT DEFAULT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`price\` INT NOT NULL DEFAULT 0,
        \`qty\` INT NOT NULL DEFAULT 1,
        \`image\` VARCHAR(500) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_transaction_items_transaction\` 
          FOREIGN KEY (\`transaction_id\`) REFERENCES \`transactions\` (\`id\`) 
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_transaction_items_product\` 
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) 
          ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`idx_transaction_id\` (\`transaction_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Seed Kategori jika kosong
    const [catCount]: any = await currentPool.query('SELECT COUNT(*) as cnt FROM `categories`');
    if (catCount[0]?.cnt === 0) {
      await currentPool.query(`
        INSERT INTO \`categories\` (\`slug\`, \`name\`) VALUES
        ('makanan', 'Makanan'),
        ('minuman', 'Minuman'),
        ('snack', 'Cemilan'),
        ('paket', 'Paket Hemat');
      `);
    }

    // 8. Seed Produk jika kosong
    const [prodCount]: any = await currentPool.query('SELECT COUNT(*) as cnt FROM `products`');
    if (prodCount[0]?.cnt === 0) {
      await currentPool.query(`
        INSERT INTO \`products\` (\`id\`, \`name\`, \`category\`, \`price\`, \`popular\`, \`image\`, \`desc\`) VALUES
        (1, 'Ayam Goreng Lengkuas', 'makanan', 28000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Ayam renyah berempah dengan serundeng lengkuas & sambal'),
        (2, 'Bebek Goreng Sambal Korek', 'makanan', 35000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Bebek empuk goreng garing dengan pedas nendang sambal korek'),
        (3, 'Nasi Goreng Spesial KasirKu', 'makanan', 24000, 1, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Nasi goreng harum wajan dengan telur mata sapi & kerupuk'),
        (4, 'Mie Goreng Seafood Pedas', 'makanan', 26000, 0, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Mie telur kenyal dengan udang, cumi, dan sayuran segar'),
        (5, 'Soto Betawi Daging Sapi', 'makanan', 38000, 0, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Kuah santan susu gurih rempah dengan potongan daging sapi empuk'),
        (6, 'Sate Ayam Madura (10 tsk)', 'makanan', 30000, 0, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Daging ayam bakar empuk dengan bumbu kacang legit khas Madura'),
        (7, 'Es Teh Manis Jumbo', 'minuman', 6000, 1, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg', 'Teh melati seduh segar dingin ukuran jumbo'),
        (8, 'Es Jeruk Peras Segar', 'minuman', 9000, 0, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg', 'Jeruk peras murni kaya vitamin C dengan es batu segar'),
        (9, 'Kopi Susu Gula Aren', 'minuman', 18000, 1, '/src/assets/images/kopi_susu_aren_1793416316788.jpg', 'Espresso robusta & susu creamy dengan sirup aren asli'),
        (10, 'Jus Alpukat Kocok', 'minuman', 16000, 0, '/src/assets/images/kopi_susu_aren_1793416316788.jpg', 'Alpukat mentega kental dengan saus cokelat manis'),
        (11, 'Tahu Cabe Garam Krispi', 'snack', 14000, 1, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Tahu goreng renyah bumbu bawang putih dan cabe rawit cincang'),
        (12, 'Pisang Bakar Keju Cokelat', 'snack', 16000, 0, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Pisang kepok manis bakar dengan parutan keju & meses'),
        (13, 'Tempe Mendoan (4 pcs)', 'snack', 12000, 0, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Tempe berbalut tepung daun bawang gurih cocol sambal kecap'),
        (14, 'Paket Hemat: Ayam + Nasi + Es Teh', 'paket', 35000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Komplit hemat: 1 Ayam Goreng Lengkuas, Nasi Pulen & Es Teh'),
        (15, 'Paket Berdua: 2 Nasi Goreng + 2 Es Teh', 'paket', 50000, 1, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Pilihan pas untuk 2 porsi: Nasi Goreng Spesial + 2 Es Teh');
      `);
    }

    // Catatan: transaksi TIDAK di-seed otomatis agar riwayat hanya berisi transaksi nyata.
    // Data contoh transaksi masih tersedia di database/seed.sql bila ingin di-import manual.

    isConnected = true;
    console.log(`[Database] Terkoneksi ke MySQL "${dbConfig.database}" di ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (error: any) {
    isConnected = false;
    if (logNotice) {
      console.warn(`[Database Info] MySQL di ${dbConfig.host}:${dbConfig.port} belum aktif (${error.code || error.message}).`);
      console.warn(`[Petunjuk] Jalankan MySQL (Laragon/XAMPP) di port ${dbConfig.port}. Backend akan auto-reconnect saat MySQL aktif.`);
    }
    return false;
  } finally {
    isConnecting = false;
    if (bootstrapConnection) {
      try {
        await (bootstrapConnection as mysql.Connection).end();
      } catch {}
    }
  }
}

// Background auto-retry setiap 5 detik jika disconnected
setInterval(async () => {
  if (!isConnected) {
    await initDatabase(false);
  }
}, 5000);
