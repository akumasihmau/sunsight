"use client";

import { useEffect, useRef } from "react";

/**
 * Dialog konfirmasi untuk keputusan yang tidak boleh terjadi tanpa persetujuan.
 *
 * Menggantikan `window.confirm` yang memblokir thread dan tidak dapat diberi gaya:
 * dialog ini dapat difokuskan, ditutup dengan Escape, dan tidak pernah mencetak.
 */
export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  /** Rincian tambahan di bawah deskripsi, mis. nilai terukur. */
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** `danger` untuk tindakan yang membuang pekerjaan pengguna. */
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Fokus awal pada tombol batal: Escape dan Enter tidak boleh langsung membuang
  // pekerjaan, jadi pilihan aman yang dipegang kursor keyboard.
  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmTone =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
      : "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 border-amber-300/80";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs animate-fadeIn"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-amber-200/80 shadow-[0_24px_70px_rgba(245,158,11,0.16),0_4px_24px_rgba(0,0,0,0.06)] p-5 space-y-4 animate-scaleIn">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              tone === "danger"
                ? "bg-rose-100 text-rose-700 border border-rose-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">
              {tone === "danger" ? "warning" : "help"}
            </span>
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="font-title font-extrabold text-slate-900 text-sm">
              {title}
            </h3>
            <p id="confirm-dialog-description" className="text-xs text-slate-600 leading-relaxed mt-1">
              {description}
            </p>
            {detail !== undefined && detail !== "" && (
              <p className="mt-2 px-2.5 py-1.5 rounded-xl bg-[#FAF9F5] border border-amber-200/60 font-code-metric text-[11px] text-slate-700 leading-relaxed">
                {detail}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${confirmTone}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
