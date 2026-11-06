import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { httpLogger } from './middleware/logger.js';
import { initDatabase, isDbConnected, dbConfig } from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Logging dengan Morgan
app.use(httpLogger);

// Middleware CORS & Body Parser
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected(),
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port,
    },
    version: '2.4.0',
    service: 'KasirKu POS API Backend',
  });
});

// Daftarkan Routes API KasirKu
const apiRouters: Array<[string, express.Router]> = [
  ['/api/products', productRoutes],
  ['/api/transactions', transactionRoutes],
  ['/api/categories', categoryRoutes],
];
for (const [basePath, router] of apiRouters) {
  app.use(basePath, router);
}

// Keterangan singkat tiap endpoint untuk log saat server menyala
const endpointDescriptions: Record<string, string> = {
  'GET /api/health': 'Status server & koneksi MySQL',
  'GET /api/products': 'Daftar produk (?category, ?search, ?popular)',
  'GET /api/products/:id': 'Detail satu produk',
  'POST /api/products': 'Tambah produk',
  'PUT /api/products/:id': 'Ubah produk',
  'DELETE /api/products/:id': 'Hapus produk',
  'GET /api/transactions': 'Riwayat transaksi (?search, ?method, ?status)',
  'GET /api/transactions/summary/stats': 'Ringkasan omset & statistik',
  'GET /api/transactions/:identifier': 'Detail transaksi (id atau TRX-...)',
  'POST /api/transactions': 'Simpan transaksi baru',
  'PATCH /api/transactions/:id/status': 'Ubah status (Selesai/Dibatalkan)',
  'GET /api/categories': 'Daftar kategori + jumlah produk',
  'GET /api/categories/:id': 'Detail satu kategori',
  'POST /api/categories': 'Tambah kategori',
  'PUT /api/categories/:id': 'Ubah kategori (produk ikut pindah)',
  'DELETE /api/categories/:id': 'Hapus kategori (ditolak bila masih dipakai)',
};

/**
 * Kumpulkan semua endpoint langsung dari router Express,
 * sehingga endpoint baru otomatis ikut tampil di log.
 */
function collectEndpoints(): Array<{ method: string; path: string }> {
  const endpoints: Array<{ method: string; path: string }> = [];
  const addRoutes = (stack: any[], basePath: string) => {
    for (const layer of stack) {
      if (!layer.route) continue;
      const routePath = layer.route.path === '/' ? '' : layer.route.path;
      for (const method of Object.keys(layer.route.methods)) {
        endpoints.push({ method: method.toUpperCase(), path: `${basePath}${routePath}` || '/' });
      }
    }
  };
  addRoutes((app as any)._router?.stack ?? [], '');
  for (const [basePath, router] of apiRouters) {
    addRoutes((router as any).stack ?? [], basePath);
  }
  return endpoints;
}

// Fallback Route untuk 404 Not Found
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
});

// Centralized Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server',
  });
});

// Jalankan Server & Inisialisasi Database
async function startServer() {
  console.log('------------------------------------------------------------');
  console.log('🚀 Memulai KasirKu POS Backend Server...');
  console.log('------------------------------------------------------------');

  // Inisialisasi koneksi dan tabel MySQL secara otomatis
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`✅ KasirKu Backend berjalan di http://localhost:${PORT}`);
    const endpoints = collectEndpoints();
    const urlWidth = Math.max(...endpoints.map((e) => `http://localhost:${PORT}${e.path}`.length));
    console.log(`📡 Semua Endpoint API (${endpoints.length}):`);
    for (const { method, path } of endpoints) {
      const url = `http://localhost:${PORT}${path}`;
      const desc = endpointDescriptions[`${method} ${path}`];
      console.log(`   ${method.padEnd(6)} ${desc ? url.padEnd(urlWidth) + '  ' + desc : url}`);
    }
    console.log(`📊 Request Logger : Aktif (Morgan middleware)`);
    console.log(`🗄️ Database     : MySQL (${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port})`);
    console.log('------------------------------------------------------------');
  });
}

startServer();

export default app;

