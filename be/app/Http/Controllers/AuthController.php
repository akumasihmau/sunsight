<?php

// app/Http/Controllers/AuthController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(Request $request) {
        // TODO: Validasi input, create user, return token
    }

    public function login(Request $request) {
        // TODO: Cek email & password, return token
    }

    public function logout(Request $request) {
        // TODO: Hapus token dari database
    }

    public function user(Request $request) {
        return response()->json($request->user());
    }

    public function forgotPassword(Request $request) {
        // TODO: Generate token reset, kirim email
    }

    public function resetPassword(Request $request) {
        // TODO: Validasi token, update password baru
    }
}
