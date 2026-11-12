<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Masukan studio yang sebelumnya hanya hidup di antarmuka.
 *
 * `sun_hour` dan `extra_tilt_deg` adalah masukan tingkat simulasi karena berlaku untuk
 * seluruh bidang. `facet_rotation_deg` dan `obstacles` adalah masukan tingkat bidang:
 * yang pertama menyelaraskan kisi modul dengan azimuth, yang kedua mengecualikan slot
 * yang tertutup rintangan.
 *
 * Rintangan disimpan sebagai geometri, bukan indeks baris/kolom, karena kisi server
 * tidak identik dengan kisi antarmuka. Indeks yang sama dapat menunjuk slot yang
 * berbeda, sedangkan geometri selalu menunjuk tempat yang sama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('simulations', function (Blueprint $table): void {
            $table->decimal('sun_hour', 4, 1)->nullable()->after('map_zoom');
            $table->decimal('extra_tilt_deg', 4, 1)->nullable()->after('sun_hour');
        });

        Schema::table('simulation_roofs', function (Blueprint $table): void {
            $table->decimal('facet_rotation_deg', 6, 2)->nullable()->after('azimuth_deg');
            $table->json('obstacles')->nullable()->after('slot_overrides');
        });
    }

    public function down(): void
    {
        Schema::table('simulation_roofs', function (Blueprint $table): void {
            $table->dropColumn(['facet_rotation_deg', 'obstacles']);
        });

        Schema::table('simulations', function (Blueprint $table): void {
            $table->dropColumn(['sun_hour', 'extra_tilt_deg']);
        });
    }
};
