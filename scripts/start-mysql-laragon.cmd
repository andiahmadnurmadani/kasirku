@echo off
REM Menyalakan MySQL 8.4 milik Laragon tanpa aplikasi Laragon / tanpa hak Administrator.
REM Biarkan jendela ini terbuka selama MySQL dipakai. Tekan Ctrl+C untuk mematikan.
set "MYSQL_DIR=D:\laragon\bin\mysql\mysql-8.4.3-winx64"
if not exist "%MYSQL_DIR%\bin\mysqld.exe" (
  echo [ERROR] mysqld.exe tidak ditemukan di %MYSQL_DIR%\bin
  exit /b 1
)
echo Menyalakan MySQL di port 3306 ...
"%MYSQL_DIR%\bin\mysqld.exe" --defaults-file="%MYSQL_DIR%\my.ini" --standalone --console
