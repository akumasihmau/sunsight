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

  const fields: Array<{ key: string; label: string; type: string; value: string; onChange: (value: string) => void }> = [
    { key: "name", label: "Nama", type: "text", value: name, onChange: setName },
    { key: "email", label: "Email", type: "email", value: email, onChange: setEmail },
    { key: "password", label: "Password", type: "password", value: password, onChange: setPassword },
    {
      key: "password_confirmation",
      label: "Ulangi password",
      type: "password",
      value: confirmation,
      onChange: setConfirmation,
    },
  ];

  return (
    <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md">
      <div className="card__header">
        <p className="eyebrow">Akun</p>
        <h1>Buat akun</h1>
        <p className="card__hint">
          Akun dipakai untuk menyimpan simulasi ke riwayat, bukan untuk berlangganan apa pun.
        </p>
      </div>

      {message !== null && (
        <p role="alert" className="notice-box notice-box--danger">
          {message}
        </p>
      )}

      {fields.map((field) => (
        <label key={field.key} className="field">
          <span className="field__label">{field.label}</span>
          <input
            type={field.type}
            required
            minLength={field.key.startsWith("password") ? 8 : undefined}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            className="input"
          />
          {fieldErrors[field.key] !== undefined && (
            <span className="field__error">{fieldErrors[field.key][0]}</span>
          )}
        </label>
      ))}

      <button type="submit" disabled={busy} className="primary-button button--lg button--block">
        {busy ? "Memproses…" : "Daftar"}
      </button>

      <p className="m-0 text-sm text-ink-secondary">
        Sudah punya akun?{" "}
        <Link href="/login" className="link">
          Masuk
        </Link>
      </p>
    </form>
  );
}
