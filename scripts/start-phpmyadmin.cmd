@echo off
REM Menjalankan phpMyAdmin bawaan Laragon memakai web server bawaan PHP (tanpa Apache).
REM Buka http://localhost:8080 lalu login dengan user root MySQL.
REM Biarkan jendela ini terbuka selama phpMyAdmin dipakai. Tekan Ctrl+C untuk mematikan.
set "PHP_DIR=D:\laragon\bin\php\php-8.3.30-Win32-vs16-x64"
set "PMA_DIR=D:\laragon\etc\apps\phpmyadmin"
set "PMA_PORT=8080"
if not exist "%PHP_DIR%\php.exe" (
  echo [ERROR] php.exe tidak ditemukan di %PHP_DIR%
  exit /b 1
)
if not exist "%PMA_DIR%\index.php" (
  echo [ERROR] phpMyAdmin tidak ditemukan di %PMA_DIR%
  exit /b 1
)
echo phpMyAdmin berjalan di http://localhost:%PMA_PORT%
"%PHP_DIR%\php.exe" -c "%PHP_DIR%\php.ini" -S localhost:%PMA_PORT% -t "%PMA_DIR%"
