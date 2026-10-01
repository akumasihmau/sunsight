"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ApiRequestError, api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  // Tambahan state status untuk membedakan alert sukses dan error
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("idle");
    setMessage(null);
    setFieldErrors({});

    try {
      // Catatan: Pastikan Anda sudah menambahkan metode forgotPassword di src/lib/api.ts
      await api.forgotPassword({ email });
      
      setStatus("success");
      setMessage("Tautan atur ulang password telah dikirim. Silakan periksa kotak masuk atau folder spam email Anda.");
      setEmail(""); // Kosongkan input setelah sukses
    } catch (caught) {
      setStatus("error");
      if (caught instanceof ApiRequestError) {
        setMessage(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setMessage("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-slate-50 font-body-md text-on-surface antialiased selection:bg-amber-100 selection:text-amber-900 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      
      {/* Tautan Kembali */}
      <div className="w-full max-w-md mb-6 flex justify-start">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali ke Halaman Masuk
        </Link>
      </div>

      <form 
        onSubmit={onSubmit} 
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 sm:p-10 space-y-6"
      >
        {/* Header Form */}
        <div className="text-center space-y-3 mb-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            Pemulihan
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-headline-lg">
            Lupa Password?
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Masukkan alamat email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
          </p>
        </div>

        {/* Alert Box (Error) */}
        {status === "error" && message !== null && (
          <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium flex items-start gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
            <p>{message}</p>
          </div>
        )}

        {/* Alert Box (Success) */}
        {status === "success" && message !== null && (
          <div role="alert" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-start gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">mark_email_read</span>
            <p>{message}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Input Email */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              disabled={busy}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-slate-100 ${
                fieldErrors.email 
                  ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20' 
                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
              }`}
            />
            {fieldErrors.email !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {fieldErrors.email[0]}
              </span>
            )}
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || status === "success"}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-title text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {busy ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span>Mengirim Tautan...</span>
            </>
          ) : status === "success" ? (
            <>
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Tautan Terkirim</span>
            </>
          ) : (
            <>
              <span>Kirim Tautan Atur Ulang</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}