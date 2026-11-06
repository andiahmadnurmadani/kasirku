import { Request, Response } from 'express';
import { getPool, checkOrReconnectDb, dbConfig } from '../config/db.js';

export interface MenuItemResponse {
  id: number;
  name: string;
  category: string;
  price: number;
  popular: boolean;
  image: string;
  desc?: string;
}

const DEFAULT_IMAGE = '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg';

/**
 * Validasi data produk. Mengembalikan pesan error (string) atau null bila valid.
 */
async function validateProductInput(input: {
  name: string;
  category: string;
  price: number;
  image: string;
  desc: string | null;
}): Promise<string | null> {
  if (!input.name) return 'Nama produk wajib diisi';
  if (input.name.length > 255) return 'Nama produk maksimal 255 karakter';
  if (!Number.isInteger(input.price) || input.price < 0) return 'Harga harus berupa angka bulat dan tidak boleh negatif';
  if (input.price > 1_000_000_000) return 'Harga terlalu besar';
  if (input.image.length > 500) return 'Alamat gambar maksimal 500 karakter';
  if (!input.category) return 'Kategori wajib dipilih';
  const [cat]: any = await getPool().query('SELECT id FROM `categories` WHERE slug = ?', [input.category]);
  if (cat.length === 0) return `Kategori "${input.category}" tidak terdaftar`;
  return null;
}

/**
 * GET /api/products
 * Mendapatkan semua menu produk dengan dukungan filter category & search
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: `Koneksi database MySQL belum siap di ${dbConfig.host}:${dbConfig.port}. Silakan nyalakan MySQL di Laragon/XAMPP.`,
      });
    }

    const { category, search, popular } = req.query;
    const pool = getPool();

    let query = 'SELECT id, name, category, price, popular, image, `desc` FROM `products` WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR `desc` LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (popular === 'true' || popular === '1') {
      query += ' AND popular = 1';
    }

    query += ' ORDER BY id ASC';

    const [rows]: any = await pool.query(query, params);

    // Format data disesuaikan dengan tipe di frontend
    const products: MenuItemResponse[] = rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      category: row.category,
      price: Number(row.price),
      popular: Boolean(row.popular),
      image: row.image,
      desc: row.desc || '',
    }));

    return res.json({
      success: true,
      total: products.length,
      data: products,
    });
  } catch (error: any) {
    console.error('Error getProducts:', error.message);
    const isConnErr = error.code === 'ECONNREFUSED' || error.syscall === 'connect';
    return res.status(isConnErr ? 503 : 500).json({
      success: false,
      code: error.code || 'DB_ERROR',
      message: isConnErr
        ? `Koneksi database terputus (${dbConfig.host}:${dbConfig.port})`
        : 'Gagal mengambil data produk',
      error: error.message,
    });
  }
}

/**
 * GET /api/products/:id
 * Mendapatkan detail satu produk berdasarkan ID
 */
export async function getProductById(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Koneksi database MySQL belum siap.',
      });
    }

    const { id } = req.params;
    const pool = getPool();

    const [rows]: any = await pool.query(
      'SELECT id, name, category, price, popular, image, `desc` FROM `products` WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    const row = rows[0];
    const product: MenuItemResponse = {
      id: Number(row.id),
      name: row.name,
      category: row.category,
      price: Number(row.price),
      popular: Boolean(row.popular),
      image: row.image,
      desc: row.desc || '',
    };

    return res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error('Error getProductById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk',
      error: error.message,
    });
  }
}

/**
 * POST /api/products
 * Tambah menu produk baru
 */
export async function createProduct(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Koneksi database MySQL belum siap.',
      });
    }

    const body = req.body || {};
    const input = {
      name: String(body.name ?? '').trim(),
      category: String(body.category ?? '').trim(),
      price: Number(body.price),
      image: String(body.image ?? '').trim() || DEFAULT_IMAGE,
      desc: String(body.desc ?? '').trim() || null,
    };
    const popular = Boolean(body.popular);

    const validationError = await validateProductInput(input);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const pool = getPool();
    const [result]: any = await pool.query(
      'INSERT INTO `products` (`name`, `category`, `price`, `popular`, `image`, `desc`) VALUES (?, ?, ?, ?, ?, ?)',
      [input.name, input.category, input.price, popular ? 1 : 0, input.image, input.desc]
    );

    const newProduct: MenuItemResponse = {
      id: result.insertId,
      name: input.name,
      category: input.category,
      price: input.price,
      popular,
      image: input.image,
      desc: input.desc || '',
    };

    return res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('Error createProduct:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan produk',
      error: error.message,
    });
  }
}

/**
 * PUT /api/products/:id
 * Update data produk
 */
export async function updateProduct(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Koneksi database MySQL belum siap.',
      });
    }

    const { id } = req.params;
    const body = req.body || {};
    const pool = getPool();

    const [existing]: any = await pool.query(
      'SELECT id, name, category, price, popular, image, `desc` FROM `products` WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }
    const cur = existing[0];

    // Field yang tidak dikirim tetap memakai nilai lama (update sebagian)
    const input = {
      name: body.name !== undefined ? String(body.name).trim() : cur.name,
      category: body.category !== undefined ? String(body.category).trim() : cur.category,
      price: body.price !== undefined ? Number(body.price) : Number(cur.price),
      image: body.image !== undefined ? String(body.image).trim() || DEFAULT_IMAGE : cur.image,
      desc: body.desc !== undefined ? String(body.desc).trim() || null : cur.desc,
    };
    const popular = body.popular !== undefined ? Boolean(body.popular) : Boolean(cur.popular);

    const validationError = await validateProductInput(input);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    await pool.query(
      'UPDATE `products` SET `name` = ?, `category` = ?, `price` = ?, `popular` = ?, `image` = ?, `desc` = ? WHERE id = ?',
      [input.name, input.category, input.price, popular ? 1 : 0, input.image, input.desc, id]
    );

    return res.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: {
        id: Number(id),
        name: input.name,
        category: input.category,
        price: input.price,
        popular,
        image: input.image,
        desc: input.desc || '',
      },
    });
  } catch (error: any) {
    console.error('Error updateProduct:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui produk',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/products/:id
 * Hapus produk
 */
export async function deleteProduct(req: Request, res: Response) {
  try {
    const isReady = await checkOrReconnectDb();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        code: 'ECONNREFUSED',
        message: 'Koneksi database MySQL belum siap.',
      });
    }

    const { id } = req.params;
    const pool = getPool();

    const [result]: any = await pool.query('DELETE FROM `products` WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      message: 'Produk berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleteProduct:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus produk',
      error: error.message,
    });
  }
}
