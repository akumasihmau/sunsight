<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SimulationController;
use Illuminate\Support\Facades\Route;

// --- Publik: Autentikasi ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Terlindungi (Wajib Login) ---
Route::middleware('auth:sanctum')->group(function () {
    // Profil & Logout
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Lokasi, katalog, dan simulasi
    Route::post('/location', [SimulationController::class, 'location']);
    Route::get('/options', [SimulationController::class, 'options']);
    Route::post('/simulate', [SimulationController::class, 'simulate']);

    // Riwayat simulasi
    Route::get('/analyses', [SimulationController::class, 'index']);
    Route::post('/analyses', [SimulationController::class, 'store']);
    Route::get('/analyses/{id}', [SimulationController::class, 'show'])->whereNumber('id');
    Route::delete('/analyses/{id}', [SimulationController::class, 'destroy'])->whereNumber('id');
});
