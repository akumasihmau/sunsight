"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ApiRequestError, api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
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
      await api.forgotPassword({ email });
      setStatus("success");
      setMessage(
        "Tautan atur ulang password telah dikirim. Silakan periksa kotak masuk atau folder spam email Anda.",
      );
      setEmail("");
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
    <AuthSplitShell
      title="Lupa password?"
      subtitle="Masukkan email terdaftar untuk menerima tautan pemulihan"
      backHref="/login"
      backLabel="Kembali ke Masuk"
      bottomSlot={
        <>
          Ingat password Anda?{" "}
          <Link href="/login" className="font-bold text-[#18191C] hover:underline ml-0.5">
            Masuk
          </Link>
        </>
      }
    >
      {status === "error" && message !== null && (
        <div
          role="alert"
          className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200/80"
        >
          {message}
        </div>
      )}

      {status === "success" && message !== null && (
        <div
          role="alert"
          className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80"
        >
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1 text-left">
          <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            disabled={busy || status === "success"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
              fieldErrors.email ? "border-red-400 bg-red-50/30" : "border-slate-200"
            }`}
          />
          {fieldErrors.email !== undefined && (
            <span className="text-[11px] font-medium text-red-600 block">
              {fieldErrors.email[0]}
            </span>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={busy || status === "success"}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Mengirim Tautan..." : status === "success" ? "Tautan Terkirim" : "Kirim Tautan Pemulihan"}
          </button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
