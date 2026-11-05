import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah } from '../Cart.jsx';

export interface ReceiptData {
  orderId: string;
  date: string;
  time?: string;
  customer: string;
  cashier?: string;
  items: Array<{
    name: string;
    price: number;
    qty: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  cashGiven?: number;
  change?: number;
}

/**
 * Buat dan unduh Struk Pembelian dalam format PDF (Format Kertas Thermal Kasir 80mm)
 */
export function generateReceiptPDF(data: ReceiptData): string {
  // Hitung tinggi dokumen dinamis sesuai jumlah item
  const baseHeight = 130;
  const itemHeight = (data.items?.length || 1) * 9;
  const totalHeight = Math.max(160, baseHeight + itemHeight);

  // Ukuran kertas thermal standar 80mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  const pageWidth = 80;
  let y = 10;

  // Header Toko
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 81, 50); // #0F5132
  doc.text('KASIRKU POS', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Jl. Malioboro No. 42, Yogyakarta', pageWidth / 2, y, { align: 'center' });
  
  y += 4;
  doc.text('Telp: (0274) 555-890 • Kasir: ' + (data.cashier || 'Kasir 01 (Siti)'), pageWidth / 2, y, { align: 'center' });

  // Garis putus-putus
  y += 4;
  doc.setLineDashPattern([1.5, 1], 0);
  doc.setDrawColor(180, 180, 180);
  doc.line(6, y, pageWidth - 6, y);

  // Informasi Struk
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('No. Struk:', 6, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.orderId, pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Waktu:', 6, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.date} ${data.time || ''}`.trim(), pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Pelanggan:', 6, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customer || 'Pelanggan Umum', pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Metode:', 6, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 50);
  doc.text((data.method || 'CASH').toUpperCase(), pageWidth - 6, y, { align: 'right' });

  // Garis Pemisah
  y += 3;
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(6, y, pageWidth - 6, y);

  // Daftar Item
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text('MENU', 6, y);
  doc.text('SUBTOTAL', pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  data.items.forEach((item) => {
    // Nama Menu
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const splitName = doc.splitTextToSize(item.name, 45);
    doc.text(splitName, 6, y);

    // Subtotal
    const itemSubtotal = formatRupiah(item.qty * item.price);
    doc.text(itemSubtotal, pageWidth - 6, y, { align: 'right' });

    // Qty x Harga
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${item.qty} x ${formatRupiah(item.price)}`, 6, y);

    y += 5;
  });

  // Garis Pemisah Total
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(6, y, pageWidth - 6, y);

  // Rincian Pembayaran
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal:', 6, y);
  doc.text(formatRupiah(data.subtotal), pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.text('PB1 / Pajak (10%):', 6, y);
  doc.text(formatRupiah(data.tax), pageWidth - 6, y, { align: 'right' });

  // TOTAL BELANJA TEBAL DAN BESAR
  y += 6;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(6, y - 4, pageWidth - 12, 9, 1.5, 1.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 81, 50);
  doc.text('TOTAL:', 9, y + 2);
  doc.setFontSize(10);
  doc.text(formatRupiah(data.total), pageWidth - 9, y + 2, { align: 'right' });

  // Tunai & Kembalian jika metode cash
  if (data.method === 'cash' && data.cashGiven) {
    y += 9;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Tunai Diterima:', 6, y);
    doc.text(formatRupiah(data.cashGiven), pageWidth - 6, y, { align: 'right' });

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 81, 50);
    doc.text('Kembalian:', 6, y);
    doc.text(formatRupiah(data.change || 0), pageWidth - 6, y, { align: 'right' });
  }

  // Footer Struk
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, y, { align: 'center' });
  
  y += 3.5;
  doc.text('Layanan Konsumen: halo@kasirku.id', pageWidth / 2, y, { align: 'center' });

  // Simpan file PDF
  const filename = `Struk_${data.orderId}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Buat dan unduh Laporan Riwayat Transaksi Penjualan dalam format PDF (Format A4 Resmi)
 */
export function generateHistoryReportPDF(
  transactions: any[],
  summary: {
    totalRevenue: number;
    totalCount: number;
    totalItems: number;
    cashCount: number;
    nonCashCount: number;
    avgBasket: number;
  }
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  let currentY = 16;

  // Header Dokumen Resmi
  doc.setFillColor(15, 81, 50); // #0F5132
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('KASIRKU POS', 14, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('LAPORAN REKAPITULASI TRANSAKSI PENJUALAN', 14, 20);

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${currentDate}`, pageWidth - 14, 20, { align: 'right' });

  currentY = 36;

  // Kotak Ringkasan KPI (4 Kotak Bersebelahan)
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  const cardWidth = 43;
  const cardHeight = 20;
  const gap = 5;
  let startX = 14;

  // Card 1: Total Omset
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL PENDAPATAN', startX + 4, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 81, 50);
  doc.text(formatRupiah(summary.totalRevenue), startX + 4, currentY + 14);

  // Card 2: Total Transaksi
  startX += cardWidth + gap;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL TRANSAKSI', startX + 4, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(`${summary.totalCount} Struk`, startX + 4, currentY + 14);

  // Card 3: Total Item Terjual
  startX += cardWidth + gap;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('ITEM TERJUAL', startX + 4, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(`${summary.totalItems} Porsi`, startX + 4, currentY + 14);

  // Card 4: Rasio Pembayaran
  startX += cardWidth + gap;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(startX, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TUNAI / NON-TUNAI', startX + 4, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`${summary.cashCount} Tunai • ${summary.nonCashCount} Non-Tunai`, startX + 4, currentY + 14);

  currentY += cardHeight + 8;

  // Judul Tabel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 81, 50);
  doc.text('RINCIAN TRANSAKSI PENJUALAN', 14, currentY);

  currentY += 3;

  // Menyiapkan Data Tabel untuk autoTable
  const tableRows = transactions.map((trx, index) => {
    const itemSummary = trx.items
      ?.map((it: any) => `${it.qty}x ${it.name}`)
      .join(', ') || '-';

    return [
      (index + 1).toString(),
      trx.orderId,
      `${trx.date}\n${trx.time || ''}`.trim(),
      trx.customer,
      itemSummary,
      (trx.method || 'CASH').toUpperCase(),
      formatRupiah(trx.total),
      trx.status || 'Selesai',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'ID Transaksi', 'Waktu', 'Pelanggan', 'Menu Pesanan', 'Metode', 'Total (Rp)', 'Status']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 81, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold', textColor: [15, 81, 50] },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 28 },
      4: { cellWidth: 54 },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer Halaman
      const footerY = 288;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'KASIRKU POS — Sistem Kasir Pintar & Terpercaya',
        14,
        footerY
      );
      doc.text(
        `Halaman ${data.pageNumber}`,
        pageWidth - 14,
        footerY,
        { align: 'right' }
      );
    },
  });

  const filename = `Laporan_Transaksi_KasirKu_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
