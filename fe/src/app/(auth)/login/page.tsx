"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiRequestError, api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const result = await api.login({ email, password });
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

  return (
    <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md">
      <div className="card__header">
        <p className="eyebrow">Akun</p>
        <h1>Masuk</h1>
        <p className="card__hint">
          Masuk untuk menyimpan simulasi ke riwayat dan membukanya kembali kapan saja.
        </p>
      </div>

      {message !== null && (
        <p role="alert" className="notice-box notice-box--danger">
          {message}
        </p>
      )}

      <label className="field">
        <span className="field__label">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input"
        />
        {fieldErrors.email !== undefined && (
          <span className="field__error">{fieldErrors.email[0]}</span>
        )}
      </label>

      <label className="field">
        <span className="field__label">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input"
        />
        {fieldErrors.password !== undefined && (
          <span className="field__error">{fieldErrors.password[0]}</span>
        )}
      </label>

      <button type="submit" disabled={busy} className="primary-button button--lg button--block">
        {busy ? "Memproses…" : "Masuk"}
      </button>

      <p className="m-0 text-sm text-ink-secondary">
        Belum punya akun?{" "}
        <Link href="/register" className="link">
          Daftar
        </Link>
      </p>
    </form>
  );
}
