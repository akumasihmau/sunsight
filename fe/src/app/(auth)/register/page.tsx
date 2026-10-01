"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiRequestError, api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const result = await api.register({
        name,
        email,
        password,
        password_confirmation: confirmation,
      });
      setToken(result.token);
      router.push("/studio");
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

  const fields: Array<{
    key: string;
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
  }> = [
    {
      key: "name",
      label: "Nama",
      type: "text",
      value: name,
      onChange: setName,
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      value: email,
      onChange: setEmail,
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      value: password,
      onChange: setPassword,
    },
    {
      key: "password_confirmation",
      label: "Ulangi password",
      type: "password",
      value: confirmation,
      onChange: setConfirmation,
    },
  ];

  return (
    <div className="bg-slate-50 font-body-md text-on-surface antialiased selection:bg-amber-100 selection:text-amber-900 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Tautan Kembali ke Beranda */}
      <div className="w-full max-w-md mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Kembali ke Beranda
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 sm:p-10 space-y-6"
      >
        {/* Header Form */}
        <div className="text-center space-y-3 mb-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            Akun
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-headline-lg">
            Daftar ke SunSight
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Daftar untuk menyimpan simulasi ke riwayat dan membukanya kembali
            kapan saja.
          </p>
        </div>

        {/* Alert Box (Error Message) */}
        {message !== null && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium flex items-start gap-2.5 animate-fadeIn"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
              error
            </span>
            <p>{message}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Input Nama */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama
            </span>
            <input
              type="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama Lengkap"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.name
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20"
              }`}
            />
            {fieldErrors.name !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                {fieldErrors.name[0]}
              </span>
            )}
          </label>

          {/* Input Email */}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alamat Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.email
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20"
              }`}
            />
            {fieldErrors.email !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                {fieldErrors.email[0]}
              </span>
            )}
          </label>

          {/* Input Password */}
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-semibold text-slate-700">
                Password
              </span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.password
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20"
              }`}
            />
            {fieldErrors.password !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                {fieldErrors.password[0]}
              </span>
            )}
          </label>
        </div>
        <div>
          {/* Confirm Password */}
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-semibold text-slate-700">
                Konfirmasi Password
              </span>
            </div>
            <input
              type="password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.password
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20"
              }`}
            />
            {fieldErrors.password_confirmation !== undefined && (
              <span className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                {fieldErrors.password_confirmation[0]}
              </span>
            )}
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-title text-sm font-bold shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {busy ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Daftar ke SunSight</span>
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
            </>
          )}
        </button>

        {/* Register Link */}
        <p className="text-center text-sm text-slate-600 pt-3 border-t border-slate-100">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-bold text-amber-600 hover:text-amber-700 hover:underline transition-colors"
          >
            Masuk
          </Link>
        </p>
      </form>
    </div>
  );
}
