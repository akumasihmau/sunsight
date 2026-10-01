"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";

import { ApiRequestError, api } from "@/lib/api";

// Memisahkan komponen form agar bisa dibungkus dengan Suspense
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Mengambil token dan email dari URL bawaan link Laravel
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
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
      // Pastikan fungsi ini sudah ada di src/lib/api.ts
      await api.resetPassword({
        token,
        email: emailParam,
        password,
        password_confirmation: confirmation,
      });

      setStatus("success");
      setMessage("Password Anda berhasil diatur ulang! Silakan masuk menggunakan password baru Anda.");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setStatus("error");
      if (caught instanceof ApiRequestError) {
        setMessage(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setMessage("Terjadi kesalahan atau tautan kadaluarsa.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 sm:p-10 space-y-6">
      {/* Header Form */}
      <div className="text-center space-y-3 mb-2">
        <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
          Keamanan
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-headline-lg">
          Atur Ulang Password
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Silakan masukkan password baru untuk akun Anda.
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
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">check_circle</span>
          <p>{message}</p>
        </div>
      )}

      {status === "success" ? (
        // Jika sukses, sembunyikan form dan tampilkan tombol untuk ke halaman login
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-title text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Pergi ke Halaman Masuk</span>
            <span className="material-symbols-outlined text-[18px]">login</span>
          </Link>
        </div>
      ) : (
        // Jika belum sukses, tampilkan form pengisian password baru
        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Input Email (Read Only - Sebagai Informasi Saja) */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email Akun</span>
            <input
              type="email"
              readOnly
              value={emailParam}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed"
            />
          </label>

          {/* Input Password Baru */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Password Baru</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              disabled={busy}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-slate-100 ${
                fieldErrors.password 
                  ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20' 
                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
              }`}
            />
            {fieldErrors.password !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {fieldErrors.password[0]}
              </span>
            )}
          </label>

          {/* Input Konfirmasi Password Baru */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi Password Baru</span>
            <input
              type="password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="••••••••"
              disabled={busy}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-slate-100 ${
                fieldErrors.password_confirmation 
                  ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20' 
                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
              }`}
            />
            {fieldErrors.password_confirmation !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {fieldErrors.password_confirmation[0]}
              </span>
            )}
          </label>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-title text-sm font-bold shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {busy ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>Simpan Password Baru</span>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Komponen Utama Page yang diekspor (membungkus form dengan Suspense)
export default function ResetPasswordPage() {
  return (
    <div className="bg-slate-50 font-body-md text-on-surface antialiased selection:bg-amber-100 selection:text-amber-900 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-10 flex flex-col items-center justify-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-amber-500 animate-spin">progress_activity</span>
          <p className="text-sm font-semibold text-slate-500">Memuat data tautan...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}