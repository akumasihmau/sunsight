/**
 * Pemformat angka bersama untuk seluruh antarmuka.
 *
 * Lokal `id-ID` dipakai supaya pemisah ribuan dan desimal mengikuti kebiasaan
 * pembaca Indonesia, dan supaya angka yang sama tidak ditulis dengan dua cara
 * berbeda di halaman yang berbeda.
 */

export const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const decimal = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export const integer = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatRp(value: number): string {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

/** Payback dalam tahun; `null` berarti penghematan nol sehingga tidak dapat dihitung. */
export function paybackYearsText(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${decimal.format(value)} th`;
}
