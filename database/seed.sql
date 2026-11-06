-- ========================================================
-- Seed Data untuk KasirKu POS (Sesuai Data Front-End)
-- ========================================================

USE `kasirku_db`;

-- Seed Kategori
INSERT INTO `categories` (`slug`, `name`) VALUES
('makanan', 'Makanan'),
('minuman', 'Minuman'),
('snack', 'Cemilan'),
('paket', 'Paket Hemat')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Produk Menu (Sesuai MENU_CATALOG di src/App.tsx)
INSERT INTO `products` (`id`, `name`, `category`, `price`, `popular`, `image`, `desc`) VALUES
(1, 'Ayam Goreng Lengkuas', 'makanan', 28000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Ayam renyah berempah dengan serundeng lengkuas & sambal'),
(2, 'Bebek Goreng Sambal Korek', 'makanan', 35000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Bebek empuk goreng garing dengan pedas nendang sambal korek'),
(3, 'Nasi Goreng Spesial KasirKu', 'makanan', 24000, 1, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Nasi goreng harum wajan dengan telur mata sapi & kerupuk'),
(4, 'Mie Goreng Seafood Pedas', 'makanan', 26000, 0, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Mie telur kenyal dengan udang, cumi, dan sayuran segar'),
(5, 'Soto Betawi Daging Sapi', 'makanan', 38000, 0, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Kuah santan susu gurih rempah dengan potongan daging sapi empuk'),
(6, 'Sate Ayam Madura (10 tsk)', 'makanan', 30000, 0, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Daging ayam bakar empuk dengan bumbu kacang legit khas Madura'),
(7, 'Es Teh Manis Jumbo', 'minuman', 6000, 1, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg', 'Teh melati seduh segar dingin ukuran jumbo'),
(8, 'Es Jeruk Peras Segar', 'minuman', 9000, 0, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg', 'Jeruk peras murni kaya vitamin C dengan es batu segar'),
(9, 'Kopi Susu Gula Aren', 'minuman', 18000, 1, '/src/assets/images/kopi_susu_aren_1793416316788.jpg', 'Espresso robusta & susu creamy dengan sirup aren asli'),
(10, 'Jus Alpukat Kocok', 'minuman', 16000, 0, '/src/assets/images/kopi_susu_aren_1793416316788.jpg', 'Alpukat mentega kental dengan saus cokelat manis'),
(11, 'Tahu Cabe Garam Krispi', 'snack', 14000, 1, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Tahu goreng renyah bumbu bawang putih dan cabe rawit cincang'),
(12, 'Pisang Bakar Keju Cokelat', 'snack', 16000, 0, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Pisang kepok manis bakar dengan parutan keju & meses'),
(13, 'Tempe Mendoan (4 pcs)', 'snack', 12000, 0, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg', 'Tempe berbalut tepung daun bawang gurih cocol sambal kecap'),
(14, 'Paket Hemat: Ayam + Nasi + Es Teh', 'paket', 35000, 1, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg', 'Komplit hemat: 1 Ayam Goreng Lengkuas, Nasi Pulen & Es Teh'),
(15, 'Paket Berdua: 2 Nasi Goreng + 2 Es Teh', 'paket', 50000, 1, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg', 'Pilihan pas untuk 2 porsi: Nasi Goreng Spesial + 2 Es Teh')
ON DUPLICATE KEY UPDATE 
  `name`=VALUES(`name`),
  `category`=VALUES(`category`),
  `price`=VALUES(`price`),
  `popular`=VALUES(`popular`),
  `image`=VALUES(`image`),
  `desc`=VALUES(`desc`);

-- Seed Riwayat Transaksi (Sesuai INITIAL_TRANSACTIONS di src/App.tsx)
-- Transaksi 1: TRX-948102
INSERT INTO `transactions` (`id`, `order_id`, `date`, `time`, `customer`, `cashier`, `subtotal`, `tax`, `total`, `method`, `cash_given`, `change_amount`, `status`)
VALUES (1, 'TRX-948102', '30 Okt 2026', '18:42', 'Meja 02 - Kak Dian', 'Kasir 01 (Siti)', 82000, 8200, 90200, 'qris', NULL, NULL, 'Selesai')
ON DUPLICATE KEY UPDATE `order_id`=VALUES(`order_id`);

INSERT INTO `transaction_items` (`transaction_id`, `product_id`, `name`, `price`, `qty`, `image`) VALUES
(1, 1, 'Ayam Goreng Lengkuas', 28000, 2, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg'),
(1, 7, 'Es Teh Manis Jumbo', 6000, 2, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg'),
(1, 11, 'Tahu Cabe Garam Krispi', 14000, 1, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg');

-- Transaksi 2: TRX-948089
INSERT INTO `transactions` (`id`, `order_id`, `date`, `time`, `customer`, `cashier`, `subtotal`, `tax`, `total`, `method`, `cash_given`, `change_amount`, `status`)
VALUES (2, 'TRX-948089', '30 Okt 2026', '17:30', 'Meja 09 - Mas Rian', 'Kasir 01 (Siti)', 84000, 8400, 92400, 'cash', 100000, 7600, 'Selesai')
ON DUPLICATE KEY UPDATE `order_id`=VALUES(`order_id`);

INSERT INTO `transaction_items` (`transaction_id`, `product_id`, `name`, `price`, `qty`, `image`) VALUES
(2, 3, 'Nasi Goreng Spesial KasirKu', 24000, 2, '/src/assets/images/nasi_goreng_spesial_1793416316160.jpg'),
(2, 9, 'Kopi Susu Gula Aren', 18000, 2, '/src/assets/images/kopi_susu_aren_1793416316788.jpg');

-- Transaksi 3: TRX-948065
INSERT INTO `transactions` (`id`, `order_id`, `date`, `time`, `customer`, `cashier`, `subtotal`, `tax`, `total`, `method`, `cash_given`, `change_amount`, `status`)
VALUES (3, 'TRX-948065', '30 Okt 2026', '16:15', 'Takeaway - Mbak Lina', 'Kasir 01 (Siti)', 129000, 12900, 141900, 'debit', NULL, NULL, 'Selesai')
ON DUPLICATE KEY UPDATE `order_id`=VALUES(`order_id`);

INSERT INTO `transaction_items` (`transaction_id`, `product_id`, `name`, `price`, `qty`, `image`) VALUES
(3, 14, 'Paket Hemat: Ayam + Nasi + Es Teh', 35000, 3, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg'),
(3, 13, 'Tempe Mendoan (4 pcs)', 12000, 2, '/src/assets/images/tahu_cabe_garam_1793416319216.jpg');

-- Transaksi 4: TRX-948030
INSERT INTO `transactions` (`id`, `order_id`, `date`, `time`, `customer`, `cashier`, `subtotal`, `tax`, `total`, `method`, `cash_given`, `change_amount`, `status`)
VALUES (4, 'TRX-948030', '30 Okt 2026', '14:05', 'Meja 04 - Pak Joko', 'Kasir 01 (Siti)', 88000, 8800, 96800, 'cash', 100000, 3200, 'Selesai')
ON DUPLICATE KEY UPDATE `order_id`=VALUES(`order_id`);

INSERT INTO `transaction_items` (`transaction_id`, `product_id`, `name`, `price`, `qty`, `image`) VALUES
(4, 2, 'Bebek Goreng Sambal Korek', 35000, 2, '/src/assets/images/ayam_goreng_lengkuas_1793416315782.jpg'),
(4, 8, 'Es Jeruk Peras Segar', 9000, 2, '/src/assets/images/es_teh_manis_jumbo_1793416317814.jpg');

