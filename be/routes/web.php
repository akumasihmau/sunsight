<?php

use App\Http\Controllers\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// --- Login Google (OAuth 2.0) ---
//
// Jalur callback bukan pilihan bebas: Google hanya menerima `redirect_uri` yang
// terdaftar persis di Cloud Console. Nilai yang terdaftar untuk proyek ini adalah
// `/api/auth/google-callback`, jadi jalur itulah yang dilayani. Mengubahnya berarti
// mendaftarkan ulang URI di console.
//
// Grup `web` dipakai karena Socialite menyimpan parameter `state` di session.
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/api/auth/google-callback', [GoogleAuthController::class, 'callback']);
