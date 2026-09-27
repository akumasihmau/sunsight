<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Metadata aset citra.
 *
 * Berkasnya tetap disimpan di bawah direktori pemilik, tetapi skalanya harus
 * diketahui server: /cv/detect-shadow hanya menerima image_id dan poligon piksel,
 * sehingga tanpa meters_per_pixel yang tersimpan server tidak dapat mengubah luas
 * piksel menjadi meter persegi. Tabel ini juga membuat kepemilikan dan pembersihan
 * aset menjadi kueri biasa, bukan pemindaian direktori.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imagery_assets', function (Blueprint $table) {
            $table->id();
            $table->uuid('image_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('path');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');

            // Hanya terisi untuk citra dasar; mask turunan tidak punya georeferensi.
            $table->decimal('meters_per_pixel', 8, 4)->nullable();
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lng', 10, 7)->nullable();
            $table->unsignedTinyInteger('zoom')->nullable();
            $table->json('bbox')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imagery_assets');
    }
};
