"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { AuthAlert } from "@/components/auth/AuthAlert";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { api } from "@/lib/api";
import {
  parseAuthError,
  validateEmail,
  type AuthAlertData,
} from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [alert, setAlert] = useState<AuthAlertData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setStatus("idle");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldErrors({ email: [emailErr] });
      setAlert({
        title: "Periksa Alamat Email",
        description: "Harap masukkan alamat email yang valid untuk menerima tautan pemulihan.",
      });
      emailInputRef.current?.focus();
      return;
    }

    setBusy(true);
    setFieldErrors({});

    try {
      await api.forgotPassword({ email: email.trim() });
      setStatus("success");
      setAlert({
        title: "Tautan Pemulihan Terkirim!",
        description:
          "Kami telah mengirimkan instruksi dan tautan atur ulang kata sandi ke email Anda. Silakan periksa kotak masuk atau folder spam.",
      });
      setEmail("");
    } catch (caught) {
      setStatus("error");
      const parsed = parseAuthError(caught, "forgot-password");
      setAlert(parsed.alert);
      setFieldErrors(parsed.fieldErrors);
      emailInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplitShell
      title="Lupa Kata Sandi?"
      subtitle="Masukkan email akun Anda untuk menerima instruksi pemulihan kata sandi secara aman."
      backHref="/login"
      backLabel="Kembali ke Masuk"
      bottomSlot={
        <p className="text-slate-600">
          Sudah ingat kata sandi akun Anda?{" "}
          <Link href="/login" className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Kembali ke Masuk
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

      {/* Helpful Guidance Notice Card */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-left flex items-start gap-2.5 mb-3">
        <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">mail_lock</span>
        <div className="text-[12px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800 block">Prosedur Pemulihan Akun</span>
          Tautan verifikasi resmi yang aktif selama 60 menit akan dikirimkan ke email terdaftar Anda untuk mengatur ulang kata sandi.
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        <div className="space-y-1.5 text-left">
          <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email Terdaftar
          </label>
          <input
            ref={emailInputRef}
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@domain.com"
            disabled={busy || status === "success"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors({});
              }
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
              fieldErrors.email
                ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
            }`}
          />
          {fieldErrors.email?.[0] && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
              <span className="material-symbols-outlined text-[14px] leading-none shrink-0">info</span>
              <span>{fieldErrors.email[0]}</span>
            </span>
          )}
        </div>

        <div className="pt-2 space-y-2.5">
          <button
            type="submit"
            disabled={busy || status === "success"}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Mengirim Tautan..." : status === "success" ? "Tautan Terkirim" : "Kirim Tautan Pemulihan Kata Sandi"}
          </button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
