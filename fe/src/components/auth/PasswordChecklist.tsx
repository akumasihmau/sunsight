"use client";

import { checkPasswordRules } from "@/lib/auth-errors";

type PasswordChecklistProps = {
  password: string;
  confirmation?: string;
  className?: string;
};

export function PasswordChecklist({
  password,
  confirmation,
  className = "",
}: PasswordChecklistProps) {
  // Only render if the user has started typing password or confirmation
  if (!password && !confirmation) {
    return null;
  }

  const rules = checkPasswordRules(password, confirmation);

  return (
    <div
      className={`p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5 text-left text-[11px] transition-all animate-in fade-in-50 duration-200 ${className}`}
    >
      <span className="block font-semibold text-slate-700 text-[11px]">
        Ketentuan Kata Sandi:
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-slate-600">
        <div className="flex items-center gap-1.5">
          <span
            className={`material-symbols-outlined text-[15px] leading-none shrink-0 transition-colors ${
              rules.hasMinLength ? "text-emerald-600 font-bold" : "text-slate-400"
            }`}
          >
            {rules.hasMinLength ? "check_circle" : "radio_button_unchecked"}
          </span>
          <span className={rules.hasMinLength ? "text-emerald-800 font-medium" : ""}>
            Minimal 8 karakter
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`material-symbols-outlined text-[15px] leading-none shrink-0 transition-colors ${
              rules.hasLetterAndNumber ? "text-emerald-600 font-bold" : "text-slate-400"
            }`}
          >
            {rules.hasLetterAndNumber ? "check_circle" : "radio_button_unchecked"}
          </span>
          <span className={rules.hasLetterAndNumber ? "text-emerald-800 font-medium" : ""}>
            Huruf & angka
          </span>
        </div>

        {confirmation !== undefined && confirmation.length > 0 && (
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <span
              className={`material-symbols-outlined text-[15px] leading-none shrink-0 transition-colors ${
                rules.isConfirmed ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"
              }`}
            >
              {rules.isConfirmed ? "check_circle" : "cancel"}
            </span>
            <span
              className={
                rules.isConfirmed ? "text-emerald-800 font-medium" : "text-rose-700 font-medium"
              }
            >
              {rules.isConfirmed ? "Konfirmasi cocok" : "Konfirmasi belum cocok"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

