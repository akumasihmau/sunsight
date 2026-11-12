<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bidang atap per simulasi.
 *
 * Satu simulasi kini memuat banyak bidang, masing-masing dengan geometri, masukan,
 * dan hasilnya sendiri. Hasil per bidang disimpan, bukan hanya agregatnya, supaya
 * antarmuka dapat menampilkan dan memeriksa tiap bidang setelah fakta — termasuk
 * bidang mana pada hasil deteksi yang dipilih pengguna.
 *
 * Geometri disimpan dalam dua ruang sekaligus: polygon dalam WGS84 supaya dapat
 * dipetakan, dan polygon piksel supaya hasilnya dapat dipertanggungjawabkan
 * terhadap tangkapan asli yang tidak disimpan server.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('simulation_roofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulation_id')->constrained()->cascadeOnDelete();

            // Jejak hasil deteksi.
            $table->string('label', 80)->nullable();
            $table->string('detection_id', 64)->nullable();

            // Versi model yang menghasilkan bidang ini. Tetap kosong selama payload
            // kontrak belum memuatnya; disiapkan agar jejak asal dapat dicatat.
            $table->string('model_version', 40)->nullable();
            $table->decimal('confidence', 5, 4)->nullable();

            $table->geometry('roof_polygon', subtype: 'polygon', srid: 4326);
            $table->json('roof_polygon_px');

            // Masukan per bidang
            $table->decimal('roof_width_m', 8, 2);
            $table->decimal('roof_length_m', 8, 2);
            $table->decimal('rotation_deg', 6, 2);
            $table->decimal('setback_m', 5, 2);
            $table->decimal('gutter_m', 5, 2);
            $table->decimal('tilt_deg', 5, 2);
            $table->decimal('azimuth_deg', 6, 2);
            $table->string('module_key', 40);
            $table->string('orientation', 10);
            $table->decimal('clearance_m', 5, 3);
            $table->unsignedInteger('panel_count')->nullable();

            // Hasil per bidang
            $table->decimal('total_area_sqm', 10, 2);
            $table->decimal('effective_area_sqm', 10, 2);
            $table->unsignedInteger('max_slots');
            $table->unsignedInteger('installed');
            $table->unsignedInteger('rows');
            $table->unsignedInteger('columns');
            $table->decimal('module_area_sqm', 10, 2);
            $table->decimal('density_ratio', 6, 4);
            $table->decimal('capacity_kwp', 10, 3);
            $table->decimal('annual_production_kwh', 12, 2);

            $table->timestamps();

            // Postgres tidak membuat indeks untuk kolom foreign key, sedangkan
            // pembacaan riwayat selalu menyaring lewat simulation_id.
            $table->index('simulation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_roofs');
    }
};
