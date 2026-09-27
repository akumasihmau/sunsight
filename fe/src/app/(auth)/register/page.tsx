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
      router.push("/analysis");
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
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Buat akun</h1>

      {message !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {message}
        </p>
      )}

      {fields.map((field) => (
        <label key={field.key} className="block space-y-1">
          <span className="text-sm font-medium">{field.label}</span>
          <input
            type={field.type}
            required
            minLength={field.key.startsWith("password") ? 8 : undefined}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {fieldErrors[field.key] !== undefined && (
            <span className="block text-xs text-red-600 dark:text-red-400">{fieldErrors[field.key][0]}</span>
          )}
        </label>
      ))}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {busy ? "Memproses…" : "Daftar"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-sky-600 underline dark:text-sky-400">
          Masuk
        </Link>
      </p>
    </form>
  );
}
