<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ComputerVisionController;
use App\Http\Controllers\SolarAnalysisController;
use Illuminate\Support\Facades\Route;

// --- Publik: Autentikasi ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Terlindungi (Wajib Login) ---
Route::middleware('auth:sanctum')->group(function () {
    // Profil & Logout
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Pipeline Computer Vision
    Route::post('/cv/fetch-osm', [ComputerVisionController::class, 'fetchOsm']);
    Route::post('/cv/refine-polygon', [ComputerVisionController::class, 'refinePolygon']);
    Route::post('/cv/detect-shadow', [ComputerVisionController::class, 'detectShadow']);

    // Solar Analysis & Riwayat
    Route::post('/solar/calculate', [SolarAnalysisController::class, 'calculate']);
    Route::get('/analyses', [SolarAnalysisController::class, 'index']);
    Route::post('/analyses', [SolarAnalysisController::class, 'store']);
    Route::get('/analyses/{id}', [SolarAnalysisController::class, 'show'])->whereNumber('id');
    Route::delete('/analyses/{id}', [SolarAnalysisController::class, 'destroy'])->whereNumber('id');
});
