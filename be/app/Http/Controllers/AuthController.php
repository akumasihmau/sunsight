<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

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
                    'password' => $password
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
        ];
    }
}
