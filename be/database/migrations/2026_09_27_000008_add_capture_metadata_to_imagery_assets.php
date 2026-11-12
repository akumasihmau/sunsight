<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Metadata aset citra tanpa berkas.
 *
 * Tangkapan peta berasal dari penyedia ubin pihak ketiga dan tidak disimpan server;
 * yang disimpan hanya georeferensinya. Tanpa kolom berkas yang boleh kosong, baris
 * aset seperti itu tidak dapat ditulis sama sekali.
 *
 * Default `png` pada ekstensi dan tipe MIME ikut dilepas: nilai bawaan itu berbohong
 * tentang berkas yang tidak ada, dan penulisan eksplisit sudah dilakukan pemanggil.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('imagery_assets', function (Blueprint $table) {
            $table->string('path')->nullable()->change();
            $table->string('extension', 8)->nullable()->change();
            $table->string('mime_type', 64)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('imagery_assets', function (Blueprint $table) {
            $table->string('path')->nullable(false)->change();
            $table->string('extension', 8)->default('png')->change();
            $table->string('mime_type', 64)->default('image/png')->change();
        });
    }
};
