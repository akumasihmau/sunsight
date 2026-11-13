<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        // password_confirmation tidak fillable, jadi diabaikan saat create.
        $user = User::create($request->validated());

        return response()->json([
            'token' => $user->createToken('auth')->plainTextToken,
            'user' => $this->profile($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        // Email tidak terdaftar dan password salah menghasilkan respons yang identik,
        // supaya keberadaan sebuah akun tidak dapat diselidiki lewat pesan kesalahan.
        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Email atau password salah.'], 401);
        }

        return response()->json([
            'token' => $user->createToken('auth')->plainTextToken,
            'user' => $this->profile($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function forgotPassword(Request $request)
    {
        // 1. Validasi email
        $request->validate(['email' => 'required|email|exists:users,email']);

        // 2. Kirim email reset password bawaan Laravel
        $status = Password::sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => 'Email berisi tautan reset password telah dikirim.'])
            : response()->json(['message' => 'Gagal mengirim email reset password.'], 400);
    }

    public function resetPassword(Request $request)
    {
        // 1. Validasi kelengkapan data dari Next.js
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // 2. Proses reset password
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // Karena di model User teman Anda sudah ada cast 'hashed',
                // kita cukup masukkan password mentahnya, Laravel akan nge-hash otomatis.
                $user->forceFill([
                    'password' => $password,
                ])->setRememberToken(Str::random(60));

                $user->save();
                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => 'Password berhasil diubah. Silakan login.'])
            : response()->json(['message' => 'Token reset password tidak valid atau kedaluwarsa.'], 400);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($this->profile($request->user()));
    }

    /**
     * Menyimpan profil yang dapat diubah pengguna.
     *
     * Email boleh berubah tetapi tidak boleh bentrok dengan akun lain; token yang
     * sedang dipakai tetap berlaku karena identitasnya adalah id user, bukan email.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => [
                'required',
                'email',
                'max:120',
                Rule::unique('users', 'email')->ignore($user->getKey()),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'property_type' => ['sometimes', 'nullable', 'string', Rule::in(['residential', 'commercial', 'industrial'])],
            'location' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $user->fill($validated)->save();

        return response()->json($this->profile($user->refresh()));
    }

    /**
     * Menandai onboarding selesai untuk user yang sedang login.
     *
     * Idempoten: pemanggilan berikutnya tidak menggeser waktu yang sudah tercatat,
     * sehingga frontend boleh mengirim ulang tanpa mengubah riwayat pengguna.
     */
    public function completeOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at === null) {
            $user->forceFill(['onboarding_completed_at' => now()])->save();
        }

        return response()->json($this->profile($user->refresh()));
    }

    /**
     * Mengganti kata sandi setelah kata sandi lama diperiksa.
     *
     * Kata sandi tidak pernah dikembalikan di respons; klien hanya menerima pesan
     * berhasil dan tetap memakai token yang sama.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi saat ini tidak cocok.'],
            ]);
        }

        $user->forceFill(['password' => $validated['password']])->save();

        return response()->json(['message' => 'Password berhasil diperbarui.']);
    }

    /**
     * Profil publik user. Tidak pernah memuat password atau token.
     *
     * @return array<string, mixed>
     */
    private function profile(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'property_type' => $user->property_type,
            'location' => $user->location,
            // Waktu onboarding menentukan apakah frontend perlu menampilkan alurnya lagi.
            'onboarding_completed_at' => $user->onboarding_completed_at?->toIso8601String(),
            'avatar_url' => $user->avatar_url,
        ];
    }
}
