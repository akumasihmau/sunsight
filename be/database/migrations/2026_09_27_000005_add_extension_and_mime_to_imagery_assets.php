<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ekstensi dan tipe MIME aset citra.
 *
 * Sebelumnya berkas selalu ditulis dengan nama .png. Gaya raster penyedia citra
 * mengembalikan JPEG, sehingga ekstensi .png akan berbohong tentang isinya dan
 * merusak apa pun yang mempercayai ekstensi. Kolom ini membuat ekstensi dicatat,
 * bukan ditebak.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('imagery_assets', function (Blueprint $table) {
            $table->string('extension', 8)->default('png')->after('path');
            $table->string('mime_type', 64)->default('image/png')->after('extension');
        });
    }

    public function down(): void
    {
        Schema::table('imagery_assets', function (Blueprint $table) {
            $table->dropColumn(['extension', 'mime_type']);
        });
    }
};
