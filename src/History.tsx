import React, { useState, useMemo } from 'react';
import { formatRupiah } from './Cart.jsx';
import {
  Receipt,
  Search,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  Printer,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Clock,
  User,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  FileDown
} from 'lucide-react';
import { generateReceiptPDF, generateHistoryReportPDF } from './utils/pdfGenerator.ts';

export interface Transaction {
  orderId: string;
  date: string;
  time: string;
  customer: string;
  cashier: string;
  items: Array<{
    id: number;
    name: string;
    price: number;
    qty: number;
    image?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  method: 'cash' | 'qris' | 'debit';
  cashGiven?: number;
  change?: number;
  status: 'Selesai' | 'Dibatalkan';
  isSyncedToDb?: boolean;
}

interface HistoryProps {
  transactions: Transaction[];
  onBackToPos?: () => void;
}

export default function History({ transactions, onBackToPos }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'cash' | 'qris' | 'debit'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('today');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Unduh Laporan Rekap Transaksi PDF
  const handleDownloadReportPDF = () => {
    try {
      const filename = generateHistoryReportPDF(filteredTransactions, summary);
      showToast(`Laporan PDF "${filename}" berhasil diunduh!`);
    } catch (err) {
      console.error('Gagal cetak laporan PDF:', err);
      window.print();
    }
  };

  // Unduh Struk Pembelian PDF
  const handleDownloadReceiptPDF = (trx: Transaction) => {
    try {
      const filename = generateReceiptPDF(trx);
      showToast(`Struk PDF "${filename}" berhasil diunduh!`);
    } catch (err) {
      console.error('Gagal cetak struk PDF:', err);
      window.print();
    }
  };

  // Filter transaksi berdasarkan pencarian, metode bayar, dan tanggal
  const filteredTransactions = useMemo(() => {
    return transactions.filter((trx) => {
      const matchQuery =
        trx.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchMethod = selectedMethod === 'all' || trx.method === selectedMethod;

      // Filter tanggal sederhana
      let matchDate = true;
      if (dateFilter === 'today') {
        matchDate = trx.date.includes('Hari ini') || trx.date.includes('30 Okt') || trx.date.includes('31 Okt') || trx.date.includes('2026');
      }

      return matchQuery && matchMethod && matchDate;
    });
  }, [transactions, searchQuery, selectedMethod, dateFilter]);

  // Statistik ringkasan
  const summary = useMemo(() => {
    const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total, 0);
    const totalItems = transactions.reduce(
      (acc, curr) => acc + curr.items.reduce((sum, it) => sum + it.qty, 0),
      0
    );
    const cashCount = transactions.filter((t) => t.method === 'cash').length;
    const nonCashCount = transactions.filter((t) => t.method !== 'cash').length;
    const avgBasket = transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0;

    return {
      totalRevenue,
      totalCount: transactions.length,
      totalItems,
      cashCount,
      nonCashCount,
      avgBasket,
    };
  }, [transactions]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#0F5132] border border-emerald-200">
            <Banknote size={13} />
            <span>Tunai</span>
          </span>
        );
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <QrCode size={13} />
            <span>QRIS</span>
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <CreditCard size={13} />
            <span>Debit / Kartu</span>
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* 1. Header Halaman Riwayat & Tombol Kembali */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#0F5132] flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                Riwayat Pembelian & Transaksi Kasir
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Daftar rekapan seluruh transaksi penjualan KasirKu tercatat rapi & realtime
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadReportPDF}
            className="px-3.5 py-2 text-xs font-bold text-[#0F5132] bg-[#E8F5E9] hover:bg-[#0F5132] hover:text-white border border-[#A7F3D0] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Download Rekap Riwayat Transaksi ke PDF"
          >
            <FileDown size={15} />
            <span>Unduh Rekap PDF</span>
          </button>
          {onBackToPos && (
            <button
              type="button"
              onClick={onBackToPos}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0a3622] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ShoppingBag size={15} />
              <span>Kembali ke Kasir</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notifikasi Berhasil Unduh PDF */}
      {toastMessage && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#0F5132]" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Kartu Ringkasan Omset & Performa Hari Ini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Omset */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Pendapatan</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0F5132] flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#0F5132] tabular-nums tracking-tight">
              {formatRupiah(summary.totalRevenue)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Akumulasi transaksi hari ini</p>
          </div>
        </div>

        {/* Total Transaksi */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Jumlah Transaksi</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <Receipt size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">
              {summary.totalCount} <span className="text-sm font-semibold text-gray-500">Struk</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">100% Status Selesai</p>
          </div>
        </div>

        {/* Menu Terjual */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Item Terjual</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">
              {summary.totalItems} <span className="text-sm font-semibold text-gray-500">Porsi</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Rata-rata: {summary.avgBasket > 0 ? formatRupiah(summary.avgBasket) : '0'}/struk</p>
          </div>
        </div>

        {/* Rasio Pembayaran */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Metode Bayar</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Banknote size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div>
              <div className="text-lg font-bold text-[#0F5132] tabular-nums">
                {summary.cashCount}
              </div>
              <span className="text-[11px] text-gray-400">Tunai</span>
            </div>
            <div className="h-7 w-[1px] bg-gray-200" />
            <div>
              <div className="text-lg font-bold text-blue-600 tabular-nums">
                {summary.nonCashCount}
              </div>
              <span className="text-[11px] text-gray-400">Non-Tunai</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Pencarian & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Kolom Pencarian */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. TRX, nama pelanggan, atau nama menu..."
            className="w-full bg-[#F3F4F6] border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0F5132] focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Metode Bayar (Segmented Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedMethod('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedMethod === 'all'
                  ? 'bg-white text-[#0F5132] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua Metode
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('cash')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                selectedMethod === 'cash'
                  ? 'bg-white text-[#0F5132] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Banknote size={13} />
              Tunai
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('qris')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                selectedMethod === 'qris'
                  ? 'bg-white text-[#0F5132] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode size={13} />
              QRIS
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('debit')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                selectedMethod === 'debit'
                  ? 'bg-white text-[#0F5132] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard size={13} />
              Debit
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tabel Daftar Transaksi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
              <Search size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-800">Tidak ada transaksi ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau ubah filter metode pembayaran.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pelanggan / Meja</th>
                  <th className="py-3 px-4">Menu & Jumlah Item</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Total Belanja</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((trx) => {
                  const itemCount = trx.items.reduce((sum, it) => sum + it.qty, 0);

                  return (
                    <tr
                      key={trx.orderId}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* No. Transaksi & Status Sync */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F5132]">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{trx.orderId}</span>
                          {trx.isSyncedToDb === false ? (
                            <span className="text-[10px] font-sans font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded">
                              ⚠️ Lokal (Belum Masuk DB)
                            </span>
                          ) : (
                            <span className="text-[10px] font-sans font-medium text-emerald-700 flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                              MySQL
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Waktu */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock size={13} className="text-gray-400" />
                          <span>{trx.time}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{trx.date}</div>
                      </td>

                      {/* Pelanggan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-[10px]">
                            <User size={12} />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{trx.customer}</span>
                            <div className="text-[11px] text-gray-400">Kasir: {trx.cashier}</div>
                          </div>
                        </div>
                      </td>

                      {/* Item Preview */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 line-clamp-1 max-w-[240px]">
                          {trx.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                        </div>
                        <span className="text-[11px] text-gray-400">{itemCount} item total</span>
                      </td>

                      {/* Metode Bayar */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(trx.method)}
                      </td>

                      {/* Total Belanja: Tebal & Jelas */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#0F5132] tabular-nums text-sm md:text-base">
                        {formatRupiah(trx.total)}
                      </td>

                      {/* Tombol Lihat Struk */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(trx)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#0F5132] bg-[#E8F5E9] hover:bg-[#0F5132] hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt size={13} />
                          <span>Struk</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL DETAIL STRUK & CETAK ULANG */}
      {selectedTransaction && (
        <div className="pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="pos-modal-card max-w-sm">
            {/* Header Struk */}
            <div className="p-4 bg-[#0F5132] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} />
                <h3 className="font-bold text-sm">Struk Pembelian</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-white/80 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Badan Struk Thermal */}
            <div className="p-5 bg-white text-xs font-sans">
              <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                <div className="font-extrabold text-base text-[#0F5132]">KASIRKU POS</div>
                <div className="text-gray-500 text-[11px]">Jl. Malioboro No. 42, Yogyakarta</div>
                <div className="text-gray-400 text-[10px] mt-1">
                  {selectedTransaction.date} • {selectedTransaction.time}
                </div>
              </div>

              {/* Data No. Order & Kasir */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Struk:</span>
                  <span className="font-mono font-bold">{selectedTransaction.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pelanggan:</span>
                  <span className="font-semibold">{selectedTransaction.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kasir:</span>
                  <span>{selectedTransaction.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode Bayar:</span>
                  <span className="font-bold uppercase text-[#0F5132]">
                    {selectedTransaction.method}
                  </span>
                </div>
              </div>

              {/* Daftar Menu Pembelian */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-2">
                {selectedTransaction.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{it.name}</div>
                      <div className="text-gray-400 text-[11px]">
                        {it.qty} x {formatRupiah(it.price)}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {formatRupiah(it.qty * it.price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rincian Angka Subtotal, Pajak, Total */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatRupiah(selectedTransaction.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>PB1 / Pajak (10%)</span>
                  <span className="tabular-nums">{formatRupiah(selectedTransaction.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#0F5132] pt-1 border-t border-gray-100">
                  <span>TOTAL BELANJA</span>
                  <span className="tabular-nums">{formatRupiah(selectedTransaction.total)}</span>
                </div>
                {selectedTransaction.method === 'cash' && selectedTransaction.cashGiven && (
                  <>
                    <div className="flex justify-between text-gray-500 pt-1">
                      <span>Tunai Diterima</span>
                      <span className="tabular-nums">{formatRupiah(selectedTransaction.cashGiven)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Kembalian</span>
                      <span className="tabular-nums text-[#0F5132]">
                        {formatRupiah(selectedTransaction.change || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-[10px] text-gray-400 border-t border-dashed border-gray-300 pt-3 mb-4">
                Terima kasih atas kunjungan Anda di KasirKu!
              </div>

              {/* Tombol Cetak PDF & Tutup */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPDF(selectedTransaction)}
                  className="flex-1 py-2.5 bg-[#0F5132] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#0a3622] transition-colors cursor-pointer shadow-xs"
                  title="Unduh Struk Pembelian dalam Format PDF"
                >
                  <FileDown size={15} />
                  <span>Cetak Struk PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
