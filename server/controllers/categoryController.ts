import { Request, Response } from 'express';
import { getPool, checkOrReconnectDb } from '../config/db.js';

/**
 * Ubah teks menjadi slug: huruf kecil, angka, dan tanda hubung.
 * Contoh: "Paket Hemat!" -> "paket-hemat"
 */
export function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function ensureDb(res: Response): Promise<boolean> {
  const isReady = await checkOrReconnectDb();
  if (!isReady) {
    res.status(503).json({
      success: false,
      code: 'ECONNREFUSED',
      message: 'Koneksi database MySQL belum siap.',
    });
    return false;
  }
  return true;
}

function formatCategory(row: any) {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    productCount: Number(row.product_count ?? 0),
  };
}

const SELECT_WITH_COUNT = `
  SELECT c.id, c.slug, c.name,
         (SELECT COUNT(*) FROM \`products\` p WHERE p.category = c.slug) AS product_count
  FROM \`categories\` c`;

/**
 * GET /api/categories
 * Daftar semua kategori beserta jumlah produk di dalamnya
 */
export async function getCategories(_req: Request, res: Response) {
  try {
    if (!(await ensureDb(res))) return;
    const [rows]: any = await getPool().query(`${SELECT_WITH_COUNT} ORDER BY c.id ASC`);
    return res.json({ success: true, total: rows.length, data: rows.map(formatCategory) });
  } catch (error: any) {
    console.error('Error getCategories:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kategori', error: error.message });
  }
}

/**
 * GET /api/categories/:id
 * Detail satu kategori
 */
export async function getCategoryById(req: Request, res: Response) {
  try {
    if (!(await ensureDb(res))) return;
    const [rows]: any = await getPool().query(`${SELECT_WITH_COUNT} WHERE c.id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }
    return res.json({ success: true, data: formatCategory(rows[0]) });
  } catch (error: any) {
    console.error('Error getCategoryById:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail kategori', error: error.message });
  }
}

/**
 * POST /api/categories
 * Tambah kategori baru. Body: { name, slug? }
 */
export async function createCategory(req: Request, res: Response) {
  try {
    if (!(await ensureDb(res))) return;
    const name = String(req.body?.name ?? '').trim();
    const slug = slugify(req.body?.slug || name);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, message: 'Nama kategori maksimal 100 karakter' });
    }
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug kategori tidak valid (gunakan huruf/angka)' });
    }

    const pool = getPool();
    const [dupe]: any = await pool.query('SELECT id FROM `categories` WHERE slug = ?', [slug]);
    if (dupe.length > 0) {
      return res.status(409).json({ success: false, message: `Kategori dengan slug "${slug}" sudah ada` });
    }

    const [result]: any = await pool.query('INSERT INTO `categories` (`slug`, `name`) VALUES (?, ?)', [slug, name]);
    return res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan',
      data: { id: result.insertId, slug, name, productCount: 0 },
    });
  } catch (error: any) {
    console.error('Error createCategory:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan kategori', error: error.message });
  }
}

/**
 * PUT /api/categories/:id
 * Ubah nama/slug kategori. Bila slug berubah, produk di kategori ini ikut dipindahkan.
 */
export async function updateCategory(req: Request, res: Response) {
  const pool = getPool();
  let conn: any = null;
  try {
    if (!(await ensureDb(res))) return;
    const { id } = req.params;

    const [rows]: any = await pool.query('SELECT id, slug, name FROM `categories` WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }
    const current = rows[0];

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : current.name;
    const slug = req.body?.slug !== undefined ? slugify(req.body.slug) : current.slug;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, message: 'Nama kategori maksimal 100 karakter' });
    }
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug kategori tidak valid (gunakan huruf/angka)' });
    }

    if (slug !== current.slug) {
      const [dupe]: any = await pool.query('SELECT id FROM `categories` WHERE slug = ? AND id <> ?', [slug, id]);
      if (dupe.length > 0) {
        return res.status(409).json({ success: false, message: `Kategori dengan slug "${slug}" sudah ada` });
      }
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.query('UPDATE `categories` SET `name` = ?, `slug` = ? WHERE id = ?', [name, slug, id]);
    let movedProducts = 0;
    if (slug !== current.slug) {
      const [moved]: any = await conn.query('UPDATE `products` SET `category` = ? WHERE `category` = ?', [slug, current.slug]);
      movedProducts = moved.affectedRows;
    }
    await conn.commit();

    const [after]: any = await pool.query(`${SELECT_WITH_COUNT} WHERE c.id = ?`, [id]);
    return res.json({
      success: true,
      message:
        movedProducts > 0
          ? `Kategori diperbarui, ${movedProducts} produk ikut dipindahkan ke slug baru`
          : 'Kategori berhasil diperbarui',
      data: formatCategory(after[0]),
    });
  } catch (error: any) {
    if (conn) {
      try { await conn.rollback(); } catch {}
    }
    console.error('Error updateCategory:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kategori', error: error.message });
  } finally {
    if (conn) {
      try { conn.release(); } catch {}
    }
  }
}

/**
 * DELETE /api/categories/:id
 * Hapus kategori. Ditolak (409) bila masih ada produk di dalamnya.
 */
export async function deleteCategory(req: Request, res: Response) {
  try {
    if (!(await ensureDb(res))) return;
    const pool = getPool();
    const [rows]: any = await pool.query(`${SELECT_WITH_COUNT} WHERE c.id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    }
    const category = formatCategory(rows[0]);
    if (category.productCount > 0) {
      return res.status(409).json({
        success: false,
        code: 'CATEGORY_IN_USE',
        message: `Kategori "${category.name}" masih dipakai ${category.productCount} produk. Pindahkan atau hapus produknya dulu.`,
        productCount: category.productCount,
      });
    }

    await pool.query('DELETE FROM `categories` WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: `Kategori "${category.name}" berhasil dihapus` });
  } catch (error: any) {
    console.error('Error deleteCategory:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kategori', error: error.message });
  }
}
