<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jumlah panel boleh kosong.
 *
 * Kosong berarti "isi seluruh slot yang muat". Sebelumnya klien mengirim angka
 * besar sebagai penanda, yang rapuh: batas validasi dapat menolaknya dan artinya
 * tidak terbaca dari payload. Null menyatakan maksudnya secara langsung.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('simulations', function (Blueprint $table) {
            $table->unsignedInteger('panel_count')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('simulations', function (Blueprint $table) {
            $table->unsignedInteger('panel_count')->nullable(false)->change();
        });
    }
};
