<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membuang tabel produk lama.
 *
 * Bentuk produk berpindah dari "poligon atap hasil CV" ke "persegi bidang atap
 * yang ditempatkan pengguna", sehingga tabel ini tidak lagi punya kode yang
 * membacanya. `down()` membangunnya kembali supaya migrasi tetap dapat dibalik.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('roof_analyses');
    }

    public function down(): void
    {
        Schema::create('roof_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->geometry('roof_polygon', subtype: 'polygon', srid: 4326);
            $table->decimal('center_lat', 10, 7);
            $table->decimal('center_lng', 10, 7);
            $table->decimal('usable_area_sqm', 10, 2);
            $table->decimal('shadow_area_sqm', 10, 2);
            $table->decimal('estimated_energy_kwh_per_day', 10, 2);
            $table->decimal('roof_orientation_deg', 6, 2);
            $table->decimal('recommended_azimuth_deg', 6, 2);
            $table->decimal('module_efficiency', 5, 4);
            $table->decimal('performance_ratio', 5, 4);
            $table->decimal('tilt_deg', 5, 2);
            $table->decimal('tilt_factor', 5, 4);
            $table->string('irradiance_source');
            $table->string('irradiance_period');
            $table->decimal('irradiance_kwh_per_sqm_day', 6, 3);
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }
};
