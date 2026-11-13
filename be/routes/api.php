<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaptureController;
use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\RoofDetectionController;
use App\Http\Controllers\SimulationController;
use Illuminate\Support\Facades\Route;

// --- Publik: Autentikasi ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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

    // Pencarian alamat, dibatasi lajunya agar tidak membanjiri Nominatim.
    Route::get('/geocode', GeocodeController::class)->middleware('throttle:30,1');
    Route::post('/simulate', [SimulationController::class, 'simulate']);

    // Riwayat simulasi
    Route::get('/analyses', [SimulationController::class, 'index']);
    Route::post('/analyses', [SimulationController::class, 'store']);
    Route::get('/analyses/{id}', [SimulationController::class, 'show'])->whereNumber('id');
    Route::patch('/analyses/{id}', [SimulationController::class, 'update'])->whereNumber('id');
    Route::delete('/analyses/{id}', [SimulationController::class, 'destroy'])->whereNumber('id');
});
