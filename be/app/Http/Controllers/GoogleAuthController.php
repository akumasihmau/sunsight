<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * Login lewat akun Google (OAuth 2.0).
 *
 * Token Sanctum tidak pernah dikirim di badan JSON maupun query string: keduanya
 * bisa tercatat di log server dan header Referer. Token dikirim sebagai fragment
 * URL (`#token=...`) yang hanya dibaca peramban, langsung ke halaman callback
 * frontend.
 */
class GoogleAuthController extends Controller
{
    /**
     * Mengalihkan pengguna ke halaman persetujuan Google.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Memproses akun Google yang kembali dari penyedia.
     *
     * Akun ditautkan berdasarkan `google_id`; bila belum ada, dicocokkan lewat email
     * supaya pengguna yang sudah mendaftar manual tidak memiliki dua akun. Hanya
     * bila keduanya tidak ditemukan, akun baru dibuat.
     */
    public function callback(Request $request): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->failedRedirect('google_failed');
        }

        $email = $googleUser->getEmail();

        // Google dapat mengembalikan email kosong bila pengguna tidak memberi izin
        // atau akunnya tidak memiliki email; email adalah identitas utama di sini.
        if ($email === null || $email === '') {
            return $this->failedRedirect('google_email_missing');
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if ($user === null) {
            $user = User::where('email', $email)->first();
        }

        if ($user === null) {
            $user = new User();
            $user->forceFill([
                'name' => $googleUser->getName() ?: Str::before($email, '@'),
                'email' => $email,
                // Kolom password wajib; nilai acak ini tidak pernah diketahui pengguna
                // karena login hanya lewat Google (cast `hashed` meng-hash otomatis).
                'password' => Str::random(40),
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'email_verified_at' => now(),
            ])->save();
        } else {
            $user->forceFill([
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar() ?: $user->avatar_url,
                // Email dari Google sudah terverifikasi; jangan menimpa waktu lama.
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
        }

        $token = $user->createToken('google')->plainTextToken;

        $onboarded = $user->onboarding_completed_at !== null ? '1' : '0';

        return redirect()->away(
            $this->frontendUrl().'/auth/callback#token='.$token.'&onboarded='.$onboarded
        );
    }

    /**
     * Redirect kembali ke halaman login frontend dengan kode kesalahan.
     */
    private function failedRedirect(string $reason): RedirectResponse
    {
        return redirect()->away($this->frontendUrl().'/login?error='.$reason);
    }

    /**
     * Alamat frontend tanpa garis miring di akhir.
     */
    private function frontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/');
    }
}
