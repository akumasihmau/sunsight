/**
 * Helper validasi client-side dan penerjemahan pesan kesalahan (error handling)
 * untuk seluruh alur autentikasi SunSight (Login, Register, Lupa Password, Reset Password).
 */

export type AuthAlertAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type AuthAlertData = {
  title: string;
  description: string;
  action?: AuthAlertAction;
};

export type PasswordRuleStatus = {
  hasMinLength: boolean;
  hasLetterAndNumber: boolean;
  isConfirmed: boolean;
  isValid: boolean;
};

// ==========================================
// 1. Client-Side Validators
// ==========================================

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateEmail(email: string): string | null {
  const clean = email.trim();
  if (!clean) {
    return "Alamat email wajib diisi.";
  }
  if (!isValidEmail(clean)) {
    return "Format email belum benar (contoh: nama@email.com).";
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const clean = phone.trim().replace(/[\s-]/g, "");
  if (!clean) {
    return "Nomor WhatsApp / telepon wajib diisi.";
  }
  // Format nomor Indonesia: diawali 08, 628, atau +628, panjang 10-14 digit
  const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
  if (!/^(08|628)\d{8,12}$/.test(normalized)) {
    return "Nomor HP harus 10–13 digit (diawali 08 atau +62).";
  }
  return null;
}

export function validateFullName(name: string): string | null {
  const clean = name.trim();
  if (!clean) {
    return "Nama lengkap wajib diisi.";
  }
  if (clean.length < 3) {
    return "Nama lengkap minimal 3 karakter.";
  }
  return null;
}

export function validateLocation(location: string): string | null {
  const clean = location.trim();
  if (!clean) {
    return "Alamat atau kota domisili wajib diisi.";
  }
  if (clean.length < 3) {
    return "Tuliskan alamat atau kota domisili yang lebih jelas.";
  }
  return null;
}

export function checkPasswordRules(password: string, confirmation?: string): PasswordRuleStatus {
  const hasMinLength = password.length >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const isConfirmed =
    confirmation !== undefined && confirmation.length > 0 && confirmation === password;

  return {
    hasMinLength,
    hasLetterAndNumber,
    isConfirmed,
    isValid: hasMinLength && (confirmation !== undefined ? isConfirmed : true),
  };
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Kata sandi wajib diisi.";
  }
  if (password.length < 8) {
    return "Kata sandi minimal 8 karakter.";
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) {
    return "Konfirmasi kata sandi wajib diisi.";
  }
  if (password !== confirmation) {
    return "Konfirmasi kata sandi belum sama dengan kata sandi di atas.";
  }
  return null;
}

// ==========================================
// 2. Translasi Pesan Backend Laravel
// ==========================================

const FIELD_ERROR_TRANSLATIONS: Record<string, string> = {
  "The email has already been taken.": "Email ini sudah terdaftar di SunSight.",
  "The email field is required.": "Alamat email wajib diisi.",
  "The email must be a valid email address.": "Format email belum benar.",
  "The selected email is invalid.": "Alamat email ini tidak terdaftar di sistem kami.",
  "The password field is required.": "Kata sandi wajib diisi.",
  "The password field must be at least 8 characters.": "Kata sandi minimal 8 karakter.",
  "The password confirmation does not match.": "Konfirmasi kata sandi tidak cocok.",
  "The name field is required.": "Nama lengkap wajib diisi.",
  "The token field is required.": "Tautan reset tidak valid.",
};

export function translateFieldErrors(
  errors: Record<string, string[]> = {},
): Record<string, string[]> {
  const translated: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(errors)) {
    translated[field] = messages.map((msg) => {
      if (FIELD_ERROR_TRANSLATIONS[msg]) {
        return FIELD_ERROR_TRANSLATIONS[msg];
      }
      // Heuristic fallback translation for standard Laravel patterns
      if (msg.includes("already been taken")) {
        return "Data ini sudah terdaftar di sistem kami.";
      }
      if (msg.includes("must be at least 8 characters")) {
        return "Harus terdiri dari minimal 8 karakter.";
      }
      if (msg.includes("confirmation does not match")) {
        return "Konfirmasi tidak cocok.";
      }
      if (msg.includes("required")) {
        return "Kolom ini wajib diisi.";
      }
      return msg;
    });
  }

  return translated;
}

export function parseAuthError(
  caught: unknown,
  context: "login" | "register" | "forgot-password" | "reset-password",
): { alert: AuthAlertData; fieldErrors: Record<string, string[]> } {
  let status = 0;
  let rawMessage = "";
  let rawFieldErrors: Record<string, string[]> = {};

  if (typeof caught === "object" && caught !== null) {
    const errorObj = caught as {
      status?: number;
      message?: string;
      fieldErrors?: Record<string, string[]>;
    };
    status = errorObj.status ?? 0;
    rawMessage = errorObj.message ?? "";
    rawFieldErrors = errorObj.fieldErrors ?? {};
  } else if (typeof caught === "string") {
    rawMessage = caught;
  }

  const translatedFields = translateFieldErrors(rawFieldErrors);

  // Network / server offline
  if (status === 0 || rawMessage.includes("Tidak dapat menghubungi server")) {
    return {
      alert: {
        title: "Koneksi Terputus",
        description:
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau pastikan server lokal berjalan.",
      },
      fieldErrors: translatedFields,
    };
  }

  // Rate Limiting (429)
  if (status === 429) {
    return {
      alert: {
        title: "Terlalu Banyak Percobaan",
        description:
          "Demi keamanan akun Anda, silakan tunggu sekitar 1 menit sebelum mencoba kembali.",
      },
      fieldErrors: translatedFields,
    };
  }

  // Context-specific handling
  if (context === "login") {
    if (status === 401 || rawMessage.toLowerCase().includes("email atau password salah")) {
      return {
        alert: {
          title: "Email atau Password Tidak Cocok",
          description:
            "Kombinasi email dan kata sandi yang Anda masukkan tidak sesuai. Periksa kembali huruf besar/kecil Anda.",
          action: {
            label: "Lupa Password?",
            href: "/forgot-password",
          },
        },
        fieldErrors: {
          password: ["Kata sandi tidak sesuai."],
          ...translatedFields,
        },
      };
    }
  }

  if (context === "register") {
    const isEmailTaken =
      rawFieldErrors.email?.some((e) => e.includes("already been taken")) ||
      rawMessage.includes("already been taken");

    if (isEmailTaken) {
      return {
        alert: {
          title: "Email Sudah Terdaftar",
          description:
            "Akun dengan alamat email ini sudah ada di SunSight. Anda bisa langsung masuk ke akun.",
          action: {
            label: "Masuk Sekarang →",
            href: "/login",
          },
        },
        fieldErrors: {
          email: ["Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."],
          ...translatedFields,
        },
      };
    }
  }

  if (context === "forgot-password") {
    const isEmailNotFound =
      status === 404 ||
      rawFieldErrors.email?.some((e) => e.includes("invalid") || e.includes("not found")) ||
      rawMessage.toLowerCase().includes("tidak terdaftar");

    if (isEmailNotFound) {
      return {
        alert: {
          title: "Email Belum Terdaftar",
          description:
            "Alamat email tersebut tidak ditemukan di SunSight. Periksa kembali ejaan email atau daftar akun baru.",
          action: {
            label: "Daftar Akun Baru →",
            href: "/register",
          },
        },
        fieldErrors: {
          email: ["Email tidak ditemukan di sistem SunSight."],
          ...translatedFields,
        },
      };
    }
  }

  if (context === "reset-password") {
    if (status === 400 || rawMessage.toLowerCase().includes("token")) {
      return {
        alert: {
          title: "Tautan Tidak Berlaku",
          description:
            "Tautan atur ulang kata sandi sudah kedaluwarsa atau sudah digunakan. Silakan ajukan tautan pemulihan baru.",
          action: {
            label: "Kirim Ulang Tautan",
            href: "/forgot-password",
          },
        },
        fieldErrors: translatedFields,
      };
    }
  }

  // 422 Unprocessable Entity generic
  if (status === 422 || Object.keys(translatedFields).length > 0) {
    return {
      alert: {
        title: "Periksa Kembali Isian Anda",
        description:
          "Terdapat beberapa data yang belum lengkap atau belum sesuai format yang ditentukan.",
      },
      fieldErrors: translatedFields,
    };
  }

  // Generic fallback
  return {
    alert: {
      title: "Gagal Memproses Permintaan",
      description: rawMessage || "Terjadi kendala saat memproses data. Silakan coba sesaat lagi.",
    },
    fieldErrors: translatedFields,
  };
}

