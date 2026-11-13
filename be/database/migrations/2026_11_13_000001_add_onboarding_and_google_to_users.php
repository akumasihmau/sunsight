<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penanda onboarding dan tautan akun Google.
 *
 * `onboarding_completed_at` nullable karena akun lama belum pernah melewati
 * alur onboarding; nilainya baru diisi saat pengguna menyelesaikan alur tersebut.
 * `google_id` dipakai menautkan akun OAuth ke baris user yang sama sehingga login
 * Google berikutnya tidak membuat akun ganda; `avatar_url` menyimpan foto profil
 * dari penyedia agar tidak perlu diambil ulang setiap permintaan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('onboarding_completed_at')->nullable()->after('location');
            $table->string('google_id')->nullable()->unique()->after('onboarding_completed_at');
            $table->string('avatar_url')->nullable()->after('google_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['google_id']);
            $table->dropColumn(['onboarding_completed_at', 'google_id', 'avatar_url']);
        });
    }
};
