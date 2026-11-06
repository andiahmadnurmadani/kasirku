/**
 * Halaman Kelola Menu: CRUD Produk & Kategori.
 * Semua konfirmasi & notifikasi memakai pop-up (Modal/ConfirmDialog/Toast), bukan alert().
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tags,
  Trash2,
} from 'lucide-react';
import { formatRupiah } from './Cart.jsx';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  ConfirmDialog,
  INPUT_CLASS,
  LABEL_CLASS,
  Modal,
  useToast,
} from './components/Popup.tsx';
import {
  Category,
  MenuItem,
  ProductInput,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  updateCategory,
  updateProduct,
} from './services/api.ts';

const PRESET_IMAGES = [
  { label: 'Ayam goreng', src: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg' },
  { label: 'Nasi goreng', src: '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg' },
  { label: 'Es teh', src: '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg' },
  { label: 'Kopi susu', src: '/src/assets/images/kopi_susu_aren_1793416316788.jpg' },
  { label: 'Tahu cabe garam', src: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

interface ManageMenuProps {
  products: MenuItem[];
  categories: Category[];
  isDbOnline: boolean;
  /** Muat ulang produk & kategori dari backend setelah ada perubahan */
  onReload: () => Promise<void>;
  onBackToPos: () => void;
}

export default function ManageMenu({ products, categories, isDbOnline, onReload, onBackToPos }: ManageMenuProps) {
  const toast = useToast();
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // State pop-up
  const [productForm, setProductForm] = useState<{ open: boolean; product: MenuItem | null }>({ open: false, product: null });
  const [categoryForm, setCategoryForm] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [toDeleteProduct, setToDeleteProduct] = useState<MenuItem | null>(null);
  const [toDeleteCategory, setToDeleteCategory] = useState<Category | null>(null);
  const [categoryInUse, setCategoryInUse] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (filterCategory === 'all' || p.category === filterCategory) &&
        (!q || p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q))
    );
  }, [products, search, filterCategory]);

  const visibleCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [categories, search]);

  const requireOnline = () => {
    if (!isDbOnline) {
      toast.error('MySQL belum terhubung', 'Nyalakan MySQL dan backend dulu, lalu klik tombol status MySQL di atas.');
      return false;
    }
    return true;
  };

  const handleDeleteProduct = async () => {
    if (!toDeleteProduct) return;
    setDeleting(true);
    const res = await deleteProduct(toDeleteProduct.id);
    setDeleting(false);
    if (res.success) {
      toast.success('Produk dihapus', `"${toDeleteProduct.name}" sudah dihapus dari menu.`);
      setToDeleteProduct(null);
      await onReload();
    } else {
      toast.error('Gagal menghapus produk', res.error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!toDeleteCategory) return;
    setDeleting(true);
    const res = await deleteCategory(toDeleteCategory.id);
    setDeleting(false);
    if (res.success) {
      toast.success('Kategori dihapus', `"${toDeleteCategory.name}" sudah dihapus.`);
      setToDeleteCategory(null);
      await onReload();
    } else if (res.code === 'CATEGORY_IN_USE') {
      setCategoryInUse(toDeleteCategory);
      setToDeleteCategory(null);
    } else {
      toast.error('Gagal menghapus kategori', res.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#0F5132] flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Kelola Menu</h2>
            <p className="text-xs text-gray-500">Tambah, ubah, dan hapus produk serta kategori. Perubahan langsung tersimpan di MySQL.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBackToPos} className={BTN_SECONDARY}>
            <ArrowLeft size={15} /> Kembali ke Kasir
          </button>
          <button
            type="button"
            onClick={() => {
              if (!requireOnline()) return;
              if (tab === 'products') setProductForm({ open: true, product: null });
              else setCategoryForm({ open: true, category: null });
            }}
            className={BTN_PRIMARY}
          >
            <Plus size={16} /> {tab === 'products' ? 'Tambah Produk' : 'Tambah Kategori'}
          </button>
        </div>
      </div>

      {!isDbOnline && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-2.5 text-xs">
          <AlertTriangle size={17} className="text-amber-600 shrink-0" />
          <p>
            <b>MySQL belum terhubung.</b> Data di bawah hanya tampilan lokal dan belum bisa diubah. Nyalakan MySQL (perintah{' '}
            <code className="bg-amber-100 px-1 rounded">database</code>) dan backend (<code className="bg-amber-100 px-1 rounded">npm run server</code>),
            lalu klik tombol status MySQL di atas.
          </p>
        </div>
      )}

      {/* Tab + pencarian */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
        <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 p-1 bg-[#F3F4F6] rounded-xl border border-gray-200 w-fit">
            {(
              [
                ['products', 'Produk', products.length, Package],
                ['categories', 'Kategori', categories.length, Tags],
              ] as const
            ).map(([key, label, count, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSearch('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tab === key ? 'bg-white text-[#0F5132] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                {label}
                <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${tab === key ? 'bg-[#0F5132] text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-0 md:w-64 md:flex-none">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'products' ? 'Cari produk...' : 'Cari kategori...'}
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
            {tab === 'products' && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`${INPUT_CLASS.replace('w-full ', '')} w-40 shrink-0`}
                aria-label="Filter kategori"
              >
                <option value="all">Semua kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ================= TABEL PRODUK ================= */}
        {tab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50/70">
                  <th className="px-4 py-2.5 font-semibold">Produk</th>
                  <th className="px-4 py-2.5 font-semibold">Kategori</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Harga</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                            {p.popular && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                <Sparkles size={9} /> Favorit
                              </span>
                            )}
                          </div>
                          {p.desc && <p className="text-xs text-gray-500 truncate max-w-xs">{p.desc}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold bg-[#E8F5E9] text-[#0F5132] px-2 py-0.5 rounded-md">{categoryName(p.category)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900 tabular-nums">{formatRupiah(p.price)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => requireOnline() && setProductForm({ open: true, product: p })}
                          className="p-2 rounded-lg text-gray-500 hover:text-[#0F5132] hover:bg-[#E8F5E9] cursor-pointer"
                          title="Ubah produk"
                          aria-label={`Ubah ${p.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => requireOnline() && setToDeleteProduct(p)}
                          className="p-2 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Hapus produk"
                          aria-label={`Hapus ${p.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProducts.length === 0 && (
              <EmptyState
                text={products.length === 0 ? 'Belum ada produk. Klik "Tambah Produk" untuk mulai.' : 'Tidak ada produk yang cocok dengan pencarian.'}
              />
            )}
          </div>
        )}

        {/* ================= TABEL KATEGORI ================= */}
        {tab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50/70">
                  <th className="px-4 py-2.5 font-semibold">Nama Kategori</th>
                  <th className="px-4 py-2.5 font-semibold">Slug</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Jumlah Produk</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.slug}</code>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <button
                        type="button"
                        onClick={() => {
                          setTab('products');
                          setSearch('');
                          setFilterCategory(c.slug);
                        }}
                        className="text-[#0F5132] font-bold hover:underline cursor-pointer"
                        title="Lihat produk di kategori ini"
                      >
                        {c.productCount} produk
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => requireOnline() && setCategoryForm({ open: true, category: c })}
                          className="p-2 rounded-lg text-gray-500 hover:text-[#0F5132] hover:bg-[#E8F5E9] cursor-pointer"
                          title="Ubah kategori"
                          aria-label={`Ubah ${c.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!requireOnline()) return;
                            if (c.productCount > 0) setCategoryInUse(c);
                            else setToDeleteCategory(c);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Hapus kategori"
                          aria-label={`Hapus ${c.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleCategories.length === 0 && (
              <EmptyState
                text={categories.length === 0 ? 'Belum ada kategori. Klik "Tambah Kategori" untuk mulai.' : 'Tidak ada kategori yang cocok.'}
              />
            )}
          </div>
        )}
      </div>

      {/* ================= POP-UP ================= */}
      <ProductFormModal
        open={productForm.open}
        product={productForm.product}
        categories={categories}
        onClose={() => setProductForm({ open: false, product: null })}
        onSaved={async (msg) => {
          setProductForm({ open: false, product: null });
          toast.success(msg);
          await onReload();
        }}
      />

      <CategoryFormModal
        open={categoryForm.open}
        category={categoryForm.category}
        onClose={() => setCategoryForm({ open: false, category: null })}
        onSaved={async (title, msg) => {
          setCategoryForm({ open: false, category: null });
          toast.success(title, msg);
          await onReload();
        }}
      />

      <ConfirmDialog
        open={!!toDeleteProduct}
        title="Hapus produk?"
        message={
          <>
            Produk <b>{toDeleteProduct?.name}</b> akan dihapus dari menu. Riwayat transaksi lama yang memuat produk ini tetap tersimpan.
          </>
        }
        confirmLabel="Ya, hapus"
        loading={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setToDeleteProduct(null)}
      />

      <ConfirmDialog
        open={!!toDeleteCategory}
        title="Hapus kategori?"
        message={
          <>
            Kategori <b>{toDeleteCategory?.name}</b> akan dihapus. Kategori ini tidak berisi produk.
          </>
        }
        confirmLabel="Ya, hapus"
        loading={deleting}
        onConfirm={handleDeleteCategory}
        onCancel={() => setToDeleteCategory(null)}
      />

      <ConfirmDialog
        open={!!categoryInUse}
        tone="primary"
        title="Kategori masih dipakai"
        message={
          <>
            Kategori <b>{categoryInUse?.name}</b> masih berisi <b>{categoryInUse?.productCount} produk</b>, jadi belum bisa dihapus. Pindahkan
            produk-produk itu ke kategori lain atau hapus dulu.
          </>
        }
        confirmLabel="Lihat produknya"
        cancelLabel="Tutup"
        onConfirm={() => {
          if (categoryInUse) {
            setTab('products');
            setSearch('');
            setFilterCategory(categoryInUse.slug);
          }
          setCategoryInUse(null);
        }}
        onCancel={() => setCategoryInUse(null)}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
      <Package size={28} className="text-gray-300" />
      {text}
    </div>
  );
}

/* ======================= FORM PRODUK (POP-UP) ======================= */

function ProductFormModal({
  open,
  product,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const isEdit = !!product;
  const emptyForm = (): ProductInput => ({
    name: '',
    category: categories[0]?.slug || '',
    price: 0,
    popular: false,
    image: PRESET_IMAGES[0].src,
    desc: '',
  });
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [priceText, setPriceText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Isi ulang form setiap kali pop-up dibuka
  useEffect(() => {
    if (!open) return;
    const initial = product
      ? { name: product.name, category: product.category, price: product.price, popular: !!product.popular, image: product.image, desc: product.desc || '' }
      : emptyForm();
    setForm(initial);
    setPriceText(product ? String(product.price) : '');
    setErrors({});
    setServerError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nama produk wajib diisi';
    if (!form.category) e.category = 'Pilih kategori';
    const price = Number(priceText);
    if (priceText.trim() === '' || !Number.isInteger(price) || price < 0) e.price = 'Harga harus angka bulat ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const payload: ProductInput = { ...form, name: form.name.trim(), desc: (form.desc || '').trim(), price: Number(priceText) };
    const res = isEdit ? await updateProduct(product!.id, payload) : await createProduct(payload);
    setSaving(false);
    if (res.success) {
      await onSaved(isEdit ? `Produk "${payload.name}" diperbarui` : `Produk "${payload.name}" ditambahkan`);
    } else {
      setServerError(res.error || 'Gagal menyimpan produk');
    }
  };

  const isPreset = PRESET_IMAGES.some((i) => i.src === form.image);

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="lg"
      icon={<Package size={18} />}
      title={isEdit ? 'Ubah Produk' : 'Tambah Produk'}
      subtitle={isEdit ? `ID #${product?.id}` : 'Produk baru langsung tampil di halaman kasir'}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            Batal
          </button>
          <button type="submit" form="product-form" disabled={saving || categories.length === 0} className={BTN_PRIMARY}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </>
      }
    >
      {categories.length === 0 ? (
        <p className="text-sm text-gray-700">Belum ada kategori. Buat kategori dulu di tab <b>Kategori</b>.</p>
      ) : (
        <form id="product-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          {serverError && (
            <div className="sm:col-span-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="pf-name">Nama produk *</label>
            <input id="pf-name" className={INPUT_CLASS} value={form.name} maxLength={255} onChange={(e) => set('name', e.target.value)} placeholder="mis. Nasi Uduk Komplit" />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="pf-category">Kategori *</label>
            <select id="pf-category" className={INPUT_CLASS} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-rose-600 mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="pf-price">Harga (Rp) *</label>
            <input
              id="pf-price"
              className={INPUT_CLASS}
              inputMode="numeric"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="mis. 25000"
            />
            {errors.price ? (
              <p className="text-xs text-rose-600 mt-1">{errors.price}</p>
            ) : (
              priceText && <p className="text-xs text-gray-500 mt-1">{formatRupiah(Number(priceText))}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="pf-desc">Deskripsi</label>
            <textarea id="pf-desc" rows={2} className={INPUT_CLASS} value={form.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Keterangan singkat menu (opsional)" />
          </div>

          <div className="sm:col-span-2">
            <span className={LABEL_CLASS}>Gambar</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_IMAGES.map((img) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => set('image', img.src)}
                  title={img.label}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${form.image === img.src ? 'border-[#0F5132] ring-2 ring-[#0F5132]/20' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input
              className={`${INPUT_CLASS} mt-2`}
              value={isPreset ? '' : form.image}
              onChange={(e) => set('image', e.target.value)}
              placeholder="...atau tempel URL gambar sendiri (https://...)"
              aria-label="URL gambar"
            />
          </div>

          <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={!!form.popular} onChange={(e) => set('popular', e.target.checked)} className="w-4 h-4 accent-[#0F5132]" />
            <span className="text-sm text-gray-800">
              Tandai sebagai <b>Favorit</b> <span className="text-gray-500">(tampil badge di kartu menu kasir)</span>
            </span>
          </label>
        </form>
      )}
    </Modal>
  );
}

/* ====================== FORM KATEGORI (POP-UP) ====================== */

function CategoryFormModal({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: (title: string, message?: string) => Promise<void>;
}) {
  const isEdit = !!category;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name || '');
    setSlug(category?.slug || '');
    setSlugTouched(isEdit);
    setError('');
    setServerError('');
  }, [open, category, isEdit]);

  const effectiveSlug = slugTouched ? slugify(slug) : slugify(name);
  const slugChanged = isEdit && effectiveSlug !== category?.slug;

  const submit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!name.trim()) return setError('Nama kategori wajib diisi');
    if (!effectiveSlug) return setError('Slug tidak valid, gunakan huruf atau angka');
    setError('');
    setSaving(true);
    setServerError('');
    const payload = { name: name.trim(), slug: effectiveSlug };
    const res = isEdit ? await updateCategory(category!.id, payload) : await createCategory(payload);
    setSaving(false);
    if (res.success) {
      await onSaved(isEdit ? `Kategori "${payload.name}" diperbarui` : `Kategori "${payload.name}" ditambahkan`, res.message);
    } else {
      setServerError(res.error || 'Gagal menyimpan kategori');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      icon={<Tags size={18} />}
      title={isEdit ? 'Ubah Kategori' : 'Tambah Kategori'}
      subtitle={isEdit ? `${category?.productCount} produk di kategori ini` : 'Kategori baru langsung tampil sebagai filter di kasir'}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            Batal
          </button>
          <button type="submit" form="category-form" disabled={saving} className={BTN_PRIMARY}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {serverError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            {serverError}
          </div>
        )}
        <div>
          <label className={LABEL_CLASS} htmlFor="cf-name">Nama kategori *</label>
          <input id="cf-name" className={INPUT_CLASS} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="mis. Dessert" />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="cf-slug">Slug (kode unik)</label>
          <input
            id="cf-slug"
            className={`${INPUT_CLASS} font-mono`}
            value={slugTouched ? slug : effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="otomatis dari nama"
          />
          <p className="text-xs text-gray-500 mt-1">
            Disimpan sebagai <code className="bg-gray-100 px-1 rounded">{effectiveSlug || '-'}</code>. Hanya huruf kecil, angka, dan tanda hubung.
          </p>
        </div>
        {slugChanged && (category?.productCount || 0) > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            Slug berubah: {category?.productCount} produk di kategori ini akan ikut dipindahkan ke slug baru secara otomatis.
          </div>
        )}
      </form>
    </Modal>
  );
}
