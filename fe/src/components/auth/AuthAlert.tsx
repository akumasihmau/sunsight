"use client";

import Link from "next/link";
import type { AuthAlertAction } from "@/lib/auth-errors";

type AuthAlertProps = {
  type?: "error" | "success" | "info";
  title?: string;
  description: string;
  action?: AuthAlertAction;
  onDismiss?: () => void;
  className?: string;
};

export function AuthAlert({
  type = "error",
  title,
  description,
  action,
  onDismiss,
  className = "",
}: AuthAlertProps) {
  const isSuccess = type === "success";
  const isInfo = type === "info";

  const palette = isSuccess
    ? {
        container: "bg-emerald-50/90 border-emerald-200/90 text-emerald-950",
        iconBox: "bg-emerald-100/90 border-emerald-200 text-emerald-700",
        icon: "check_circle",
        title: "text-emerald-950",
        description: "text-emerald-800/90",
        btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
        dismiss: "text-emerald-600 hover:bg-emerald-100/80 hover:text-emerald-900",
      }
    : isInfo
      ? {
          container: "bg-amber-50/90 border-amber-200/90 text-amber-950",
          iconBox: "bg-amber-100/90 border-amber-200 text-amber-700",
          icon: "info",
          title: "text-amber-950",
          description: "text-amber-900/90",
          btn: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
          dismiss: "text-amber-600 hover:bg-amber-100/80 hover:text-amber-900",
        }
      : {
          container: "bg-rose-50/90 border-rose-200/90 text-rose-950",
          iconBox: "bg-rose-100/90 border-rose-200 text-rose-600",
          icon: "error_outline",
          title: "text-rose-950",
          description: "text-rose-800/90",
          btn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
          dismiss: "text-rose-600 hover:bg-rose-100/80 hover:text-rose-900",
        };

  return (
    <div
      role="alert"
      className={`relative mb-4 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md shadow-xs transition-all animate-in fade-in-50 duration-200 ${palette.container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${palette.iconBox}`}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            {palette.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0 pr-6 text-left">
          {title && (
            <h4 className={`text-xs sm:text-[13px] font-title font-bold mb-0.5 ${palette.title}`}>
              {title}
            </h4>
          )}
          <p className={`text-xs leading-relaxed font-normal ${palette.description}`}>
            {description}
          </p>

          {action && (
            <div className="mt-2.5">
              {action.href ? (
                <Link
                  href={action.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-title font-semibold shadow-xs transition cursor-pointer ${palette.btn}`}
                >
                  <span>{action.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-title font-semibold shadow-xs transition cursor-pointer ${palette.btn}`}
                >
                  <span>{action.label}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${palette.dismiss}`}
            aria-label="Tutup pesan"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

