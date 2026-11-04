"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ApiRequestError, api, setToken } from "@/lib/api";
import { getStoredBiodata, saveStoredBiodata, useHasToken, useStoredBiodata } from "@/lib/profile";

export default function LoginPage() {
  const router = useRouter();
  const hasToken = useHasToken();
  const currentBio = useStoredBiodata();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [excited, setExcited] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const result = await api.login({ email, password });
      setToken(result.token);

      const existingBio = getStoredBiodata();
      saveStoredBiodata({
        name: result.user.name || existingBio?.name || "Pengguna SunSight",
        email: result.user.email || email,
        phone: existingBio?.phone || "",
        propertyType: existingBio?.propertyType || "residential",
        location: existingBio?.location || "Menteng, Jakarta Pusat",
      });

      router.push("/");
    } catch (caught) {
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
      title="Selamat Datang Kembali"
      subtitle="Masuk ke akun SunSight untuk melanjutkan simulasi atap"
      backHref="/"
      backLabel="Kembali"
      isExcited={excited}
      bottomSlot={
        <p className="text-slate-600">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Daftar Sekarang
          </Link>
        </p>
      }
    >
      {hasToken && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 backdrop-blur-md border border-amber-200/80 text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
          <div>
            <span className="font-bold block text-slate-900">Sesi Masuk Aktif</span>
            <span className="text-[11px] text-amber-900/80">{currentBio?.name || "Pengguna"} ({currentBio?.email || "Akun SunSight"})</span>
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
                setMessage("Anda telah keluar dari akun.");
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-semibold text-[11px] transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {message !== null && (
        <div
          role="alert"
          className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200/80"
        >
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            disabled={busy}
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

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Masukkan password Anda"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
              title="Tampilkan / Sembunyikan Password"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">
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

        {/* Remember & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Ingat saya</span>
          </label>
          <Link href="/forgot-password" className="text-amber-800 hover:text-amber-950 font-medium transition">
            Lupa password?
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            type="submit"
            disabled={busy}
            onMouseEnter={() => setExcited(true)}
            onMouseLeave={() => setExcited(false)}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api.login({ email: "demo.user@sunsight.id", password: "demo" });
                setToken(result.token);
                const existingBio = getStoredBiodata();
                saveStoredBiodata({
                  name: "Pengguna Google Demo",
                  email: "demo.user@sunsight.id",
                  phone: existingBio?.phone || "08123456789",
                  propertyType: existingBio?.propertyType || "residential",
                  location: existingBio?.location || "Menteng, Jakarta Pusat",
                });
                router.push("/");
              } catch {
                setMessage("Gagal masuk dengan akun demo.");
              } finally {
                setBusy(false);
              }
            }}
            className="w-full py-2.5 px-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-[0.99] text-slate-700 font-title font-semibold text-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 shadow-2xs"
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
          </button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
