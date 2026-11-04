"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ApiRequestError, api, setToken } from "@/lib/api";
import {
  resolveCoordinatesFromAddress,
  saveStoredBiodata,
  setPendingScanIntent,
  type PropertyType,
} from "@/lib/profile";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [excited, setExcited] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: ["Nama lengkap wajib diisi."] });
      return;
    }
    if (!email.trim()) {
      setFieldErrors({ email: ["Email wajib diisi."] });
      return;
    }
    if (!phone.trim()) {
      setFieldErrors({ phone: ["Nomor telepon / WhatsApp wajib diisi."] });
      return;
    }
    if (!location.trim()) {
      setFieldErrors({ location: ["Alamat atau kota domisili wajib diisi."] });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: ["Password minimal 8 karakter."] });
      return;
    }
    if (password !== confirmation) {
      setFieldErrors({ password_confirmation: ["Konfirmasi password tidak cocok."] });
      return;
    }

    setBusy(true);
    try {
      const result = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmation,
      });
      setToken(result.token);

      const cleanLocation = location.trim();
      saveStoredBiodata({
        name: result.user.name || name.trim(),
        email: result.user.email || email.trim(),
        phone: phone.trim(),
        propertyType,
        location: cleanLocation,
      });

      const coords = resolveCoordinatesFromAddress(cleanLocation);
      const defaultBill =
        propertyType === "industrial"
          ? 10_000_000
          : propertyType === "commercial"
            ? 5_000_000
            : 2_800_000;

      setPendingScanIntent({
        address: cleanLocation,
        lat: coords.lat,
        lng: coords.lng,
        monthlyBillIdr: defaultBill,
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
      title="Buat Akun Baru"
      subtitle="Isi biodata singkat untuk mulai simulasi atap surya Anda"
      backHref="/"
      backLabel="Kembali"
      isExcited={excited}
      bottomSlot={
        <p className="text-slate-600">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Masuk Sekarang
          </Link>
        </p>
      }
    >
      {message !== null && (
        <div
          role="alert"
          className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200/80"
        >
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {/* Nama Lengkap */}
        <div className="space-y-1 text-left">
          <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700">
            Nama Lengkap
          </label>
          <input
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            placeholder="cth. Muhammad Raditya"
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
              fieldErrors.name ? "border-red-400 bg-red-50/30" : "border-slate-200"
            }`}
          />
          {fieldErrors.name !== undefined && (
            <span className="text-[11px] font-medium text-red-600 block">
              {fieldErrors.name[0]}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1 text-left">
          <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
              fieldErrors.email ? "border-red-400 bg-red-50/30" : "border-slate-200"
            }`}
          />
          {fieldErrors.email !== undefined && (
            <span className="text-[11px] font-medium text-red-600 block">
              {fieldErrors.email[0]}
            </span>
          )}
        </div>

        {/* Biodata Row: No. WhatsApp & Jenis Properti */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="space-y-1">
            <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700">
              No. Telepon / WA
            </label>
            <input
              id="reg-phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              disabled={busy}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
                fieldErrors.phone ? "border-red-400 bg-red-50/30" : "border-slate-200"
              }`}
            />
            {fieldErrors.phone !== undefined && (
              <span className="text-[11px] font-medium text-red-600 block">
                {fieldErrors.phone[0]}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-property" className="block text-xs font-semibold text-slate-700">
              Jenis Properti
            </label>
            <select
              id="reg-property"
              disabled={busy}
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition cursor-pointer"
            >
              <option value="residential">Rumah Tinggal</option>
              <option value="commercial">Ruko / Komersial</option>
              <option value="industrial">Pabrik / Industri</option>
            </select>
          </div>
        </div>

        {/* Biodata: Alamat / Kota Domisili */}
        <div className="space-y-1 text-left">
          <label htmlFor="reg-location" className="block text-xs font-semibold text-slate-700">
            Alamat / Kota Domisili
          </label>
          <input
            id="reg-location"
            type="text"
            required
            autoComplete="street-address"
            placeholder="cth. Jl. Pajajaran No. 42, Kota Bogor"
            disabled={busy}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
              fieldErrors.location ? "border-red-400 bg-red-50/30" : "border-slate-200"
            }`}
          />
          {fieldErrors.location !== undefined && (
            <span className="text-[11px] font-medium text-red-600 block">
              {fieldErrors.location[0]}
            </span>
          )}
        </div>

        {/* Password & Konfirmasi Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                Password (min. 8)
              </label>
            </div>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                data-mascot-password="true"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3.5 py-2 pr-9 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
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
                <span className="material-symbols-outlined text-[16px] leading-none block">
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

          <div className="space-y-1">
            <label htmlFor="reg-password-confirm" className="block text-xs font-semibold text-slate-700">
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                id="reg-password-confirm"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Ulangi password"
                data-mascot-password="true"
                disabled={busy}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className={`w-full px-3.5 py-2 pr-9 rounded-xl bg-slate-50 border text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15 focus:outline-none transition ${
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
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={busy}
            onMouseEnter={() => setExcited(true)}
            onMouseLeave={() => setExcited(false)}
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Mendaftarkan Akun..." : "Daftar & Masuk"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setMessage(
                "Pendaftaran via Google belum diaktifkan pada server lokal. Silakan lengkapi biodata di atas untuk mendaftar.",
              )
            }
            className="w-full py-2 px-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-title font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-2xs"
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
            <span>Daftar dengan Google</span>
          </button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
