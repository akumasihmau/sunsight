"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthAlert } from "@/components/auth/AuthAlert";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { api, googleAuthUrl, setToken } from "@/lib/api";
import {
  parseAuthError,
  validateEmail,
  type AuthAlertData,
} from "@/lib/auth-errors";
import { isOnboardedFor, markOnboardingComplete } from "@/lib/onboarding";
import { getStoredBiodata, saveStoredBiodata, useHasToken, useStoredBiodata } from "@/lib/profile";

export default function LoginPage() {
  const router = useRouter();
  const hasToken = useHasToken();
  const currentBio = useStoredBiodata();

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [alert, setAlert] = useState<AuthAlertData | null>(null);
  const [notice, setNotice] = useState<{ type: "info" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [excited, setExcited] = useState(false);

  // Tampilkan pesan jelas bila pengalihan OAuth Google gagal kembali dengan `?error=…`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (!oauthError) return;

    const timer = window.setTimeout(() => {
      if (oauthError === "google_email_missing") {
        setAlert({
          title: "Email Google Tidak Tersedia",
          description:
            "Akun Google Anda tidak menyertakan alamat email terverifikasi. Silakan gunakan akun lain atau masuk dengan email.",
        });
      } else if (oauthError === "google_failed") {
        setAlert({
          title: "Masuk dengan Google Gagal",
          description:
            "Autentikasi Google dibatalkan atau gagal diproses. Silakan coba lagi atau masuk dengan email dan kata sandi.",
        });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Clear specific field error when user modifies value
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setNotice(null);

    // 1. Client-side pre-validation: validate all fields together
    const errors: Record<string, string[]> = {};
    const emailError = validateEmail(email);
    if (emailError) {
      errors.email = [emailError];
    }
    if (!password.trim()) {
      errors.password = ["Kata sandi wajib diisi."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAlert({
        title: "Periksa Kembali Isian Anda",
        description: "Harap periksa alamat email dan kata sandi Anda sebelum melanjutkan.",
      });

      if (errors.email) {
        emailInputRef.current?.focus();
      } else if (errors.password) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setBusy(true);
    setFieldErrors({});

    try {
      const result = await api.login({ email: email.trim(), password });
      setToken(result.token, { remember });

      const existingBio = getStoredBiodata();
      const propType =
        result.user.property_type === "commercial" ||
        result.user.property_type === "industrial" ||
        result.user.property_type === "residential"
          ? result.user.property_type
          : existingBio?.propertyType || "residential";

      saveStoredBiodata({
        name: result.user.name || existingBio?.name || "Pengguna SunSight",
        email: result.user.email || email.trim(),
        phone: result.user.phone ?? existingBio?.phone ?? "",
        propertyType: propType,
        location: result.user.location ?? existingBio?.location ?? "Kota Bogor, Jawa Barat",
      });

      const rawRedirect =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      // Hanya izinkan path internal relatif (mencegah open redirect ke domain luar).
      const redirectTarget =
        rawRedirect &&
        rawRedirect.startsWith("/") &&
        !rawRedirect.startsWith("//") &&
        !rawRedirect.startsWith("/\\")
          ? rawRedirect
          : "/";

      // Status onboarding milik akun, bukan milik peramban: server menyimpan
      // `onboarding_completed_at`, jadi akun lama tidak di-onboard ulang di perangkat
      // baru. Penanda lokal hanya dipakai bila server belum punya catatannya.
      const alreadyOnboarded =
        result.user.onboarding_completed_at !== null || isOnboardedFor(result.user.email);

      if (result.user.onboarding_completed_at !== null) {
        markOnboardingComplete(result.user.email);
      }

      router.push(alreadyOnboarded ? redirectTarget : "/onboarding");
    } catch (caught) {
      const parsed = parseAuthError(caught, "login");
      setAlert(parsed.alert);
      setFieldErrors(parsed.fieldErrors);

      if (parsed.fieldErrors.password) {
        passwordInputRef.current?.focus();
      } else if (parsed.fieldErrors.email) {
        emailInputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplitShell
      title="Selamat Datang Kembali"
      subtitle="Masuk ke akun SunSight untuk melanjutkan perancangan & analisis PLTS atap Anda."
      backHref="/"
      backLabel="Kembali"
      isExcited={excited}
      bottomSlot={
        <p className="text-slate-600">
          Belum memiliki akun SunSight?{" "}
          <Link href="/register" className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Daftar Gratis Sekarang
          </Link>
        </p>
      }
    >
      {hasToken && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 backdrop-blur-md border border-amber-200/80 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 shadow-2xs">
          <div className="min-w-0">
            <span className="font-bold block text-slate-900">Sesi Masuk Aktif</span>
            <span className="block truncate text-[11px] text-amber-900/80">{currentBio?.name || "Pengguna"} ({currentBio?.email || "Akun SunSight"})</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-[11px] shadow-sm shadow-amber-500/20 transition"
            >
              Ke Beranda
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.logout();
                } catch {}
                setToken(null);
                setAlert(null);
                setNotice({
                  type: "info",
                  text: "Anda telah keluar dari akun SunSight.",
                });
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-semibold text-[11px] transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* Notice info banner (e.g. after logout) */}
      {notice && (
        <AuthAlert
          type={notice.type}
          description={notice.text}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Interactive Error / Alert banner */}
      {alert && (
        <AuthAlert
          type="error"
          title={alert.title}
          description={alert.description}
          action={alert.action}
          onDismiss={() => setAlert(null)}
        />
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email
          </label>
          <input
            ref={emailInputRef}
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            disabled={busy}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-xs placeholder:text-slate-400 focus:outline-none transition ${
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

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
            Kata Sandi
          </label>
          <div className="relative">
            <input
              ref={passwordInputRef}
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Masukkan kata sandi akun Anda"
              data-mascot-password="true"
              disabled={busy}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 pr-11 rounded-xl border text-sm sm:text-xs placeholder:text-slate-400 focus:outline-none transition ${
                fieldErrors.password
                  ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                  : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-2"
              title="Tampilkan / Sembunyikan Kata Sandi"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">
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

        {/* Remember & Forgot Password */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
          <label className="inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Ingat saya di perangkat ini</span>
          </label>
          <Link href="/forgot-password" className="text-amber-800 hover:text-amber-950 font-medium transition">
            Lupa kata sandi?
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            type="submit"
            disabled={busy}
            onMouseEnter={() => setExcited(true)}
            onMouseLeave={() => setExcited(false)}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Memproses Masuk..." : "Masuk ke Dashboard"}
          </button>

          {/* Divider */}
          <div className="relative my-2.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/70" />
            </div>
            <div className="relative flex justify-center text-[11px] font-medium text-slate-400">
              <span className="bg-white px-3">atau lanjutkan dengan</span>
            </div>
          </div>

          {/* Navigasi penuh ke backend: alur OAuth tidak boleh lewat router klien. */}
          <a
            href={googleAuthUrl()}
            className="w-full py-2.5 px-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-[0.99] text-slate-700 font-title font-semibold text-xs transition flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </a>
        </div>
      </form>
    </AuthSplitShell>
  );
}
