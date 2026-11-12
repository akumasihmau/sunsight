<?php

namespace App\Services;

use App\Services\Geometry\LayoutResult;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Geometry\RoofArea;

/**
 * Menata modul surya sebagai kisi di dalam area efektif bidang atap.
 *
 * Jumlah yang muat dihitung dari pertidaksamaan sebenarnya, bukan pembagian
 * sederhana: n modul ditambah n-1 jarak harus muat pada sisi itu. Jarak terakhir
 * tidak perlu dihitung, sehingga area sempit tetap dapat memuat satu modul.
 *
 * Kisi selalu berbentuk persegi, sedangkan bidang atap nyata berbentuk poligon
 * bebas. Karena itu kisi dibentuk di dalam persegi pembatas minimum poligon efektif,
 * lalu slot yang badannya tidak seluruhnya berada di dalam poligon itu dibuang.
 *
 * Tiga masukan studio ikut diterapkan di sini supaya angka yang tersimpan sama
 * dengan angka yang dilihat pengguna:
 *
 * 1. `gridRotationDeg` memutar kisi mengikuti azimuth. Poligon diputar ke balik arah
 *    itu, kisi disusun pada bingkai lurus, lalu modul diuji terhadap poligon yang
 *    sudah diputar. Hasilnya sama dengan kisi yang dimiringkan terhadap atap.
 * 2. `obstaclePolygons` mengecualikan modul yang bersinggungan dengan rintangan.
 *    Rintangan dikirim sebagai geometri karena kisi server tidak identik dengan
 *    kisi antarmuka, sehingga indeks baris/kolom tidak dapat dipakai.
 * 3. `populated` mematikan seluruh modul ketika pengguna memilih melihat kontur
 *    atap saja; slot maksimum tetap dilaporkan supaya kapasitas potensial terbaca.
 */
class PanelLayout
{
    /** Di bawah ini kisi dianggap lurus; menghindari derau pembulatan. */
    private const MIN_ROTATION_DEG = 0.05;

    /**
     * @param  array{length_m: float, width_m: float}  $module
     * @param  int|null  $requestedCount  Null berarti isi seluruh slot yang muat.
     * @param  array<int, array{0: float, 1: float}>|null  $maskPolygon  Poligon efektif
     *                                                                   bidang dalam piksel, mis. dari `RoofPolygonArea::effectivePolygonPx`.
     *                                                                   Null berarti kisi dipakai seluruhnya.
     * @param  array{
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     *     rotation_deg: float,
     * }|null  $maskFrame  Persegi pembatas minimum poligon itu, dalam piksel, mis. dari
     *   `RoofPolygonArea::maskFrame()`. Diperlukan hanya bila `$maskPolygon` diisi,
     *   karena kisi tidak dapat ditempatkan tanpa letak dan arah perseginya.
     * @param  array<int, array<int, array{0: float, 1: float}>>  $obstaclePolygons
     *                                                                               Rintangan dalam piksel, pada ruang koordinat yang sama dengan `$maskPolygon`.
     * @param  float  $gridRotationDeg  Putaran kisi terhadap atap, derajat.
     * @param  bool  $populated  False berarti tidak ada modul yang dipasang.
     */
    public static function fit(
        RoofArea $area,
        array $module,
        string $orientation,
        float $clearanceM,
        ?int $requestedCount,
        ?array $maskPolygon = null,
        ?array $maskFrame = null,
        array $obstaclePolygons = [],
        float $gridRotationDeg = 0.0,
        bool $populated = true,
    ): LayoutResult {
        $portrait = $orientation !== 'landscape';

        // Sisi panjang modul diletakkan sejajar bubungan pada orientasi potret.
        $alongLength = $portrait ? $module['length_m'] : $module['width_m'];
        $alongWidth = $portrait ? $module['width_m'] : $module['length_m'];

        $obstacles = array_values(array_filter(
            $obstaclePolygons,
            static fn (mixed $polygon): bool => is_array($polygon) && count($polygon) >= 3,
        ));

        if ($maskPolygon === null || $maskFrame === null) {
            $columns = self::countThatFits($area->effectiveLengthM, $alongLength, $clearanceM);
            $rows = self::countThatFits($area->effectiveWidthM, $alongWidth, $clearanceM);
            $maxSlots = $columns * $rows;
            $available = $maxSlots;
        } else {
            $rotation = self::normaliseRotation($gridRotationDeg);
            $scale = self::scaleFromFrame($maskFrame, $area);

            if ($scale <= 0.0) {
                $columns = 0;
                $rows = 0;
                $maxSlots = 0;
                $available = 0;
            } else {
                $polygon = $maskPolygon;
                $frame = $maskFrame;

                if (abs($rotation) >= self::MIN_ROTATION_DEG) {
                    $radians = deg2rad(-$rotation);

                    $polygon = self::rotateRing($maskPolygon, $radians);
                    $obstacles = array_map(
                        static fn (array $obstacle): array => self::rotateRing($obstacle, $radians),
                        $obstacles,
                    );

                    $bounds = self::bounds($polygon);
                    $frame = [
                        'center' => [
                            ($bounds['min_x'] + $bounds['max_x']) / 2.0,
                            ($bounds['min_y'] + $bounds['max_y']) / 2.0,
                        ],
                        'length' => $bounds['max_x'] - $bounds['min_x'],
                        'width' => $bounds['max_y'] - $bounds['min_y'],
                        'rotation_deg' => 0.0,
                    ];
                }

                // Dimensi bingkai diubah ke meter memakai skala tangkapan, bukan skala
                // persegi pembatas, supaya kisi meter dan kisi piksel tetap sama.
                $columns = self::countThatFits($frame['length'] / $scale, $alongLength, $clearanceM);
                $rows = self::countThatFits($frame['width'] / $scale, $alongWidth, $clearanceM);

                [$maxSlots, $blocked] = self::slotsInsideMask(
                    columns: $columns,
                    rows: $rows,
                    alongLengthM: $alongLength,
                    alongWidthM: $alongWidth,
                    clearanceM: $clearanceM,
                    polygon: $polygon,
                    frame: $frame,
                    scale: $scale,
                    obstacles: $obstacles,
                );

                $available = max(0, $maxSlots - $blocked);
            }
        }

        $installed = ! $populated
            ? 0
            : ($requestedCount === null
                ? $available
                : max(0, min($requestedCount, $available)));

        $moduleAreaSqm = $installed * $module['length_m'] * $module['width_m'];

        return new LayoutResult(
            maxSlots: $maxSlots,
            installed: $installed,
            rows: $rows,
            columns: $columns,
            moduleAreaSqm: round($moduleAreaSqm, 2),
            densityRatio: $area->effectiveAreaSqm > 0.0
                ? round($moduleAreaSqm / $area->effectiveAreaSqm, 4)
                : 0.0,
        );
    }

    /**
     * Jumlah slot yang muat beserta berapa di antaranya tertutup rintangan.
     *
     * Kisi dihitung dalam meter sedangkan penempatannya dalam piksel, jadi skalanya
     * diambil dari bingkai itu sendiri: panjang bingkai dibagi panjang efektif.
     * Dengan begitu kisi meter dan kisi piksel selalu menggambarkan susunan yang sama.
     *
     * @param  array<int, array{0: float, 1: float}>  $polygon
     * @param  array{
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     *     rotation_deg: float,
     * }  $frame
     * @param  array<int, array<int, array{0: float, 1: float}>>  $obstacles
     * @return array{0: int, 1: int} Jumlah slot yang muat dan jumlah yang tertutup rintangan.
     */
    private static function slotsInsideMask(
        int $columns,
        int $rows,
        float $alongLengthM,
        float $alongWidthM,
        float $clearanceM,
        array $polygon,
        array $frame,
        float $scale,
        array $obstacles,
    ): array {
        if ($columns === 0 || $rows === 0
            || $frame['length'] <= 0.0
            || $frame['width'] <= 0.0) {
            return [0, 0];
        }

        $panelLengthPx = $alongLengthM * $scale;
        $panelWidthPx = $alongWidthM * $scale;
        $gapPx = $clearanceM * $scale;

        $angle = deg2rad($frame['rotation_deg']);
        $cos = cos($angle);
        $sin = sin($angle);

        // Sisi panjang modul ditempatkan sejajar sisi panjang bingkai.
        $halfLengthPx = $frame['length'] / 2.0;
        $halfWidthPx = $frame['width'] / 2.0;

        $inside = 0;
        $blocked = 0;

        for ($column = 0; $column < $columns; $column++) {
            $localX = ($column + 0.5) * $panelLengthPx + $column * $gapPx - $halfLengthPx;

            for ($row = 0; $row < $rows; $row++) {
                $localY = ($row + 0.5) * $panelWidthPx + $row * $gapPx - $halfWidthPx;

                $centerX = $frame['center'][0] + $localX * $cos - $localY * $sin;
                $centerY = $frame['center'][1] + $localX * $sin + $localY * $cos;

                // Seluruh badan modul harus berada di dalam bidang, bukan hanya titik
                // tengahnya: modul yang separuh menggantung di luar atap tidak dapat
                // dipasang. Karena itu keempat sudutnya diuji.
                if (! self::moduleFitsInside($polygon, $centerX, $centerY, $panelLengthPx, $panelWidthPx, $cos, $sin)) {
                    continue;
                }

                $inside++;

                if ($obstacles !== [] && self::obstacleBlocks($obstacles, $centerX, $centerY, $panelLengthPx, $panelWidthPx, $cos, $sin)) {
                    $blocked++;
                }
            }
        }

        return [$inside, $blocked];
    }

    /**
     * Apakah seluruh badan satu modul berada di dalam bidang.
     *
     * Titik tengah saja tidak cukup: modul berukuran 2,3 x 1,1 m dapat berpusat di
     * dalam poligon sementara separuh badannya menggantung di luar atap. Karena itu
     * keempat sudut diuji, memakai arah bingkai yang sama dengan kisi.
     *
     * @param  array<int, array{0: float, 1: float}>  $polygon
     */
    private static function moduleFitsInside(
        array $polygon,
        float $centerX,
        float $centerY,
        float $panelLengthPx,
        float $panelWidthPx,
        float $cos,
        float $sin,
    ): bool {
        foreach (self::moduleCorners($centerX, $centerY, $panelLengthPx, $panelWidthPx, $cos, $sin) as $corner) {
            if (! PolygonGeometry::pointInPolygon($polygon, $corner)) {
                return false;
            }
        }

        return PolygonGeometry::pointInPolygon($polygon, [$centerX, $centerY]);
    }

    /**
     * Apakah badan modul bersinggungan dengan salah satu rintangan.
     *
     * Rintangan adalah slot yang ditandai HVAC, skylight, atau dikosongkan pengguna.
     * Uji singgung dipakai, bukan hanya titik tengah: modul yang separuh menimpa
     * rintangan tetap tidak dapat dipasang di sana.
     *
     * @param  array<int, array<int, array{0: float, 1: float}>>  $obstacles
     */
    private static function obstacleBlocks(
        array $obstacles,
        float $centerX,
        float $centerY,
        float $panelLengthPx,
        float $panelWidthPx,
        float $cos,
        float $sin,
    ): bool {
        $quad = self::moduleCorners($centerX, $centerY, $panelLengthPx, $panelWidthPx, $cos, $sin);

        foreach ($obstacles as $obstacle) {
            if (self::polygonsOverlap($quad, $obstacle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Keempat sudut badan modul dalam koordinat bingkai.
     *
     * @return array<int, array{0: float, 1: float}>
     */
    private static function moduleCorners(
        float $centerX,
        float $centerY,
        float $panelLengthPx,
        float $panelWidthPx,
        float $cos,
        float $sin,
    ): array {
        $halfLength = $panelLengthPx / 2.0;
        $halfWidth = $panelWidthPx / 2.0;
        $corners = [];

        foreach ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [$sx, $sy]) {
            $dx = $sx * $halfLength;
            $dy = $sy * $halfWidth;

            $corners[] = [
                $centerX + $dx * $cos - $dy * $sin,
                $centerY + $dx * $sin + $dy * $cos,
            ];
        }

        return $corners;
    }

    /**
     * Dua poligon bersinggungan bila salah satu titik sudutnya berada di dalam
     * poligon lain, atau sepasang sisinya berpotongan.
     *
     * @param  array<int, array{0: float, 1: float}>  $a
     * @param  array<int, array{0: float, 1: float}>  $b
     */
    private static function polygonsOverlap(array $a, array $b): bool
    {
        foreach ($a as $point) {
            if (PolygonGeometry::pointInPolygon($b, $point)) {
                return true;
            }
        }

        foreach ($b as $point) {
            if (PolygonGeometry::pointInPolygon($a, $point)) {
                return true;
            }
        }

        $countA = count($a);
        $countB = count($b);

        for ($i = 0; $i < $countA; $i++) {
            $a1 = $a[$i];
            $a2 = $a[($i + 1) % $countA];

            for ($j = 0; $j < $countB; $j++) {
                if (self::segmentsIntersect($a1, $a2, $b[$j], $b[($j + 1) % $countB])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param  array{0: float, 1: float}  $p1
     * @param  array{0: float, 1: float}  $p2
     * @param  array{0: float, 1: float}  $p3
     * @param  array{0: float, 1: float}  $p4
     */
    private static function segmentsIntersect(array $p1, array $p2, array $p3, array $p4): bool
    {
        $direction = static fn (array $a, array $b, array $c): float => ($b[0] - $a[0]) * ($c[1] - $a[1])
            - ($b[1] - $a[1]) * ($c[0] - $a[0]);

        $d1 = $direction($p3, $p4, $p1);
        $d2 = $direction($p3, $p4, $p2);
        $d3 = $direction($p1, $p2, $p3);
        $d4 = $direction($p1, $p2, $p4);

        return (($d1 > 0.0 && $d2 < 0.0) || ($d1 < 0.0 && $d2 > 0.0))
            && (($d3 > 0.0 && $d4 < 0.0) || ($d3 < 0.0 && $d4 > 0.0));
    }

    /**
     * Skala tangkapan dalam piksel per meter, diambil dari bingkai minimum.
     *
     * @param  array{center: array{0: float, 1: float}, length: float, width: float, rotation_deg: float}  $frame
     */
    private static function scaleFromFrame(array $frame, RoofArea $area): float
    {
        if ($area->effectiveLengthM <= 0.0 || $frame['length'] <= 0.0) {
            return 0.0;
        }

        return $frame['length'] / $area->effectiveLengthM;
    }

    /**
     * @param  array<int, array{0: float, 1: float}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    private static function rotateRing(array $ring, float $radians): array
    {
        $cos = cos($radians);
        $sin = sin($radians);
        $rotated = [];

        foreach ($ring as $point) {
            $rotated[] = [
                $point[0] * $cos - $point[1] * $sin,
                $point[0] * $sin + $point[1] * $cos,
            ];
        }

        return $rotated;
    }

    /**
     * @param  array<int, array{0: float, 1: float}>  $ring
     * @return array{min_x: float, min_y: float, max_x: float, max_y: float}
     */
    private static function bounds(array $ring): array
    {
        $minX = INF;
        $minY = INF;
        $maxX = -INF;
        $maxY = -INF;

        foreach ($ring as $point) {
            $minX = min($minX, $point[0]);
            $minY = min($minY, $point[1]);
            $maxX = max($maxX, $point[0]);
            $maxY = max($maxY, $point[1]);
        }

        return [
            'min_x' => $minX === INF ? 0.0 : $minX,
            'min_y' => $minY === INF ? 0.0 : $minY,
            'max_x' => $maxX === -INF ? 0.0 : $maxX,
            'max_y' => $maxY === -INF ? 0.0 : $maxY,
        ];
    }

    /**
     * Putaran kisi dinormalkan ke rentang -180..180 derajat.
     */
    private static function normaliseRotation(float $degrees): float
    {
        $normalised = fmod($degrees, 360.0);

        if ($normalised > 180.0) {
            $normalised -= 360.0;
        } elseif ($normalised < -180.0) {
            $normalised += 360.0;
        }

        return $normalised;
    }

    private static function countThatFits(float $availableM, float $panelSideM, float $clearanceM): int
    {
        if ($panelSideM <= 0.0 || $availableM < $panelSideM) {
            return 0;
        }

        $step = $panelSideM + $clearanceM;

        return (int) floor(($availableM + $clearanceM) / $step);
    }
}
