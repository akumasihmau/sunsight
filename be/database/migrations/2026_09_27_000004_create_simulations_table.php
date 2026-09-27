<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Simulasi PLTS tersimpan: masukan, hasil, dan asumsi dalam satu baris.
 *
 * Hasil disimpan meski selalu dapat dihitung ulang, karena asumsi dapat berubah
 * (tarif, harga modul, performance ratio) dan simulasi lama harus tetap
 * menampilkan angka seperti saat dihitung.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('simulations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('imagery_asset_id')->nullable()->constrained('imagery_assets')->nullOnDelete();

            $table->decimal('center_lat', 10, 7);
            $table->decimal('center_lng', 10, 7);

            $table->geometry('roof_polygon', subtype: 'polygon', srid: 4326);

            // Masukan bidang atap
            $table->decimal('roof_width_m', 8, 2);
            $table->decimal('roof_length_m', 8, 2);
            $table->decimal('rotation_deg', 6, 2);
            $table->decimal('setback_m', 5, 2);
            $table->decimal('gutter_m', 5, 2);

            // Masukan teknis
            $table->decimal('tilt_deg', 5, 2);
            $table->decimal('azimuth_deg', 6, 2);
            $table->string('module_key', 40);
            $table->string('orientation', 10);
            $table->decimal('clearance_m', 5, 3);
            $table->string('inverter_type', 12);
            $table->unsignedInteger('panel_count');

            // Masukan finansial
            $table->unsignedBigInteger('monthly_bill_idr');
            $table->string('tariff_key', 16);

            // Hasil geometri dan tata letak
            $table->decimal('total_area_sqm', 10, 2);
            $table->decimal('effective_area_sqm', 10, 2);
            $table->unsignedInteger('max_slots');
            $table->unsignedInteger('installed');
            $table->unsignedInteger('rows');
            $table->unsignedInteger('columns');
            $table->decimal('module_area_sqm', 10, 2);
            $table->decimal('density_ratio', 6, 4);

            // Hasil energi
            $table->decimal('capacity_kwp', 10, 3);
            $table->decimal('annual_production_kwh', 12, 2);

            // Hasil finansial dan lingkungan
            $table->unsignedBigInteger('capex_total_idr');
            $table->unsignedBigInteger('monthly_saving_idr');
            $table->unsignedBigInteger('annual_saving_idr');
            $table->decimal('payback_years', 8, 2)->nullable();
            $table->decimal('co2_reduction_kg_per_year', 12, 2);
            $table->unsignedInteger('trees_equivalent');

            // Asumsi yang dipakai saat menghitung
            $table->decimal('daily_irradiance_kwh_per_sqm', 8, 4);
            $table->string('irradiance_source');
            $table->string('irradiance_period');
            $table->decimal('incidence_factor', 6, 4);
            $table->decimal('performance_ratio', 5, 4);
            $table->decimal('tariff_idr_per_kwh', 10, 2);
            $table->string('tariff_label');
            $table->json('capex_breakdown');

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulations');
    }
};
