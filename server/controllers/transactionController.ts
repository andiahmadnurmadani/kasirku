import { Request, Response } from 'express';
import { getPool, checkOrReconnectDb, dbConfig } from '../config/db.js';

export interface TransactionItemResponse {
  id: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export interface TransactionResponse {
  id?: number;
  orderId: string;
  date: string;
  time: string;
  customer: string;
  cashier: string;
  items: TransactionItemResponse[];
  subtotal: number;
  tax: number;
  total: number;
  method: 'cash' | 'qris' | 'debit';
  cashGiven?: number;
  change?: number;
  status: 'Selesai' | 'Dibatalkan';
}

/**
 * Helper untuk memformat satu row transaksi beserta list itemnya
 */
function formatTransactionRecord(row: any, items: any[]): TransactionResponse {
  return {
    id: Number(row.id),
    orderId: row.order_id,
    date: row.date,
    time: row.time,
    customer: row.customer,
    cashier: row.cashier || 'Kasir 01 (Siti)',
    items: items.map((it) => ({
      id: Number(it.product_id || it.id),
      name: it.name,
      price: Number(it.price),
      qty: Number(it.qty),
      image: it.image || undefined,
    })),
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    method: row.method as 'cash' | 'qris' | 'debit',
    cashGiven: row.cash_given !== null && row.cash_given !== undefined ? Number(row.cash_given) : undefined,
    change: row.change_amount !== null && row.change_amount !== undefined ? Number(row.change_amount) : undefined,
    status: row.status as 'Selesai' | 'Dibatalkan',
  };
}

/**
 * GET /api/transactions
 * Mendapatkan semua riwayat transaksi beserta detail itemnya
 */
export async function getTransactions(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: `Database MySQL belum terhubung di ${dbConfig.host}:${dbConfig.port}. Pastikan service MySQL sudah aktif (Laragon / XAMPP).`,
      });
    }

    const { search, method, status } = req.query;
    const pool = getPool();

    let query = 'SELECT * FROM `transactions` WHERE 1=1';
    const params: any[] = [];

    if (method && method !== 'all') {
      query += ' AND method = ?';
      params.push(method);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (order_id LIKE ? OR customer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const [trxRows]: any = await pool.query(query, params);

    if (trxRows.length === 0) {
      return res.json({
        success: true,
        total: 0,
        data: [],
      });
    }

    const trxIds = trxRows.map((r: any) => r.id);
    const [itemRows]: any = await pool.query(
      `SELECT * FROM \`transaction_items\` WHERE transaction_id IN (?) ORDER BY id ASC`,
      [trxIds]
    );

    // Kelompokkan item berdasarkan transaction_id
    const itemsByTrxId: Record<number, any[]> = {};
    for (const it of itemRows) {
      if (!itemsByTrxId[it.transaction_id]) {
        itemsByTrxId[it.transaction_id] = [];
      }
      itemsByTrxId[it.transaction_id].push(it);
    }

    const formattedData: TransactionResponse[] = trxRows.map((trx: any) => {
      const items = itemsByTrxId[trx.id] || [];
      return formatTransactionRecord(trx, items);
    });

    return res.json({
      success: true,
      total: formattedData.length,
      data: formattedData,
    });
  } catch (error: any) {
    console.error('Error getTransactions:', error.message);
    const isConnErr = error.code === 'ECONNREFUSED' || error.syscall === 'connect';
    return res.status(isConnErr ? 503 : 500).json({
      success: false,
      code: error.code || 'DB_ERROR',
      message: isConnErr
        ? `Koneksi database terputus (${dbConfig.host}:${dbConfig.port})`
        : 'Gagal mengambil data transaksi',
      error: error.message,
    });
  }
}

/**
 * GET /api/transactions/:identifier
 * Ambil transaksi berdasarkan id numerik atau order_id (TRX-xxxxxx)
 */
export async function getTransactionById(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Database MySQL belum terhubung.',
      });
    }

    const { identifier } = req.params;
    const pool = getPool();

    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric
      ? 'SELECT * FROM `transactions` WHERE id = ?'
      : 'SELECT * FROM `transactions` WHERE order_id = ?';

    const [rows]: any = await pool.query(query, [identifier]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan',
      });
    }

    const trx = rows[0];
    const [items]: any = await pool.query(
      'SELECT * FROM `transaction_items` WHERE transaction_id = ? ORDER BY id ASC',
      [trx.id]
    );

    return res.json({
      success: true,
      data: formatTransactionRecord(trx, items),
    });
  } catch (error: any) {
    console.error('Error getTransactionById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail transaksi',
      error: error.message,
    });
  }
}

/**
 * POST /api/transactions
 * Membuat transaksi baru dari kasir POS
 */
export async function createTransaction(req: Request, res: Response) {
  // 1. Validasi kesiapan koneksi MySQL terlebih dahulu
  const isReady = await checkOrReconnectDb();
  if (!isReady) {
    return res.status(503).json({
      success: false,
      code: 'ECONNREFUSED',
      message: `Database MySQL belum aktif di ${dbConfig.host}:${dbConfig.port}. Silakan nyalakan MySQL di Laragon atau XAMPP.`,
    });
  }

  const pool = getPool();
  let conn = null;

  try {
    const {
      orderId,
      date,
      time,
      customer,
      cashier,
      items,
      subtotal,
      tax,
      total,
      method,
      cashGiven,
      change,
      status,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaksi harus memiliki minimal 1 item belanja',
      });
    }

    const now = new Date();
    const finalOrderId = orderId || `TRX-${Date.now().toString().slice(-6)}`;
    const finalDate = date || now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const finalTime = time || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const finalCustomer = customer || 'Pelanggan Umum';
    const finalCashier = cashier || 'Kasir 01 (Siti)';
    const finalMethod = method || 'cash';
    const finalStatus = status || 'Selesai';

    const calculatedSubtotal = subtotal !== undefined
      ? Number(subtotal)
      : items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.qty || 1)), 0);

    const calculatedTax = tax !== undefined
      ? Number(tax)
      : Math.round(calculatedSubtotal * 0.1);

    const calculatedTotal = total !== undefined
      ? Number(total)
      : calculatedSubtotal + calculatedTax;

    const parsedCashGiven = finalMethod === 'cash' && cashGiven !== undefined ? Number(cashGiven) : null;
    const parsedChange = finalMethod === 'cash' && change !== undefined ? Number(change) : null;

    // Gunakan DB Transaction agar penyimpanan header & items bersifat atomik (ACID)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [trxResult]: any = await conn.query(
      `INSERT INTO \`transactions\` 
      (\`order_id\`, \`date\`, \`time\`, \`customer\`, \`cashier\`, \`subtotal\`, \`tax\`, \`total\`, \`method\`, \`cash_given\`, \`change_amount\`, \`status\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalOrderId,
        finalDate,
        finalTime,
        finalCustomer,
        finalCashier,
        calculatedSubtotal,
        calculatedTax,
        calculatedTotal,
        finalMethod,
        parsedCashGiven,
        parsedChange,
        finalStatus,
      ]
    );

    const transactionId = trxResult.insertId;

    // Insert detail items
    for (const item of items) {
      await conn.query(
        `INSERT INTO \`transaction_items\` (\`transaction_id\`, \`product_id\`, \`name\`, \`price\`, \`qty\`, \`image\`)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.id || null,
          item.name,
          Number(item.price) || 0,
          Number(item.qty) || 1,
          item.image || null,
        ]
      );
    }

    await conn.commit();

    const responseData: TransactionResponse = {
      id: transactionId,
      orderId: finalOrderId,
      date: finalDate,
      time: finalTime,
      customer: finalCustomer,
      cashier: finalCashier,
      items: items.map((it: any) => ({
        id: Number(it.id || 0),
        name: it.name,
        price: Number(it.price),
        qty: Number(it.qty || 1),
        image: it.image,
      })),
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: calculatedTotal,
      method: finalMethod,
      cashGiven: parsedCashGiven !== null ? parsedCashGiven : undefined,
      change: parsedChange !== null ? parsedChange : undefined,
      status: finalStatus,
    };

    return res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan ke MySQL',
      data: responseData,
    });
  } catch (error: any) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('Error createTransaction:', error.message);
    const isConnErr = error.code === 'ECONNREFUSED' || error.syscall === 'connect';
    return res.status(isConnErr ? 503 : 500).json({
      success: false,
      code: error.code || 'DB_ERROR',
      message: isConnErr
        ? `Database MySQL terputus saat menyimpan (${dbConfig.host}:${dbConfig.port})`
        : 'Gagal memproses transaksi ke database',
      error: error.message,
    });
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {}
    }
  }
}

/**
 * PATCH /api/transactions/:id/status
 * Batalkan transaksi (Ubah status jadi Dibatalkan)
 */
export async function updateTransactionStatus(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Database MySQL belum terhubung.',
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['Selesai', 'Dibatalkan'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status hanya boleh "Selesai" atau "Dibatalkan"',
      });
    }

    const pool = getPool();
    // Pisahkan pencarian id numerik vs order_id (TRX-xxxx): MySQL 8 strict mode
    // menolak membandingkan kolom INT dengan string non-numerik ("Truncated incorrect DOUBLE value").
    const isNumeric = /^\d+$/.test(id);
    const [result]: any = await pool.query(
      isNumeric
        ? 'UPDATE `transactions` SET `status` = ? WHERE id = ?'
        : 'UPDATE `transactions` SET `status` = ? WHERE order_id = ?',
      [status, isNumeric ? Number(id) : id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      message: `Status transaksi berhasil diubah menjadi ${status}`,
    });
  } catch (error: any) {
    console.error('Error updateTransactionStatus:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status transaksi',
      error: error.message,
    });
  }
}

/**
 * GET /api/transactions/summary/stats
 * Ringkasan data analitik penjualan (Total Revenue, Transaksi, Items, Metode Bayar)
 */
export async function getTransactionSummary(_req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Database MySQL belum terhubung.',
      });
    }

    const pool = getPool();

    const [trxRows]: any = await pool.query(
      "SELECT total, method, status FROM `transactions` WHERE status = 'Selesai'"
    );

    const [itemRows]: any = await pool.query(`
      SELECT SUM(ti.qty) as total_items 
      FROM \`transaction_items\` ti
      JOIN \`transactions\` t ON t.id = ti.transaction_id
      WHERE t.status = 'Selesai'
    `);

    const totalRevenue = trxRows.reduce((acc: number, curr: any) => acc + Number(curr.total), 0);
    const totalCount = trxRows.length;
    const totalItems = Number(itemRows[0]?.total_items || 0);
    const cashCount = trxRows.filter((t: any) => t.method === 'cash').length;
    const nonCashCount = trxRows.filter((t: any) => t.method !== 'cash').length;
    const avgBasket = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        totalCount,
        totalItems,
        cashCount,
        nonCashCount,
        avgBasket,
      },
    });
  } catch (error: any) {
    console.error('Error getTransactionSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil ringkasan transaksi',
      error: error.message,
    });
  }
}
