"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { AuthAlert } from "@/components/auth/AuthAlert";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { api, setToken } from "@/lib/api";
import {
  parseAuthError,
  validateEmail,
  validateFullName,
  validateLocation,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
  type AuthAlertData,
} from "@/lib/auth-errors";
import {
  resolveCoordinatesFromAddress,
  saveStoredBiodata,
  setPendingScanIntent,
  type PropertyType,
} from "@/lib/profile";

export default function RegisterPage() {
  const router = useRouter();

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [alert, setAlert] = useState<AuthAlertData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [excited, setExcited] = useState(false);

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

    // 1. Client-side pre-validation: validate all fields simultaneously
    const errors: Record<string, string[]> = {};

    const nameErr = validateFullName(name);
    if (nameErr) errors.name = [nameErr];

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = [emailErr];

    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.phone = [phoneErr];

    const locErr = validateLocation(location);
    if (locErr) errors.location = [locErr];

    const pwdErr = validatePassword(password);
    if (pwdErr) errors.password = [pwdErr];

    const confErr = validatePasswordConfirmation(password, confirmation);
    if (confErr) errors.password_confirmation = [confErr];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAlert({
        title: "Periksa Kembali Isian Anda",
        description: "Beberapa kolom biodata atau kata sandi belum lengkap atau belum sesuai ketentuan.",
      });

      // Auto-focus first erroneous input
      if (errors.name) {
        nameInputRef.current?.focus();
      } else if (errors.email) {
        emailInputRef.current?.focus();
      } else if (errors.phone) {
        phoneInputRef.current?.focus();
      } else if (errors.location) {
        locationInputRef.current?.focus();
      } else if (errors.password) {
        passwordInputRef.current?.focus();
      } else if (errors.password_confirmation) {
        confirmInputRef.current?.focus();
      }
      return;
    }

    setBusy(true);
    setFieldErrors({});

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

      router.push("/onboarding");
    } catch (caught) {
      const parsed = parseAuthError(caught, "register");
      setAlert(parsed.alert);
      setFieldErrors(parsed.fieldErrors);

      if (parsed.fieldErrors.email) {
        emailInputRef.current?.focus();
      } else if (parsed.fieldErrors.password) {
        passwordInputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  const redirectTarget =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect")
      : null;
  const loginHref = redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : "/login";

  return (
    <AuthSplitShell
      title="Buat Akun SunSight"
      subtitle="Daftar akun gratis untuk menyimpan desain atap surya, analisis finansial, dan proposal teknis."
      backHref="/"
      backLabel="Kembali"
      isExcited={excited}
      bottomSlot={
        <p className="text-slate-600">
          Sudah memiliki akun SunSight?{" "}
          <Link href={loginHref} className="font-bold text-amber-800 hover:text-amber-950 hover:underline ml-1">
            Masuk Sekarang
          </Link>
        </p>
      }
    >
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

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {/* Nama Lengkap */}
        <div className="space-y-1 text-left">
          <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700">
            Nama Lengkap
          </label>
          <input
            ref={nameInputRef}
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            placeholder="cth. Muhammad Raditya"
            disabled={busy}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
              fieldErrors.name
                ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
            }`}
          />
          {fieldErrors.name?.[0] && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
              <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
              <span>{fieldErrors.name[0]}</span>
            </span>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1 text-left">
          <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
            Alamat Email
          </label>
          <input
            ref={emailInputRef}
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            disabled={busy}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
              fieldErrors.email
                ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
            }`}
          />
          {fieldErrors.email?.[0] && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
              <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
              <span>{fieldErrors.email[0]}</span>
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
              ref={phoneInputRef}
              id="reg-phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              disabled={busy}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError("phone");
              }}
              className={`w-full px-3.5 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
                fieldErrors.phone
                  ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                  : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
              }`}
            />
            {fieldErrors.phone?.[0] && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
                <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
                <span>{fieldErrors.phone[0]}</span>
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
            ref={locationInputRef}
            id="reg-location"
            type="text"
            required
            autoComplete="street-address"
            placeholder="cth. Jl. Pajajaran No. 42, Kota Bogor"
            disabled={busy}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearFieldError("location");
            }}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
              fieldErrors.location
                ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
            }`}
          />
          {fieldErrors.location?.[0] && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
              <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
              <span>{fieldErrors.location[0]}</span>
            </span>
          )}
        </div>

        {/* Password & Konfirmasi Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="space-y-1">
            <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                data-mascot-password="true"
                disabled={busy}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className={`w-full px-3.5 py-2 pr-9 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
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
                <span className="material-symbols-outlined text-[16px] leading-none block">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password?.[0] && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
                <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
                <span>{fieldErrors.password[0]}</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-password-confirm" className="block text-xs font-semibold text-slate-700">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <input
                ref={confirmInputRef}
                id="reg-password-confirm"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Ulangi kata sandi"
                data-mascot-password="true"
                disabled={busy}
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  clearFieldError("password_confirmation");
                }}
                className={`w-full px-3.5 py-2 pr-9 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-none transition ${
                  fieldErrors.password_confirmation
                    ? "border-rose-400 bg-rose-50/20 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                    : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-3 focus:ring-amber-400/15"
                }`}
              />
            </div>
            {fieldErrors.password_confirmation?.[0] && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-1">
                <span className="material-symbols-outlined text-[13px] leading-none shrink-0">info</span>
                <span>{fieldErrors.password_confirmation[0]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Password Strength & Match Checklist */}
        <PasswordChecklist password={password} confirmation={confirmation} />

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={busy}
            onMouseEnter={() => setExcited(true)}
            onMouseLeave={() => setExcited(false)}
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 active:scale-[0.99] text-amber-950 font-title font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Mendaftarkan Akun..." : "Daftar & Masuk"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setAlert({
                title: "Daftar dengan Google",
                description:
                  "Pendaftaran instan via Google belum diaktifkan pada server lokal. Silakan lengkapi formulir di atas untuk mendaftar langsung.",
              })
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
