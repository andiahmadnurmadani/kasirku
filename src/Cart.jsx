import React, { useState, useMemo } from 'react';
import './Cart.css';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  ArrowRight, 
  RotateCcw, 
  Receipt, 
  CheckCircle2, 
  User, 
  X,
  Banknote,
  QrCode,
  FileDown,
  Printer
} from 'lucide-react';
import { generateReceiptPDF } from './utils/pdfGenerator.ts';

/**
 * Format angka ke format mata uang Rupiah
 * Contoh: 45000 -> "Rp 45.000"
 */
export const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number || 0);
};

// Item sampel awal untuk kasir demo cepat
const DEFAULT_INITIAL_ITEMS = [
  { 
    id: 1, 
    name: 'Ayam Goreng Lengkuas', 
    price: 28000, 
    qty: 2,
    image: '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg'
  },
  { 
    id: 2, 
    name: 'Es Teh Manis Jumbo', 
    price: 6000, 
    qty: 3,
    image: '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg'
  },
  { 
    id: 3, 
    name: 'Tahu Cabe Garam Krispi', 
    price: 14000, 
    qty: 1,
    image: '/src/assets/images/tahu_cabe_garam_1793416319216.jpg'
  },
];

/**
 * Komponen Cart KasirKu POS
 * @param {Object} props
 * @param {Array} [props.externalCart] - (Opsional) data cart dari parent component
 * @param {Function} [props.onCartChange] - (Opsional) callback saat data cart berubah
 * @param {Function} [props.onCheckoutSuccess] - (Opsional) callback setelah pembayaran selesai
 * @param {string} [props.customerName] - (Opsional) nama pelanggan atau nomor meja
 * @param {Function} [props.onCustomerNameChange] - (Opsional) callback perubahan nama pelanggan
 */
export default function Cart({
  externalCart,
  onCartChange,
  onCheckoutSuccess,
  customerName: externalCustomer,
  onCustomerNameChange
}) {
  // State keranjang belanja (cart)
  const [cart, setCart] = useState(externalCart || DEFAULT_INITIAL_ITEMS);
  const [customerName, setCustomerName] = useState(externalCustomer || 'Pelanggan Umum');
  
  // State untuk alur pembayaran cepat (POS Rapid Checkout)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qris' | 'debit'
  const [cashGiven, setCashGiven] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [pdfNotice, setPdfNotice] = useState(null);

  // Fungsi Cetak / Unduh Struk PDF
  const handleDownloadReceiptPDF = () => {
    if (!lastTransaction) return;
    try {
      generateReceiptPDF(lastTransaction);
      setPdfNotice('Struk PDF berhasil diunduh!');
      setTimeout(() => setPdfNotice(null), 3500);
    } catch (err) {
      console.error('Gagal generate PDF, fallback ke print:', err);
      window.print();
    }
  };
  React.useEffect(() => {
    if (externalCart !== undefined) {
      setCart(externalCart);
    }
  }, [externalCart]);

  // Sinkronisasi nama customer jika dioper dari parent
  React.useEffect(() => {
    if (externalCustomer !== undefined) {
      setCustomerName(externalCustomer);
    }
  }, [externalCustomer]);

  // Helper untuk update state dan emit callback
  const updateCartState = (newCart) => {
    setCart(newCart);
    if (onCartChange) {
      onCartChange(newCart);
    }
  };

  /**
   * Fungsi Menambah Item ke Cart
   * Jika item sudah ada, tambah qty + 1. Jika belum ada, masukkan item baru.
   */
  const addItem = (itemToAdd) => {
    const existingIndex = cart.findIndex((item) => item.id === itemToAdd.id);
    let newCart;

    if (existingIndex > -1) {
      newCart = cart.map((item, index) =>
        index === existingIndex
          ? { ...item, qty: item.qty + (itemToAdd.qty || 1) }
          : item
      );
    } else {
      newCart = [
        ...cart,
        {
          id: itemToAdd.id || Date.now(),
          name: itemToAdd.name || 'Item Baru',
          price: Number(itemToAdd.price) || 0,
          qty: Number(itemToAdd.qty) || 1,
          image: itemToAdd.image || null,
        },
      ];
    }

    updateCartState(newCart);
  };

  /**
   * Fungsi Menghapus Item dari Cart berdasarkan ID
   */
  const removeItem = (itemId) => {
    const newCart = cart.filter((item) => item.id !== itemId);
    updateCartState(newCart);
  };

  /**
   * Fungsi Mengubah Qty Item (+ / -)
   */
  const updateQty = (itemId, change) => {
    const newCart = cart
      .map((item) => {
        if (item.id === itemId) {
          const newQty = item.qty + change;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      })
      .filter(Boolean); // Hapus otomatis jika qty <= 0

    updateCartState(newCart);
  };

  /**
   * Fungsi Mengosongkan Keranjang Belanja
   */
  const clearCart = () => {
    updateCartState([]);
  };

  // Perhitungan Subtotal, Total Qty, Pajak, dan Total Belanja
  const totalQty = useMemo(() => {
    return cart.reduce((total, item) => total + (item.qty || 0), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.qty || 0) * (item.price || 0), 0);
  }, [cart]);

  // Pajak Resto/PB1 10% (standar POS restoran/ritel Indonesia, atau Rp 0 jika belum ada)
  const tax = useMemo(() => {
    return subtotal > 0 ? Math.round(subtotal * 0.1) : 0;
  }, [subtotal]);

  // Total Belanja Akhir
  const totalAmount = useMemo(() => {
    return subtotal + tax;
  }, [subtotal, tax]);

  // Buka Modal Pembayaran
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCashGiven(totalAmount.toString());
    setIsPaymentModalOpen(true);
  };

  // Hitung Kembalian Uang Kasir
  const parsedCash = parseFloat(cashGiven) || 0;
  const changeAmount = parsedCash - totalAmount;
  const isCashSufficient = paymentMethod !== 'cash' || parsedCash >= totalAmount;

  // Konfirmasi Pembayaran dan Cetak Struk
  const handleProcessPayment = () => {
    if (!isCashSufficient) return;

    const receiptData = {
      orderId: `TRX-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      customer: customerName,
      items: [...cart],
      subtotal,
      tax,
      total: totalAmount,
      method: paymentMethod,
      cashGiven: paymentMethod === 'cash' ? parsedCash : totalAmount,
      change: paymentMethod === 'cash' ? Math.max(0, changeAmount) : 0,
    };

    setLastTransaction(receiptData);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);

    if (onCheckoutSuccess) {
      onCheckoutSuccess(receiptData);
    }
  };

  // Selesai transaksi & bersihkan keranjang untuk pembeli berikutnya
  const handleCompleteTransaction = () => {
    setIsReceiptModalOpen(false);
    clearCart();
    setCustomerName('Pelanggan Umum');
    if (onCustomerNameChange) {
      onCustomerNameChange('Pelanggan Umum');
    }
  };

  return (
    <div className="cart-card">
      {/* 1. Header Keranjang */}
      <div className="cart-header">
        <div className="cart-header-title">
          <div className="cart-header-icon" title="KasirKu Cart">
            <ShoppingCart size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="cart-title-text">Keranjang Pesanan</h2>
            <div className="cart-order-badge">
              <span>Kasir Aktif</span>
              <span>•</span>
              <span>{cart.length} Jenis Menu</span>
            </div>
          </div>
        </div>

        {/* Tombol Hapus Semua */}
        <button
          type="button"
          onClick={clearCart}
          disabled={cart.length === 0}
          className="cart-clear-btn"
          title="Kosongkan seluruh item keranjang"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* 2. Customer Strip (Mendukung kecepatan pelayanan kasir) */}
      <div className="cart-customer-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          <User size={15} />
          <span>Nama / Meja:</span>
        </div>
        <input
          type="text"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            if (onCustomerNameChange) onCustomerNameChange(e.target.value);
          }}
          placeholder="Pelanggan / No. Meja"
          className="cart-customer-input"
        />
      </div>

      {/* 3. Daftar Item (Nama, Qty, Subtotal) */}
      <div className="cart-items-wrapper">
        {cart.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">
              <ShoppingCart size={28} />
            </div>
            <h3 className="cart-empty-title">Keranjang Masih Kosong</h3>
            <p className="cart-empty-desc">
              Pilih menu dari katalog di sebelah kiri untuk menambahkan pesanan pembeli.
            </p>
            {/* Tombol Tambah Item Contoh Cepat jika kasir butuh demo */}
            <button
              type="button"
              onClick={() => {
                addItem({ id: 101, name: 'Paket Nasi Gudeg Telur', price: 25000, qty: 1 });
              }}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #0F5132',
                color: '#0F5132',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Masukkan Menu Contoh
            </button>
          </div>
        ) : (
          <div>
            {cart.map((item) => {
              const itemSubtotal = (item.qty || 1) * (item.price || 0);

              return (
                <div key={item.id} className="cart-item">
                  {/* Thumbnail Foto Menu */}
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="cart-item-thumb"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}

                  {/* Nama Item & Harga Satuan */}
                  <div className="cart-item-info">
                    <h4 className="cart-item-name" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="cart-item-unit-price">
                      {formatRupiah(item.price)}
                    </p>
                  </div>

                  {/* Qty Stepper (- / +) */}
                  <div className="cart-qty-controls">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      className="cart-qty-btn"
                      aria-label="Kurangi jumlah"
                      title="Kurangi"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="cart-qty-value">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="cart-qty-btn"
                      aria-label="Tambah jumlah"
                      title="Tambah"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Subtotal & Tombol Hapus */}
                  <div className="cart-item-end">
                    <span className="cart-item-subtotal">
                      {formatRupiah(itemSubtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="cart-item-remove-btn"
                      aria-label={`Hapus ${item.name}`}
                      title="Hapus item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bagian Bawah: Ringkasan, Total Belanja Tebal & Besar, dan Tombol Bayar */}
      <div className="cart-footer">
        {/* Rincian Subtotal & Pajak */}
        <div className="cart-summary-breakdown">
          <div className="cart-summary-row">
            <span>Subtotal ({totalQty} item)</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="cart-summary-row">
            <span>PB1 / Pajak Resto (10%)</span>
            <span>{formatRupiah(tax)}</span>
          </div>
        </div>

        <div className="cart-divider" />

        {/* Total Belanja: Teks Total Tebal dan Besar */}
        <div className="cart-total-row">
          <div className="cart-total-label-wrap">
            <span className="cart-total-label">Total Belanja</span>
            <span className="cart-total-items-count">Sudah termasuk pajak</span>
          </div>
          <div className="cart-total-amount">
            {formatRupiah(totalAmount)}
          </div>
        </div>

        {/* Tombol Besar 'Bayar' */}
        <button
          type="button"
          onClick={handleOpenPayment}
          disabled={cart.length === 0}
          className="cart-pay-button"
          aria-label="Bayar pesanan"
        >
          <CreditCard size={22} />
          <span>BAYAR SEKARANG</span>
          <span className="cart-pay-shortcut">F9</span>
        </button>
      </div>

      {/* MODAL 1: Alur Pembayaran Cepat (Rapid Cashier Payment) */}
      {isPaymentModalOpen && (
        <div className="pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="pos-modal-card">
            <div className="pos-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                  Pembayaran Kasir
                </h3>
                <span style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
                  {customerName} • {totalQty} Item
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="pos-modal-body">
              {/* Total Tagihan */}
              <div
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px'
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4B5563' }}>
                  Total Tagihan:
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F5132' }}>
                  {formatRupiah(totalAmount)}
                </span>
              </div>

              {/* Pilihan Metode Pembayaran */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>
                  Metode Pembayaran:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: paymentMethod === 'cash' ? '2px solid #0F5132' : '1fr solid #E5E7EB',
                      backgroundColor: paymentMethod === 'cash' ? '#E8F5E9' : '#FFFFFF',
                      color: paymentMethod === 'cash' ? '#0F5132' : '#374151',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Banknote size={18} />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: paymentMethod === 'qris' ? '2px solid #0F5132' : '1px solid #E5E7EB',
                      backgroundColor: paymentMethod === 'qris' ? '#E8F5E9' : '#FFFFFF',
                      color: paymentMethod === 'qris' ? '#0F5132' : '#374151',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <QrCode size={18} />
                    <span>QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: paymentMethod === 'debit' ? '2px solid #0F5132' : '1px solid #E5E7EB',
                      backgroundColor: paymentMethod === 'debit' ? '#E8F5E9' : '#FFFFFF',
                      color: paymentMethod === 'debit' ? '#0F5132' : '#374151',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={18} />
                    <span>Debit / Kartu</span>
                  </button>
                </div>
              </div>

              {/* Jika Pembayaran Tunai: Input Uang Diterima & Tombol Cepat */}
              {paymentMethod === 'cash' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
                    Uang Diterima dari Pembeli:
                  </label>
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: '#6B7280' }}>
                      Rp
                    </span>
                    <input
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder="0"
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 42px',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        outline: 'none',
                        color: '#111827',
                        fontVariantNumeric: 'tabular-nums',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Tombol Pecahan Cepat Kasir */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      className="pos-cash-quick-btn"
                      onClick={() => setCashGiven(totalAmount.toString())}
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      className="pos-cash-quick-btn"
                      onClick={() => setCashGiven('50000')}
                    >
                      50 Ribu
                    </button>
                    <button
                      type="button"
                      className="pos-cash-quick-btn"
                      onClick={() => setCashGiven('100000')}
                    >
                      100 Ribu
                    </button>
                    <button
                      type="button"
                      className="pos-cash-quick-btn"
                      onClick={() => setCashGiven('200000')}
                    >
                      200 Ribu
                    </button>
                  </div>

                  {/* Indikator Kembalian */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: changeAmount >= 0 ? '#ECFDF5' : '#FEF2F2',
                      border: `1px solid ${changeAmount >= 0 ? '#A7F3D0' : '#FECACA'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: changeAmount >= 0 ? '#065F46' : '#991B1B' }}>
                      {changeAmount >= 0 ? 'Kembalian:' : 'Uang Kurang:'}
                    </span>
                    <span
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: changeAmount >= 0 ? '#0F5132' : '#DC2626'
                      }}
                    >
                      {formatRupiah(Math.abs(changeAmount))}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'qris' && (
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'inline-block', padding: '12px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <QrCode size={110} style={{ color: '#0F5132' }} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#4B5563', margin: '8px 0 0 0', fontWeight: 500 }}>
                    Scan QRIS Statis/Dinamis KasirKu
                  </p>
                </div>
              )}

              {paymentMethod === 'debit' && (
                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '10px', marginBottom: '16px' }}>
                  <CreditCard size={42} style={{ color: '#0F5132', margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Gesek / Tap Kartu pada Mesin EDC
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#6B7280', margin: '4px 0 0 0' }}>
                    Menunggu konfirmasi approval bank...
                  </p>
                </div>
              )}

              {/* Tombol Konfirmasi Selesai Bayar */}
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={!isCashSufficient}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: isCashSufficient ? '#0F5132' : '#9CA3AF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: isCashSufficient ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s'
                }}
              >
                <CheckCircle2 size={18} />
                <span>KONFIRMASI PEMBAYARAN ({formatRupiah(totalAmount)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Struk Transaksi Selesai (Receipt View) */}
      {isReceiptModalOpen && lastTransaction && (
        <div className="pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="pos-modal-card" style={{ maxWidth: '400px' }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#0F5132', color: '#FFFFFF', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', marginBottom: '8px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700 }}>
                Pembayaran Berhasil!
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.9 }}>
                ID Transaksi: {lastTransaction.orderId}
              </p>
            </div>

            {/* Badan Struk Kertas Kasir */}
            <div style={{ padding: '20px', backgroundColor: '#FFFFFF', fontSize: '0.8125rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #D1D5DB', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F5132' }}>KASIRKU POS</div>
                <div style={{ color: '#6B7280' }}>Jl. Malioboro No. 42, Yogyakarta</div>
                <div style={{ color: '#9CA3AF', marginTop: '4px' }}>{lastTransaction.date}</div>
              </div>

              <div style={{ marginBottom: '12px', borderBottom: '1px dashed #D1D5DB', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#6B7280' }}>Pelanggan:</span>
                  <span style={{ fontWeight: 600 }}>{lastTransaction.customer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Metode:</span>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{lastTransaction.method}</span>
                </div>
              </div>

              {/* Rincian Menu */}
              <div style={{ marginBottom: '12px', borderBottom: '1px dashed #D1D5DB', paddingBottom: '12px' }}>
                {lastTransaction.items.map((it, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{it.name}</span>
                      <span>{formatRupiah(it.qty * it.price)}</span>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      {it.qty} x {formatRupiah(it.price)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Kembalian Struk */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                  <span>Subtotal</span>
                  <span>{formatRupiah(lastTransaction.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                  <span>PB1 (10%)</span>
                  <span>{formatRupiah(lastTransaction.tax)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#0F5132', marginTop: '4px' }}>
                  <span>TOTAL</span>
                  <span>{formatRupiah(lastTransaction.total)}</span>
                </div>
                {lastTransaction.method === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', marginTop: '4px' }}>
                      <span>Tunai Diterima</span>
                      <span>{formatRupiah(lastTransaction.cashGiven)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#111827' }}>
                      <span>Kembalian</span>
                      <span>{formatRupiah(lastTransaction.change)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Notifikasi Sukses PDF */}
              {pdfNotice && (
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    border: '1px solid #A7F3D0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{pdfNotice}</span>
                </div>
              )}

              {/* Tombol Cetak PDF & Transaksi Baru */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadReceiptPDF}
                  style={{
                    flex: 1.2,
                    padding: '10px 12px',
                    border: '1px solid #0F5132',
                    borderRadius: '8px',
                    backgroundColor: '#E8F5E9',
                    color: '#0F5132',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Unduh Struk PDF"
                >
                  <FileDown size={16} />
                  <span>Cetak PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteTransaction}
                  style={{
                    flex: 1.8,
                    padding: '10px 14px',
                    backgroundColor: '#0F5132',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Transaksi Baru</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
