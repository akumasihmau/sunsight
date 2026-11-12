<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Data profil yang sebelumnya hanya disimpan di peramban.
 *
 * Kolomnya nullable karena akun lama tidak memilikinya, dan seluruhnya opsional di
 * formulir. `property_type` menyimpan salah satu dari tiga kategori yang dipakai
 * laporan proposal; nilai lain ditolak validasi, bukan disimpan apa adanya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('property_type', 32)->nullable()->after('phone');
            $table->string('location', 120)->nullable()->after('property_type');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['phone', 'property_type', 'location']);
        });
    }
};
