<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
