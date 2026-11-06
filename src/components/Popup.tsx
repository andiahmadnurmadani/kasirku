/**
 * Komponen pop-up KasirKu: Modal, ConfirmDialog, dan Toast.
 * Dipakai sebagai pengganti alert()/confirm() bawaan browser.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

/* ============================== MODAL ============================== */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Cegah tutup lewat ESC/klik latar saat sedang menyimpan */
  locked?: boolean;
  /** Warna wadah ikon: hijau (default) atau merah untuk aksi berbahaya */
  iconTone?: 'primary' | 'danger';
}

const SIZE_CLASS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, subtitle, icon, children, footer, size = 'md', locked = false, iconTone = 'primary' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Simpan callback terbaru di ref agar efek di bawah hanya berjalan saat modal dibuka/ditutup,
  // bukan setiap render (kalau tidak, fokus akan melompat ke input pertama saat mengetik).
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);
  onCloseRef.current = onClose;
  lockedRef.current = locked;

  // Tutup dengan ESC + kunci scroll halaman + fokus awal, sekali per pembukaan modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Fokus ke input pertama agar bisa langsung mengetik (tunggu animasi masuk selesai)
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]');
      el?.focus();
    }, 200);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
            onClick={() => !locked && onClose()}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${SIZE_CLASS[size]} bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-start gap-3">
                {icon && (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      iconTone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-[#E8F5E9] text-[#0F5132]'
                    }`}
                  >
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">{title}</h3>
                  {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={locked}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================== CONFIRM DIALOG ========================== */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const danger = tone === 'danger';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      locked={loading}
      iconTone={danger ? 'danger' : 'primary'}
      icon={danger ? <AlertTriangle size={18} /> : <Info size={18} />}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={loading} className={BTN_SECONDARY}>
            {cancelLabel}
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onConfirm}
            disabled={loading}
            className={danger ? BTN_DANGER : BTN_PRIMARY}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-gray-700 leading-relaxed">{message}</div>
    </Modal>
  );
}

/* ============================== TOAST ============================== */

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}
interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  const api = useRef<ToastApi>({
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
    info: (t, m) => push('info', t, m),
  });
  // Selalu pakai push terbaru
  api.current.success = (t, m) => push('success', t, m);
  api.current.error = (t, m) => push('error', t, m);
  api.current.info = (t, m) => push('info', t, m);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.18 }}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto rounded-xl border shadow-lg p-3 flex items-start gap-2.5 bg-white ${
                t.type === 'success'
                  ? 'border-emerald-200'
                  : t.type === 'error'
                  ? 'border-rose-200'
                  : 'border-blue-200'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : t.type === 'error' ? (
                <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{t.title}</p>
                {t.message && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}

/* ======================= KELAS TOMBOL & INPUT ======================= */

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0B3D26] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const BTN_DANGER =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const INPUT_CLASS =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/15 transition-colors';
export const LABEL_CLASS = 'block text-xs font-semibold text-gray-700 mb-1';
