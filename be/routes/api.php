<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaptureController;
use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\RoofDetectionController;
use App\Http\Controllers\SimulationController;
use Illuminate\Support\Facades\Route;

// --- Publik: Autentikasi & Pencarian Alamat ---
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
// Pencarian alamat dipakai di Landing Hero sebelum login maupun di Studio/Beranda;
// dibatasi lajunya agar tidak membanjiri Nominatim.
Route::get('/geocode', GeocodeController::class)->middleware('throttle:30,1');

// --- Terlindungi (Wajib Login) ---
Route::middleware('auth:sanctum')->group(function () {
    // Profil & Logout
    Route::get('/user', [AuthController::class, 'user']);
    Route::patch('/user', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    // Penanda onboarding selesai; idempoten sehingga aman dikirim berulang.
    Route::post('/onboarding/complete', [AuthController::class, 'completeOnboarding']);

    // Lokasi, katalog, deteksi, dan simulasi
    Route::post('/location', [SimulationController::class, 'location']);
    Route::get('/options', [SimulationController::class, 'options']);
    Route::post('/roof-detections', RoofDetectionController::class);
    // Acuan tangkapan untuk bidang yang digambar sendiri, tanpa memanggil model.
    Route::post('/captures', CaptureController::class);

    Route::get('/reverse-geocode', [GeocodeController::class, 'reverse'])->middleware('throttle:30,1');
    Route::post('/simulate', [SimulationController::class, 'simulate']);

    // Riwayat simulasi
    Route::get('/analyses', [SimulationController::class, 'index']);
    Route::post('/analyses', [SimulationController::class, 'store']);
    Route::get('/analyses/{id}', [SimulationController::class, 'show'])->whereNumber('id');
    Route::patch('/analyses/{id}', [SimulationController::class, 'update'])->whereNumber('id');
    Route::patch('/analyses/{id}/name', [SimulationController::class, 'rename'])->whereNumber('id');
    Route::delete('/analyses/{id}', [SimulationController::class, 'destroy'])->whereNumber('id');
});
