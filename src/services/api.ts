/**
 * API Service untuk KasirKu Front-End
 * Menghubungkan antarmuka React dengan Express.js + MySQL Backend
 */

export interface MenuItem {
  id: number;
  name: string;
  category: string; // slug kategori, mis. "makanan"
  price: number;
  popular?: boolean;
  image: string;
  desc?: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  productCount: number;
}

export type ProductInput = Omit<MenuItem, 'id'>;
export interface CategoryInput {
  name: string;
  slug?: string;
}

/** Hasil standar operasi tulis (tambah/ubah/hapus) ke backend */
export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface TransactionItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export interface Transaction {
  id?: number;
  orderId: string;
  date: string;
  time: string;
  customer: string;
  cashier: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: 'cash' | 'qris' | 'debit';
  cashGiven?: number;
  change?: number;
  status: 'Selesai' | 'Dibatalkan';
  isSyncedToDb?: boolean; // Flag penanda apakah sudah tersimpan di MySQL
}

export interface SaveTransactionResult {
  success: boolean;
  data?: Transaction;
  error?: string;
  code?: string;
  isOffline?: boolean;
}

const API_BASE_URL = '/api';

/**
 * Cek status kesehatan backend & koneksi MySQL
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Mengambil daftar menu produk dari Backend MySQL
 */
export async function fetchProducts(category?: string, search?: string): Promise<MenuItem[] | null> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.warn('[API] Gagal mengambil produk dari server, menggunakan fallback data lokal:', error);
    return null;
  }
}

/**
 * Helper permintaan tulis (POST/PUT/DELETE) yang selalu mengembalikan ApiResult,
 * sehingga UI bisa menampilkan pesan error dari backend di pop-up.
 */
async function sendRequest<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || `Server error ${res.status}`,
        code: data.code,
      };
    }
    return { success: true, data: data.data, message: data.message };
  } catch (error: any) {
    return {
      success: false,
      error: 'Tidak dapat menghubungi server backend. Pastikan "npm run server" berjalan.',
      code: 'NETWORK_ERROR',
    };
  }
}

/** Mengambil daftar kategori (beserta jumlah produk) dari Backend MySQL */
export async function fetchCategories(): Promise<Category[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : null;
  } catch {
    return null;
  }
}

export const createProduct = (input: ProductInput) => sendRequest<MenuItem>('POST', '/products', input);
export const updateProduct = (id: number, input: Partial<ProductInput>) =>
  sendRequest<MenuItem>('PUT', `/products/${id}`, input);
export const deleteProduct = (id: number) => sendRequest<void>('DELETE', `/products/${id}`);

export const createCategory = (input: CategoryInput) => sendRequest<Category>('POST', '/categories', input);
export const updateCategory = (id: number, input: CategoryInput) =>
  sendRequest<Category>('PUT', `/categories/${id}`, input);
export const deleteCategory = (id: number) => sendRequest<void>('DELETE', `/categories/${id}`);

/**
 * Mengambil riwayat transaksi dari Backend MySQL
 */
export async function fetchTransactions(): Promise<Transaction[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((t: any) => ({ ...t, isSyncedToDb: true }));
    }
    return null;
  } catch (error) {
    console.warn('[API] Gagal mengambil riwayat transaksi dari server, menggunakan fallback data lokal:', error);
    return null;
  }
}

/**
 * Menyimpan transaksi pembayaran kasir baru ke MySQL
 * Mengembalikan objek hasil yang detail (success, error, isOffline)
 */
export async function saveTransaction(receiptData: Partial<Transaction>): Promise<SaveTransactionResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const isOffline = res.status === 503 || data.code === 'ECONNREFUSED';
      return {
        success: false,
        error: data.message || `Server Error ${res.status}`,
        code: data.code,
        isOffline,
      };
    }

    if (data.success && data.data) {
      return {
        success: true,
        data: { ...data.data, isSyncedToDb: true },
      };
    }

    return {
      success: false,
      error: data.message || 'Gagal menyimpan transaksi',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Gagal menghubungi server API',
      isOffline: true,
    };
  }
}
