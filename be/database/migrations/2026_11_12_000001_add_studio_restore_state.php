<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * State studio yang dibutuhkan untuk membuka kembali simulasi.
 *
 * Geometri, masukan teknis, dan hasil sudah tersimpan, tetapi tampilan studio
 * bergantung pada beberapa hal lain: bentuk bidang (agar alat edit menampilkan
 * kontrol yang sama), rintangan yang ditandai pengguna per slot, apakah tata letak
 * pernah disusun, dan label lokasi. Tanpa kolom ini, membuka simulasi lama akan
 * menampilkan bidang yang mirip tetapi tidak sama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('simulations', function (Blueprint $table) {
            // Label lokasi seperti yang diketik pengguna; tidak dipakai perhitungan.
            $table->string('address', 160)->nullable()->after('center_lng');
        });

        Schema::table('simulation_roofs', function (Blueprint $table) {
            // `custom_polygon` untuk bidang hasil deteksi atau gambar bebas.
            $table->string('shape', 20)->nullable()->after('detection_id');

            // Keadaan tampilan tiap bidang.
            $table->boolean('align_to_azimuth')->nullable()->after('panel_count');
            $table->boolean('is_solar_populated')->nullable()->after('align_to_azimuth');
            $table->boolean('has_hvac')->nullable()->after('is_solar_populated');
            $table->boolean('has_skylight')->nullable()->after('has_hvac');

            // Penanda rintangan per slot, kuncinya `<baris>:<kolom>`.
            $table->json('slot_overrides')->nullable()->after('has_skylight');
        });
    }

    public function down(): void
    {
        Schema::table('simulation_roofs', function (Blueprint $table) {
            $table->dropColumn(['shape', 'align_to_azimuth', 'is_solar_populated', 'has_hvac', 'has_skylight', 'slot_overrides']);
        });

        Schema::table('simulations', function (Blueprint $table) {
            $table->dropColumn('address');
        });
    }
};
