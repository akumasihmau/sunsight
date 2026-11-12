<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Simulasi menyimpan agregat, bukan satu bidang.
 *
 * Geometri, masukan teknis, dan hasil tata letak pindah ke `simulation_roofs`
 * karena kini ada satu baris per bidang. Yang tersisa di sini adalah masukan global
 * simulasi (inverter, tagihan, tarif) dan agregat yang dihitung dari seluruh bidang.
 *
 * `rows` dan `columns` tetap disimpan sebagai jumlah baris dan kolom kisi seluruh
 * bidang; angkanya tidak dipakai ulang oleh perhitungan, tetapi tidak dihapus agar
 * riwayat lama tetap dapat dibaca.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('simulations', function (Blueprint $table) {
            // Zoom peta yang ditangkap, dipakai antarmuka untuk memuat ulang peta
            // pada tampilan yang sama. Kosong berarti antarmuka memakai zoom bawaannya.
            $table->unsignedTinyInteger('map_zoom')->nullable()->after('center_lng');

            $table->dropColumn([
                'roof_polygon',
                'roof_width_m',
                'roof_length_m',
                'rotation_deg',
                'setback_m',
                'gutter_m',
                'tilt_deg',
                'azimuth_deg',
                'module_key',
                'orientation',
                'clearance_m',
                'panel_count',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('simulations', function (Blueprint $table) {
            $table->dropColumn('map_zoom');

            // Nilai per bidang tidak dapat dibangun kembali dari agregatnya, jadi
            // kolomnya dikembalikan kosong. Mengisinya dengan tebakan akan jauh
            // lebih menyesatkan daripada mengakui bahwa datanya memang hilang.
            $table->geometry('roof_polygon', subtype: 'polygon', srid: 4326)->nullable();
            $table->decimal('roof_width_m', 8, 2)->nullable();
            $table->decimal('roof_length_m', 8, 2)->nullable();
            $table->decimal('rotation_deg', 6, 2)->nullable();
            $table->decimal('setback_m', 5, 2)->nullable();
            $table->decimal('gutter_m', 5, 2)->nullable();
            $table->decimal('tilt_deg', 5, 2)->nullable();
            $table->decimal('azimuth_deg', 6, 2)->nullable();
            $table->string('module_key', 40)->nullable();
            $table->string('orientation', 10)->nullable();
            $table->decimal('clearance_m', 5, 3)->nullable();
            $table->unsignedInteger('panel_count')->nullable();
        });
    }
};
