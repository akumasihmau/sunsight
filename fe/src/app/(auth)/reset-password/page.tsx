"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type FormEvent } from "react";

import { AuthAlert } from "@/components/auth/AuthAlert";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { api } from "@/lib/api";
import {
  parseAuthError,
  validatePassword,
  validatePasswordConfirmation,
  type AuthAlertData,
} from "@/lib/auth-errors";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [alert, setAlert] = useState<AuthAlertData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setStatus("idle");

    const errors: Record<string, string[]> = {};
    const pwdErr = validatePassword(password);
    if (pwdErr) errors.password = [pwdErr];

    const confErr = validatePasswordConfirmation(password, confirmation);
    if (confErr) errors.password_confirmation = [confErr];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAlert({
        title: "Periksa Kata Sandi Baru",
        description: "Pastikan kata sandi baru memenuhi ketentuan minimal 8 karakter dan konfirmasi cocok.",
      });
      if (errors.password) {
        passwordInputRef.current?.focus();
      } else {
        confirmInputRef.current?.focus();
      }
      return;
    }

    setBusy(true);
    setFieldErrors({});

    try {
      await api.resetPassword({
        token,
        email: emailParam,
        password,
        password_confirmation: confirmation,
      });

      setStatus("success");
      setAlert({
        title: "Kata Sandi Berhasil Diperbarui!",
        description: "Kata sandi akun SunSight Anda telah diganti. Silakan masuk menggunakan kata sandi baru.",
        action: {
          label: "Masuk Sekarang →",
          href: "/login",
        },
      });
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setStatus("error");
      const parsed = parseAuthError(caught, "reset-password");
      setAlert(parsed.alert);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplitShell
      title="Atur Ulang Kata Sandi"
      subtitle="Buat kata sandi baru yang kuat untuk mengamankan kembali akun SunSight Anda."
      backHref="/login"
      backLabel="Kembali ke Masuk"
      bottomSlot={
        <p className="text-slate-600">
          Sudah ingat kata sandi akun Anda?{" "}
          <Link href="/login" className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Masuk Sekarang
          </Link>
        </p>
      }
    >
      {alert && (
        <AuthAlert
          type={status === "success" ? "success" : "error"}
          title={alert.title}
          description={alert.description}
          action={alert.action}
          onDismiss={() => setAlert(null)}
        />
      )}

      {status === "success" ? (
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition flex items-center justify-center shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90"
          >
            Pergi ke Halaman Masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
          <div className="space-y-1 text-left">
            <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700">
              Email Akun
            </label>
            <input
              id="reset-email"
              type="email"
              readOnly
              value={emailParam || "email@sunsight.id"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="reset-password" className="block text-xs font-semibold text-slate-700">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="reset-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimal 8 karakter"
                data-mascot-password="true"
                disabled={busy}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                    : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
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
            {fieldErrors.password?.[0] && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
                <span className="material-symbols-outlined text-[14px] leading-none shrink-0">info</span>
                <span>{fieldErrors.password[0]}</span>
              </span>
            )}
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="reset-confirm" className="block text-xs font-semibold text-slate-700">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                ref={confirmInputRef}
                id="reset-confirm"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Ulangi kata sandi baru"
                data-mascot-password="true"
                disabled={busy}
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  clearFieldError("password_confirmation");
                }}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
                  fieldErrors.password_confirmation
                    ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                    : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
                }`}
              />
            </div>
            {fieldErrors.password_confirmation?.[0] && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
                <span className="material-symbols-outlined text-[14px] leading-none shrink-0">info</span>
                <span>{fieldErrors.password_confirmation[0]}</span>
              </span>
            )}
          </div>

          {/* Live password checklist */}
          <PasswordChecklist password={password} confirmation={confirmation} />

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 disabled:opacity-60"
            >
              {busy ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
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
        <div className="min-h-screen w-full bg-[#FAF9F5] flex items-center justify-center p-6 text-xs font-semibold text-slate-500">
          Memuat halaman pemulihan...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
