<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cache hasil geocoding.
 *
 * Nominatim membatasi laju permintaan dan melarang pengambilan berulang untuk
 * kueri yang sama. Karena pencarian alamat diulang terus-menerus oleh pengguna,
 * hasilnya disimpan: kueri yang sudah pernah dicari dijawab dari sini tanpa
 * menyentuh jaringan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geocode_cache', function (Blueprint $table) {
            $table->id();

            // Kueri ternormalisasi (huruf kecil, spasi dirapikan) dan hash-nya, supaya
            // pencarian tidak sensitif terhadap spasi berlebih maupun huruf besar.
            $table->string('query', 160);
            $table->string('query_hash', 64)->unique();

            // Seluruh hasil dalam satu kolom: jumlahnya kecil dan selalu dibaca utuh.
            $table->json('results');

            $table->timestamp('fetched_at');
            $table->timestamps();

            $table->index('fetched_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geocode_cache');
    }
};
