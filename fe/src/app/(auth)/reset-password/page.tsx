"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ApiRequestError, api } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      await api.resetPassword({
        token,
        email: emailParam,
        password,
        password_confirmation: confirmation,
      });

      setStatus("success");
      setMessage("Password berhasil diperbarui! Silakan masuk dengan password baru Anda.");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setStatus("error");
      if (caught instanceof ApiRequestError) {
        setMessage(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setMessage("Terjadi kesalahan atau tautan kedaluwarsa.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplitShell
      title="Atur ulang password"
      subtitle="Masukkan password baru untuk akun SunSight Anda"
      backHref="/login"
      backLabel="Kembali ke Masuk"
      bottomSlot={
        <>
          Kembali ke halaman{" "}
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

      {status === "success" ? (
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3.5 px-4 rounded-full bg-[#18191C] hover:bg-[#27292E] text-white font-title font-bold text-xs sm:text-[13px] transition flex items-center justify-center shadow-xs"
          >
            Pergi ke Halaman Masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1 text-left">
            <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700">
              Email Akun
            </label>
            <input
              id="reset-email"
              type="email"
              readOnly
              value={emailParam}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="reset-password" className="block text-xs font-semibold text-slate-700">
              Password Baru
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimal 8 karakter"
                data-mascot-password="true"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
                  fieldErrors.password ? "border-red-400 bg-red-50/30" : "border-slate-200"
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-0.5"
                title="Tampilkan / Sembunyikan Password"
              >
                <span className="material-symbols-outlined text-[17px] leading-none block">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password !== undefined && (
              <span className="text-[11px] font-medium text-red-600 block">
                {fieldErrors.password[0]}
              </span>
            )}
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="reset-confirm" className="block text-xs font-semibold text-slate-700">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                id="reset-confirm"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Ulangi password baru"
                data-mascot-password="true"
                disabled={busy}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
                  fieldErrors.password_confirmation ? "border-red-400 bg-red-50/30" : "border-slate-200"
                }`}
              />
            </div>
            {fieldErrors.password_confirmation !== undefined && (
              <span className="text-[11px] font-medium text-red-600 block">
                {fieldErrors.password_confirmation[0]}
              </span>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 disabled:opacity-60"
            >
              {busy ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </div>
        </form>
      )}
    </AuthSplitShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#ECECEE] flex items-center justify-center p-6 text-xs font-semibold text-zinc-500">
          Memuat halaman pemulihan...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
