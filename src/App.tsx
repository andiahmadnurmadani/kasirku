import React, { useState, useEffect } from 'react';
import Cart, { formatRupiah } from './Cart.jsx';
import History, { Transaction } from './History.tsx';
import ManageMenu from './ManageMenu.tsx';
import {
  fetchProducts,
  fetchCategories,
  fetchTransactions,
  saveTransaction,
  checkBackendHealth,
  MenuItem,
  Category,
} from './services/api.ts';
import { 
  Search, 
  Store, 
  Clock, 
  Check, 
  Sparkles,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Flame,
  Plus,
  Receipt,
  LayoutGrid,
  AlertTriangle,
  RefreshCw,
  Database,
  X,
  CheckCircle2,
  Package,
  Tag
} from 'lucide-react';

// Kategori bawaan (dipakai saat MySQL offline). Saat online, kategori diambil dari database.
const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, slug: 'makanan', name: 'Makanan', productCount: 0 },
  { id: 2, slug: 'minuman', name: 'Minuman', productCount: 0 },
  { id: 3, slug: 'snack', name: 'Cemilan', productCount: 0 },
  { id: 4, slug: 'paket', name: 'Paket Hemat', productCount: 0 },
];

// Ikon untuk kategori yang dikenal; kategori baru memakai ikon Tag
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  makanan: UtensilsCrossed,
  minuman: Coffee,
  snack: Cookie,
  paket: Flame,
};

const MENU_CATALOG: MenuItem[] = [
  // Makanan
  { 
    id: 1, 
    name: 'Ayam Goreng Lengkuas', 
    category: 'makanan', 
    price: 28000, 
    popular: true,
    image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg',
    desc: 'Ayam renyah berempah dengan serundeng lengkuas & sambal'
  },
  { 
    id: 2, 
    name: 'Bebek Goreng Sambal Korek', 
    category: 'makanan', 
    price: 35000, 
    popular: true,
    image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg',
    desc: 'Bebek empuk goreng garing dengan pedas nendang sambal korek'
  },
  { 
    id: 3, 
    name: 'Nasi Goreng Spesial KasirKu', 
    category: 'makanan', 
    price: 24000, 
    popular: true,
    image: '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg',
    desc: 'Nasi goreng harum wajan dengan telur mata sapi & kerupuk'
  },
  { 
    id: 4, 
    name: 'Mie Goreng Seafood Pedas', 
    category: 'makanan', 
    price: 26000,
    image: '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg',
    desc: 'Mie telur kenyal dengan udang, cumi, dan sayuran segar'
  },
  { 
    id: 5, 
    name: 'Soto Betawi Daging Sapi', 
    category: 'makanan', 
    price: 38000,
    image: '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg',
    desc: 'Kuah santan susu gurih rempah dengan potongan daging sapi empuk'
  },
  { 
    id: 6, 
    name: 'Sate Ayam Madura (10 tsk)', 
    category: 'makanan', 
    price: 30000,
    image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg',
    desc: 'Daging ayam bakar empuk dengan bumbu kacang legit khas Madura'
  },
  
  // Minuman
  { 
    id: 7, 
    name: 'Es Teh Manis Jumbo', 
    category: 'minuman', 
    price: 6000, 
    popular: true,
    image: '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg',
    desc: 'Teh melati seduh segar dingin ukuran jumbo'
  },
  { 
    id: 8, 
    name: 'Es Jeruk Peras Segar', 
    category: 'minuman', 
    price: 9000,
    image: '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg',
    desc: 'Jeruk peras murni kaya vitamin C dengan es batu segar'
  },
  { 
    id: 9, 
    name: 'Kopi Susu Gula Aren', 
    category: 'minuman', 
    price: 18000, 
    popular: true,
    image: '/src/assets/images/kopi_susu_aren_1793416316788.jpg',
    desc: 'Espresso robusta & susu creamy dengan sirup aren asli'
  },
  { 
    id: 10, 
    name: 'Jus Alpukat Kocok', 
    category: 'minuman', 
    price: 16000,
    image: '/src/assets/images/kopi_susu_aren_1793416316788.jpg',
    desc: 'Alpukat mentega kental dengan saus cokelat manis'
  },
  
  // Snack / Cemilan
  { 
    id: 11, 
    name: 'Tahu Cabe Garam Krispi', 
    category: 'snack', 
    price: 14000, 
    popular: true,
    image: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg',
    desc: 'Tahu goreng renyah bumbu bawang putih dan cabe rawit cincang'
  },
  { 
    id: 12, 
    name: 'Pisang Bakar Keju Cokelat', 
    category: 'snack', 
    price: 16000,
    image: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg',
    desc: 'Pisang kepok manis bakar dengan parutan keju & meses'
  },
  { 
    id: 13, 
    name: 'Tempe Mendoan (4 pcs)', 
    category: 'snack', 
    price: 12000,
    image: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg',
    desc: 'Tempe berbalut tepung daun bawang gurih cocol sambal kecap'
  },
  
  // Paket Hemat
  { 
    id: 14, 
    name: 'Paket Hemat: Ayam + Nasi + Es Teh', 
    category: 'paket', 
    price: 35000, 
    popular: true,
    image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg',
    desc: 'Komplit hemat: 1 Ayam Goreng Lengkuas, Nasi Pulen & Es Teh'
  },
  { 
    id: 15, 
    name: 'Paket Berdua: 2 Nasi Goreng + 2 Es Teh', 
    category: 'paket', 
    price: 50000, 
    popular: true,
    image: '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg',
    desc: 'Pilihan pas untuk 2 porsi: Nasi Goreng Spesial + 2 Es Teh'
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<'pos' | 'history' | 'manage'>('pos');
  const [products, setProducts] = useState<MenuItem[]>(MENU_CATALOG);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Muat ulang produk & kategori dari database (dipakai setelah tambah/ubah/hapus)
  const reloadMenuData = async () => {
    const [apiProducts, apiCategories] = await Promise.all([fetchProducts(), fetchCategories()]);
    if (apiProducts) setProducts(apiProducts);
    if (apiCategories) setCategories(apiCategories);
  };
  // Riwayat dimulai kosong lalu diisi dari database MySQL (tidak ada data contoh di kode).
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDbOnline, setIsDbOnline] = useState<boolean>(false);
  const [isCheckingConn, setIsCheckingConn] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Ambil data produk & transaksi dari Backend MySQL saat pertama kali dimuat
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromBackend() {
      const health = await checkBackendHealth();
      const dbConnected = Boolean(health?.database?.connected);
      if (isMounted) {
        setIsDbOnline(dbConnected);
      }

      if (dbConnected) {
        const [apiProducts, apiCategories] = await Promise.all([fetchProducts(), fetchCategories()]);
        // Pakai data database apa adanya (termasuk bila kosong)
        if (isMounted && apiProducts) setProducts(apiProducts);
        if (isMounted && apiCategories) setCategories(apiCategories);

        const apiTrx = await fetchTransactions();
        // Pakai data database apa adanya, termasuk bila kosong (0 transaksi).
        if (isMounted && apiTrx) {
          setTransactions(apiTrx);
        }
      } else {
        if (isMounted) {
          setSyncNotice({
            type: 'warning',
            title: 'MySQL Belum Terhubung (Mode Offline)',
            message: 'Database MySQL di 127.0.0.1:3306 belum aktif. Transaksi saat ini hanya tersimpan di memori browser.',
          });
        }
      }
    }

    loadDataFromBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fungsi Cek Ulang Koneksi dan Auto-Sync data offline
  const handleCheckConnection = async () => {
    setIsCheckingConn(true);
    try {
      const health = await checkBackendHealth();
      const dbConnected = Boolean(health?.database?.connected);
      setIsDbOnline(dbConnected);

      if (dbConnected) {
        await reloadMenuData();
        // Cari transaksi lokal yang belum tersimpan ke MySQL
        const unsynced = transactions.filter((t) => t.isSyncedToDb === false);
        if (unsynced.length > 0) {
          let syncedCount = 0;
          for (const item of unsynced) {
            const res = await saveTransaction(item);
            if (res.success) syncedCount++;
          }

          setTransactions((prev) =>
            prev.map((t) => ({ ...t, isSyncedToDb: true }))
          );

          setSyncNotice({
            type: 'success',
            title: 'Koneksi MySQL Pulih!',
            message: `MySQL berhasil terhubung & ${syncedCount} transaksi offline otomatis disinkronkan ke database.`,
          });
        } else {
          setSyncNotice({
            type: 'success',
            title: 'MySQL Terhubung',
            message: 'Koneksi database MySQL aktif dan tersinkronisasi sempurna.',
          });
        }
      } else {
        setSyncNotice({
          type: 'warning',
          title: 'MySQL Masih Offline (ECONNREFUSED)',
          message: 'Server belum dapat terhubung ke 127.0.0.1:3306. Pastikan Laragon atau XAMPP sudah dinyalakan (klik "Start All").',
        });
      }
    } catch {
      setIsDbOnline(false);
      setSyncNotice({
        type: 'warning',
        title: 'Backend API Belum Berjalan',
        message: 'Tidak dapat menjangkau server backend di port 5000. Jalankan "npm run server".',
      });
    } finally {
      setIsCheckingConn(false);
    }
  };

  const [cart, setCart] = useState([
    { 
      id: 1, 
      name: 'Ayam Goreng Lengkuas', 
      price: 28000, 
      qty: 2,
      image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg'
    },
    { 
      id: 7, 
      name: 'Es Teh Manis Jumbo', 
      price: 6000, 
      qty: 3,
      image: '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg'
    },
    { 
      id: 11, 
      name: 'Tahu Cabe Garam Krispi', 
      price: 14000, 
      qty: 1,
      image: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg'
    },
  ]);

  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Bila kategori yang sedang dipilih dihapus/diganti slug-nya, kembali ke "Semua Menu"
  useEffect(() => {
    if (activeCategory !== 'all' && !categories.some((c) => c.slug === activeCategory)) {
      setActiveCategory('all');
    }
  }, [categories, activeCategory]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Meja 05 - Budi');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Filter daftar menu
  const filteredMenu = products.filter((item) => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Tambah item ke Cart secara cepat
  const handleQuickAdd = (product: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((it) => it.id === product.id);
      if (existing) {
        return prevCart.map((it) =>
          it.id === product.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prevCart, 
        { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          qty: 1,
          image: product.image 
        }
      ];
    });

    // Feedback visual cepat
    setAddedNotice(product.name);
    setTimeout(() => {
      setAddedNotice((curr) => (curr === product.name ? null : curr));
    }, 1200);
  };

  // Callback saat pembayaran sukses di Cart: otomatis simpan ke Riwayat Transaksi & MySQL Backend!
  const handleCheckoutSuccess = async (receiptData: any) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newTransaction: Transaction = {
      orderId: receiptData.orderId,
      date: formattedDate,
      time: formattedTime,
      customer: receiptData.customer || 'Pelanggan Umum',
      cashier: 'Kasir 01 (Siti)',
      items: receiptData.items || [],
      subtotal: receiptData.subtotal || 0,
      tax: receiptData.tax || 0,
      total: receiptData.total || 0,
      method: receiptData.method || 'cash',
      cashGiven: receiptData.cashGiven,
      change: receiptData.change,
      status: 'Selesai',
      isSyncedToDb: false, // Default false sampai terkonfirmasi oleh server
    };

    // Update state tampilan langsung untuk responsivitas instan
    setTransactions((prev) => [newTransaction, ...prev]);

    // Simpan ke MySQL Backend melalui API
    const saveResult = await saveTransaction(newTransaction);
    if (saveResult.success) {
      setIsDbOnline(true);
      setTransactions((prev) =>
        prev.map((t) => (t.orderId === newTransaction.orderId ? { ...t, isSyncedToDb: true } : t))
      );
      setSyncNotice({
        type: 'success',
        title: 'Tersimpan di MySQL',
        message: `Transaksi ${newTransaction.orderId} sukses tersimpan permanen di database MySQL.`,
      });
    } else {
      setIsDbOnline(false);
      setSyncNotice({
        type: 'warning',
        title: 'Tersimpan Lokal (MySQL Offline)',
        message: `Transaksi ${newTransaction.orderId} hanya tersimpan di memori browser karena MySQL belum aktif di 127.0.0.1:3306. Data akan disinkronkan saat MySQL menyala.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] flex flex-col font-sans">
      {/* 1. TOP BAR KASIRKU DENGAN NAVIGASI UTAMA (KASIR & RIWAYAT) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-6">
          {/* Brand Wordmark & Mode Switcher */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F5132] text-white flex items-center justify-center font-bold shadow-sm">
                <Store size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-[#0F5132] leading-none">
                    KasirKu
                  </h1>
                  <span className="text-xs bg-[#E8F5E9] text-[#0F5132] font-semibold px-2 py-0.5 rounded">
                    POS v2.4
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Sistem Kasir Cepat & Praktis</p>
              </div>
            </div>

            {/* Navigasi Tab Utama: Kasir POS vs Riwayat Pembelian */}
            <nav className="flex items-center gap-1.5 p-1 bg-[#F3F4F6] rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setCurrentView('pos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'pos'
                    ? 'bg-white text-[#0F5132] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={15} />
                <span>Kasir POS</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'history'
                    ? 'bg-white text-[#0F5132] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Receipt size={15} />
                <span>Riwayat Pembelian</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  currentView === 'history' ? 'bg-[#0F5132] text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {transactions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('manage')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'manage'
                    ? 'bg-white text-[#0F5132] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package size={15} />
                <span>Kelola Menu</span>
              </button>
            </nav>
          </div>

          {/* Quick Search jika di tampilan POS */}
          {currentView === 'pos' && (
            <div className="flex-1 max-w-xs md:max-w-md relative hidden lg:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu cepat (ketik nama / menu)..."
                className="w-full bg-[#F3F4F6] border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0F5132] focus:bg-white transition-colors"
              />
            </div>
          )}

          {/* Kasir Status & Database Connection Badge */}
          <div className="flex items-center gap-2.5 text-xs">
            <div className="hidden xl:flex items-center gap-2 text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <Clock size={14} className="text-[#0F5132]" />
              <span>Shift Siang • Kasir 01 (Siti)</span>
            </div>

            {/* Database Connection Status & Retry Button */}
            <button
              type="button"
              onClick={handleCheckConnection}
              disabled={isCheckingConn}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isDbOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
              title="Klik untuk cek status MySQL & sinkronkan data offline"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isDbOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'
                }`}
              />
              <Database size={13} />
              <span>{isDbOnline ? 'MySQL Online' : 'MySQL Offline (Cek)'}</span>
              <RefreshCw
                size={12}
                className={`ml-0.5 ${isCheckingConn ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* 2. KONTEN UTAMA SESUAI TAB (KASIR POS ATAU RIWAYAT PEMBELIAN) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {/* Sinkronisasi & Peringatan Database Banner */}
        {syncNotice && (
          <div
            className={`mb-4 p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
              syncNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : syncNotice.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {syncNotice.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  {syncNotice.title}
                </h4>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                  {syncNotice.message}
                </p>
                {!isDbOnline && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCheckConnection}
                      disabled={isCheckingConn}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <RefreshCw size={11} className={isCheckingConn ? 'animate-spin' : ''} />
                      Cek Ulang & Sinkronkan
                    </button>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Aktifkan MySQL di Laragon/XAMPP (Port 3306), lalu klik tombol di atas.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-lg hover:bg-black/5"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {currentView === 'manage' ? (
          /* ================= HALAMAN KELOLA MENU (PRODUK & KATEGORI) ================= */
          <ManageMenu
            products={products}
            categories={categories}
            isDbOnline={isDbOnline}
            onReload={reloadMenuData}
            onBackToPos={() => setCurrentView('pos')}
          />
        ) : currentView === 'history' ? (
          /* ================= HALAMAN RIWAYAT PEMBELIAN ================= */
          <History
            transactions={transactions}
            onBackToPos={() => setCurrentView('pos')}
          />
        ) : (
          /* ================= HALAMAN KASIR POS ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Panel Kiri: Katalog Menu Berfoto Cepat (7 Kolom Desktop) */}
            <section className="lg:col-span-7 flex flex-col gap-4">
              {/* Baris Kategori Filter Cepat */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === 'all'
                        ? 'bg-[#0F5132] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Semua Menu ({products.length})
                  </button>
                  {categories.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.slug] || Tag;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setActiveCategory(cat.slug)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                          activeCategory === cat.slug
                            ? "bg-[#0F5132] text-white shadow-xs"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <Icon size={13} />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>

                {/* Notifikasi Tambah Item Singkat */}
                {addedNotice && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#0F5132] font-semibold bg-[#E8F5E9] border border-[#BBF7D0] px-3 py-1.5 rounded-lg animate-pulse whitespace-nowrap">
                    <Check size={14} />
                    <span>+ {addedNotice}</span>
                  </div>
                )}
              </div>

              {/* Grid Menu Kartu Kasir dengan FOTO PRODUK */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {filteredMenu.map((item) => {
                  const currentQty = cart.find((it) => it.id === item.id)?.qty || 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                      className={`rounded-2xl border text-left flex flex-col overflow-hidden transition-all duration-180 cursor-pointer relative group bg-white shadow-xs hover:shadow-md ${
                        currentQty > 0
                          ? 'border-[#0F5132] ring-2 ring-[#0F5132]/15'
                          : 'border-gray-200 hover:border-[#0F5132]'
                      }`}
                    >
                      {/* Foto Produk (4:3 aspect ratio) */}
                      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />

                        {/* Gradient Scrim Halus Bawah Foto */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                        {/* Badge Favorit */}
                        {item.popular && (
                          <span className="absolute top-2 left-2 bg-amber-500/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                            <Sparkles size={10} /> Favorit
                          </span>
                        )}

                        {/* Badge Kuantitas di Keranjang */}
                        {currentQty > 0 && (
                          <span className="absolute top-2 right-2 bg-[#0F5132] text-white text-xs font-extrabold px-2 py-0.5 rounded-full tabular-nums shadow-md ring-2 ring-white">
                            {currentQty}x
                          </span>
                        )}

                        {/* Kategori Label di Sudut Bawah Foto */}
                        <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white/95 drop-shadow-xs capitalize">
                          {categories.find((c) => c.slug === item.category)?.name || item.category}
                        </span>
                      </div>

                      {/* Konten Keterangan Menu & Harga */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-[#0F5132] transition-colors">
                            {item.name}
                          </h3>
                          {item.desc && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                              {item.desc}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-extrabold text-[#0F5132] tabular-nums">
                            {formatRupiah(item.price)}
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-gray-600 group-hover:bg-[#0F5132] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                            <Plus size={15} strokeWidth={2.5} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Panel Kanan: Komponen Cart (5 Kolom Desktop) */}
            <section className="lg:col-span-5 sticky top-20">
              <div className="h-[calc(100vh-6.5rem)] min-h-[580px]">
                <Cart
                  externalCart={cart}
                  onCartChange={(newCart: any) => setCart(newCart)}
                  customerName={customerName}
                  onCustomerNameChange={(name: string) => setCustomerName(name)}
                  onCheckoutSuccess={handleCheckoutSuccess}
                  isDbOnline={isDbOnline}
                />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
