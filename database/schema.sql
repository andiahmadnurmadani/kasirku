-- ========================================================
-- Database Schema untuk KasirKu POS (Sistem Kasir Modern)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `kasirku_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `kasirku_db`;

-- 1. Tabel Kategori Menu
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Produk / Menu Makanan & Minuman
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `price` INT NOT NULL DEFAULT 0,
  `popular` TINYINT(1) NOT NULL DEFAULT 0,
  `image` VARCHAR(500) NOT NULL,
  `desc` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_popular` (`popular`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Header Riwayat Transaksi
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL UNIQUE,
  `date` VARCHAR(50) NOT NULL,
  `time` VARCHAR(20) NOT NULL,
  `customer` VARCHAR(150) NOT NULL DEFAULT 'Pelanggan Umum',
  `cashier` VARCHAR(100) NOT NULL DEFAULT 'Kasir 01 (Siti)',
  `subtotal` INT NOT NULL DEFAULT 0,
  `tax` INT NOT NULL DEFAULT 0,
  `total` INT NOT NULL DEFAULT 0,
  `method` ENUM('cash', 'qris', 'debit') NOT NULL DEFAULT 'cash',
  `cash_given` INT DEFAULT NULL,
  `change_amount` INT DEFAULT NULL,
  `status` ENUM('Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Selesai',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_method` (`method`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Detail Item Transaksi (One-to-Many dari transactions)
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` INT NOT NULL,
  `product_id` INT DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` INT NOT NULL DEFAULT 0,
  `qty` INT NOT NULL DEFAULT 1,
  `image` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transaction_items_transaction` 
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transaction_items_product` 
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

