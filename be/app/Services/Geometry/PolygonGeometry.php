<?php

namespace App\Services\Geometry;

/**
 * Geometri poligon bidang datar dalam koordinat piksel citra.
 *
 * Semua perhitungan di sini bekerja pada satu ring luar (tanpa lubang), tanpa
 * dependensi luar, dan sengaja tidak mengetahui satuan: pemanggil yang mengalikan
 * hasilnya dengan skala meter per piksel.
 *
 * Pilihan algoritme dan alasannya:
 *
 * - **Luas** memakai rumus shoelace (Gauss) dengan nilai absolut. Untuk ring
 *   sederhana hasilnya sama dengan integral luas; ring yang memotong dirinya
 *   sendiri tidak dijamin, dan itu memang bukan masukan yang sah.
 * - **Titik di dalam poligon** memakai *ray casting* (aturan ganjil-genap) karena
 *   lebih sederhana daripada jumlah winding dan setara untuk ring sederhana.
 *   Titik yang persis di tepi dihitung sebagai di dalam supaya keputusan slot tidak
 *   berubah hanya karena pembulatan.
 * - **Inset** menggeser tiap sisi sejajar ke arah dalam sejauh jarak yang diminta,
 *   menyambungnya dengan mitre, memotong puncak yang terlalu tajam dengan bevel, lalu
 *   membuang jalinan yang terbentuk saat offset memotong dirinya sendiri. Arah
 *   "dalam" ditentukan dari tanda luas, bukan dari urutan titik, sehingga ring searah
 *   maupun berlawanan jarum jam diperlakukan sama. Hasilnya diperiksa ulang: ring
 *   harus sederhana, arah putarannya tetap, luasnya mengecil tetapi tetap positif, dan
 *   setiap titiknya berada di dalam ring asal. Bila konturnya terlalu berigi untuk
 *   di-offset langsung, konturnya disederhanakan lebih dulu dengan toleransi bertahap
 *   lalu di-offset ulang; hanya bila seluruh percobaan itu gagal, pemanggil menerima
 *   bidang yang tidak menyisakan apa pun — bukan bidang yang luasnya dikarang.
 * - **Persegi pembatas minimum** memakai *rotated calipers* atas convex hull:
 *   persegi pembatas minimum selalu menempel pada salah satu sisi hull, sehingga
 *   cukup orientasi sisi-sisi hull yang dievaluasi, bukan seluruh sudut.
 *
 * Batasan yang disadari: bidang dianggap datar, jadi kelengkungan bumi dan proyeksi
 * peta tidak dimodelkan. Untuk satu tangkapan peta, skala meter per piksel yang
 * dihitung server sudah menyerap keduanya.
 */
final class PolygonGeometry
{
    /**
     * Toleransi kesamaan titik, dalam satuan ring. Ring selalu dalam piksel, jadi
     * nilai ini jauh di bawah presisi yang berarti.
     */
    private const EPSILON = 1e-7;

    /**
     * Batas panjang sambungan mitre, sebagai kelipatan jarak offset.
     *
     * Panjang sambungan adalah `1/cos(t/2)` kali jarak offset dengan `t` sudut balik
     * sisi; pada sudut 3 derajat nilainya puluhan kali jarak offset, dan puncak
     * setinggi itu jauh melewati bagian bidang di sekitarnya. Di atas batas ini
     * sambungannya dipotong datar (*bevel*), yang kehilangan sudut tajamnya saja —
     * bagian yang memang tidak menyisakan tempat untuk modul.
     */
    private const MITER_LIMIT = 2.0;

    /**
     * Luas ring, selalu positif.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     */
    public static function area(array $ring): float
    {
        return abs(self::signedArea(self::points($ring)));
    }

    /**
     * Titik berat ring. Ring tanpa luas (titik atau garis) memakai rata-rata titiknya.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array{0: float, 1: float}
     */
    public static function centroid(array $ring): array
    {
        $points = self::points($ring);
        $count = count($points);

        if ($count === 0) {
            return [0.0, 0.0];
        }

        $twiceArea = 0.0;
        $sumX = 0.0;
        $sumY = 0.0;

        for ($i = 0; $i < $count; $i++) {
            [$x1, $y1] = $points[$i];
            [$x2, $y2] = $points[($i + 1) % $count];

            $cross = $x1 * $y2 - $x2 * $y1;
            $twiceArea += $cross;
            $sumX += ($x1 + $x2) * $cross;
            $sumY += ($y1 + $y2) * $cross;
        }

        if (abs($twiceArea) < self::EPSILON) {
            $averageX = 0.0;
            $averageY = 0.0;

            foreach ($points as [$x, $y]) {
                $averageX += $x;
                $averageY += $y;
            }

            return [$averageX / $count, $averageY / $count];
        }

        // Titik berat berbobot luas: 1/(6A) x jumlah (x1 + x2)(x1 y2 - x2 y1),
        // dengan A = twiceArea / 2.
        return [$sumX / (3.0 * $twiceArea), $sumY / (3.0 * $twiceArea)];
    }

    /**
     * Apakah titik berada di dalam ring, atau tepat pada tepinya.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @param  array{0: float|int, 1: float|int}  $point
     */
    public static function pointInPolygon(array $ring, array $point): bool
    {
        $points = self::points($ring);
        $count = count($points);

        if ($count < 3) {
            return false;
        }

        $x = (float) $point[0];
        $y = (float) $point[1];
        $inside = false;

        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            $current = $points[$i];
            $previous = $points[$j];

            if (self::onSegment($previous, $current, [$x, $y])) {
                return true;
            }

            // Sisi hanya dihitung bila salah satu ujungnya di atas dan yang lain di
            // bawah garis mendatar titik; ujung yang tepat menyentuh dihitung sekali
            // saja supaya tidak meniadakan dirinya sendiri.
            if (($current[1] > $y) !== ($previous[1] > $y)) {
                $intersectionX = $current[0]
                    + ($y - $current[1]) / ($previous[1] - $current[1]) * ($previous[0] - $current[0]);

                if ($x < $intersectionX) {
                    $inside = ! $inside;
                }
            }
        }

        return $inside;
    }

    /**
     * Ring yang di-*inset* ke dalam sejauh jarak tertentu, atau `[]` bila runtuh.
     *
     * Kontur keluaran model segmentasi jarang halus: sisi bisa lebih pendek daripada
     * jarak setback-nya (terukur 0,74 piksel pada setback 1,70 piksel), dan sudutnya
     * bisa di bawah tiga derajat. Offset langsung atas kontur seperti itu menghasilkan
     * jalinan kecil di sela gerigi, dan pada sudut yang sangat tajam sambungan mitre
     * melesat sejauh `1/cos(t/2)` kali jarak offset — puluhan piksel untuk sudut 3
     * derajat. Karena itu offset di sini tidak berhenti pada satu percobaan:
     *
     * 1. Tiap sisi digeser ke arah dalam; pertemuan dua sisi memakai sambungan mitre
     *    bila sudutnya tidak terlalu tajam, dan sambungan bevel di atas ambang itu
     *    sehingga tidak ada puncak yang melesat.
     * 2. Jalinan yang tetap terbentuk dibuang: selama masih ada dua sisi tak
     *    bersebelahan yang berpotongan, rangkaian verteks loop yang lebih pendek
     *    dibuang, dan pemeriksaan diulang sampai ringnya sederhana. Setiap
     *    pembuangan mengurangi jumlah verteks, jadi prosesnya pasti berhenti.
     * 3. Hasilnya diperiksa ketat: sederhana, arah putarannya sama, luasnya mengecil
     *    tetapi tetap positif, dan seluruh titiknya berada di dalam poligon asal.
     * 4. Bila pemeriksaan itu belum lolos, konturnya disederhanakan lebih dulu dengan
     *    toleransi bertahap lalu di-offset ulang. Bidang yang terlalu berigi untuk
     *    di-offset langsung memang hanya bermakna setelah dihaluskan, dan itu jauh
     *    lebih jujur daripada menjawab nol seolah-olah setback menghabiskannya.
     *
     * Seluruh pemeriksaan akhir dibandingkan terhadap poligon **asli**, bukan
     * terhadap poligon yang sudah disederhanakan, supaya luas efektif tidak pernah
     * melebihi luas yang dilaporkan.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}> Ring tertutup, atau kosong.
     */
    public static function inset(array $ring, float $distance): array
    {
        $original = self::points($ring);

        if ($distance <= 0.0) {
            return count($original) < 3 ? [] : self::closeRing($original);
        }

        if (count($original) < 3) {
            return [];
        }

        // Bidang yang memotong dirinya sendiri tidak punya sisi dalam yang jelas:
        // arah "ke dalam" berbeda-beda di sepanjang konturnya, dan offset dengan satu
        // arah global menghasilkan bidang yang salah. Jalinan itu dibuang lebih dulu.
        $base = self::resolveIntersections($original, includeTouches: false);

        if (count($base) < 3) {
            return [];
        }

        // Pembanding luas diambil dari poligon asli maupun bidang yang sudah
        // dinormalkan: kontur yang memotong dirinya sendiri punya luas shoelace yang
        // lebih kecil daripada bidang yang sesungguhnya digambarkannya, dan luas
        // efektif tidak boleh melampaui keduanya.
        $bound = max(abs(self::signedArea($original)), abs(self::signedArea($base)));

        foreach ([0.0, $distance * 0.5, $distance, $distance * 2.0] as $tolerance) {
            $candidate = $tolerance > 0.0
                ? self::points(self::simplify($base, $tolerance))
                : $base;

            if (count($candidate) < 3) {
                continue;
            }

            $result = self::resolveIntersections(self::offsetInward($candidate, $distance), includeTouches: false);

            if ($result !== [] && self::isUsableInset($result, $base, $bound)) {
                return self::closeRing($result);
            }
        }

        return [];
    }

    /**
     * Menggeser tiap sisi ke arah dalam, dengan sambungan mitre dan bevel.
     *
     * Sudut yang lebih tajam daripada `MITER_LIMIT` memakai sambungan bevel: kedua
     * ujung sisi yang digeser dipakai, sehingga puncaknya terpotong datar alih-alih
     * melesat. Untuk sudut yang lebih tumpul, titik potong kedua sisi yang digeser
     * dipakai persis, sehingga persegi tetap menjadi persegi yang lebih kecil tanpa
     * kehilangan sudutnya.
     *
     * @param  array<int, array{0: float, 1: float}>  $points  Tanpa titik penutup.
     * @return array<int, array{0: float, 1: float}>
     */
    private static function offsetInward(array $points, float $distance): array
    {
        $count = count($points);

        // Luas bertanda positif berarti ring berputar searah jarum jam pada sumbu
        // citra yang tumbuh ke bawah, dan normal (-dy, dx) menunjuk ke dalam.
        $orientation = self::signedArea($points) >= 0.0 ? 1.0 : -1.0;

        // Tiap sisi yang sudah digeser: titik awal, arah, dan titik akhirnya.
        $edges = [];

        for ($i = 0; $i < $count; $i++) {
            [$x1, $y1] = $points[$i];
            [$x2, $y2] = $points[($i + 1) % $count];

            $dx = $x2 - $x1;
            $dy = $y2 - $y1;
            $length = sqrt($dx * $dx + $dy * $dy);

            $shiftX = -$orientation * $dy / $length * $distance;
            $shiftY = $orientation * $dx / $length * $distance;

            $edges[] = [
                $x1 + $shiftX,
                $y1 + $shiftY,
                $dx,
                $dy,
                $x2 + $shiftX,
                $y2 + $shiftY,
            ];
        }

        $result = [];

        for ($i = 0; $i < $count; $i++) {
            [$prevX, $prevY, $prevDx, $prevDy, $prevEndX, $prevEndY] = $edges[($i + $count - 1) % $count];
            [$currX, $currY, $currDx, $currDy] = $edges[$i];

            $cross = $prevDx * $currDy - $prevDy * $currDx;

            if (abs($cross) <= self::EPSILON) {
                // Dua sisi yang sejajar tidak punya titik potong tunggal; titik awal
                // sisi yang digeser dipakai apa adanya.
                $result[] = [$currX, $currY];

                continue;
            }

            // Sudut balik sisi: nol bila kedua sisi searah. Panjang sambungan mitre
            // adalah 1/cos(sudut/2) kali jarak offset, dan itulah yang dibatasi.
            $turn = atan2($cross, $prevDx * $currDx + $prevDy * $currDy);
            $miterRatio = 1.0 / max(1e-9, cos(min(M_PI - 1e-9, abs($turn)) / 2.0));

            if ($miterRatio > self::MITER_LIMIT) {
                $result[] = [$prevEndX, $prevEndY];
                $result[] = [$currX, $currY];

                continue;
            }

            // Titik potong P + t D dan Q + s E: t = ((Q - P) x E) / (D x E).
            $t = (($currX - $prevX) * $currDy - ($currY - $prevY) * $currDx) / $cross;
            $result[] = [$prevX + $t * $prevDx, $prevY + $t * $prevDy];
        }

        return $result;
    }

    /**
     * Ring yang sama, tetapi sudah bebas persilangan dan persinggungan.
     *
     * Kontur keluaran model segmentasi memang dapat memotong dirinya sendiri: pada
     * sepuluh bidang sungguhan yang diukur, tujuh di antaranya ditolak PostGIS
     * (`ST_IsValid` false, "Ring Self-intersection"). Selain membuat geometri tidak
     * sah, ring seperti itu membuat shoelace menghitung sebagian luas dua kali atau
     * saling menghapus, sehingga luas yang menjadi dasar kapasitas ikut salah.
     *
     * Perbaikannya memakai jalur yang sama dengan pembersihan hasil offset: selama
     * masih ada sisi yang bersilangan **atau** bersinggungan, rangkaian verteks loop
     * yang lebih pendek dibuang, dan pemeriksaan diulang. Persinggungan ikut
     * diselesaikan di sini — berbeda dengan pembersihan inset — karena ring yang
     * menyentuh dirinya sendiri di satu titik pun tidak sah bagi PostGIS.
     *
     * Hasilnya dipakai untuk semuanya: luas, GeoJSON, `roof_polygon_px` yang disimpan,
     * dan respons ke klien. Tidak ada versi ring yang berbeda di antara keempatnya.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}> Ring tertutup yang sederhana, atau
     *         kosong bila masukannya tidak dapat diselamatkan menjadi bidang.
     */
    public static function makeSimple(array $ring): array
    {
        $points = self::points(self::resolveIntersections(self::points($ring), includeTouches: true));

        return count($points) < 3 ? [] : self::closeRing($points);
    }

    /**
     * Membuang loop yang terbentuk saat ring bersilangan atau bersinggungan.
     *
     * Bila dua sisi tak bersebelahan bertemu, ring terbagi menjadi dua loop. Loop
     * yang lebih pendek adalah jalinan yang muncul dari gerigi, puncak, atau titik
     * yang terulang, jadi itulah yang dibuang; loop lainnya adalah bidangnya. Setiap
     * langkah membuang sedikitnya satu verteks, sehingga prosesnya berhenti dengan
     * sendirinya.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     * @param  bool  $includeTouches  Benar untuk kesederhanaan ketat (PostGIS), salah
     *                                bila persinggungan boleh dibiarkan (hasil offset).
     * @return array<int, array{0: float, 1: float}>
     */
    private static function resolveIntersections(array $points, bool $includeTouches): array
    {
        $points = array_values($points);

        while (count($points) >= 3) {
            $pair = self::firstIntersectingPair($points, $includeTouches);

            if ($pair === null) {
                return $points;
            }

            [$i, $j] = $pair;
            $count = count($points);

            // Kedua loop ditutup di titik temunya. Tanpa titik itu, loop yang hanya
            // terdiri dari dua verteks akan berluas nol dan perbandingannya menyesatkan.
            $crossing = self::intersectionPoint(
                $points[$i],
                $points[($i + 1) % $count],
                $points[$j],
                $points[($j + 1) % $count],
            );

            // Loop dalam (verteks i+1..j) dan loop luar (verteks j+1..i), masing-masing
            // ditutup oleh titik temunya. Yang luasnya lebih kecil adalah jalinannya,
            // dan itu yang dibuang. Perbandingan memakai luas, bukan jumlah verteks:
            // loop dengan sedikit verteks bisa saja justru bagian bidang yang terbesar.
            $inner = array_merge([$crossing], array_slice($points, $i + 1, $j - $i));
            $outer = array_merge(
                [$crossing],
                array_slice($points, $j + 1),
                array_slice($points, 0, $i + 1),
            );

            $points = abs(self::signedArea($inner)) <= abs(self::signedArea($outer))
                ? $outer
                : $inner;
        }

        return [];
    }

    /**
     * Sepasang sisi tak bersebelahan yang bersilangan atau bersinggungan, atau null.
     *
     * `$includeTouches` memisahkan dua kebutuhan yang berbeda. Untuk **kesederhanaan
     * ketat** (PostGIS), persinggungan harus ikut diselesaikan: ring yang menyentuh
     * dirinya sendiri di satu titik tetap tidak sah. Untuk **pembersihan hasil
     * offset**, persinggungan justru harus dibiarkan: dua sisi yang bertemu di satu
     * titik tetap menggambarkan bidang yang utuh, dan membuangnya akan menghilangkan
     * bagian bidang yang sebenarnya sah.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     * @return array{0: int, 1: int}|null
     */
    private static function firstIntersectingPair(array $points, bool $includeTouches): ?array
    {
        $count = count($points);

        for ($i = 0; $i < $count; $i++) {
            $next = ($i + 1) % $count;

            for ($j = $i + 1; $j < $count; $j++) {
                $nextOther = ($j + 1) % $count;

                // Sisi yang bersebelahan berbagi satu titik dan memang boleh bertemu.
                if ($j === $next || $nextOther === $i) {
                    continue;
                }

                $p1 = $points[$i];
                $p2 = $points[$next];
                $p3 = $points[$j];
                $p4 = $points[$nextOther];

                // Penolakan cepat lewat kotak pembatas: pada ring beratus titik, hampir
                // semua pasangan sisi tidak berdekatan sama sekali, dan uji ini
                // menyaringnya tanpa perkalian vektor apa pun.
                if (max($p1[0], $p2[0]) < min($p3[0], $p4[0])
                    || max($p3[0], $p4[0]) < min($p1[0], $p2[0])
                    || max($p1[1], $p2[1]) < min($p3[1], $p4[1])
                    || max($p3[1], $p4[1]) < min($p1[1], $p2[1])) {
                    continue;
                }

                if (self::properlyCrosses($p1, $p2, $p3, $p4)
                    || ($includeTouches && self::touches($p1, $p2, $p3, $p4))) {
                    return [$i, $j];
                }
            }
        }

        return null;
    }

    /**
     * Persegi pembatas minimum (rotated calipers) dari ring.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @param  float  $scale  Faktor pengubah satuan ring menjadi meter; isi meter per
     *                        piksel bila ring dalam piksel, atau 1.0 bila ring sudah
     *                        dalam meter.
     * @return array{
     *     length_m: float,
     *     width_m: float,
     *     rotation_deg: float,
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     * } `length_m`/`width_m` dalam meter, `length`/`width` dalam satuan ring,
     *   `center` dalam satuan ring, `rotation_deg` sudut sisi panjang terhadap sumbu
     *   x ring dinormalkan ke [-90, 90).
     */
    public static function minAreaRectangle(array $ring, float $scale = 1.0): array
    {
        $points = self::points($ring);
        $hull = count($points) < 3 ? $points : self::convexHull($points);

        if (count($hull) < 2) {
            return self::rectangle(0.0, 0.0, 0.0, self::centroid($points), $scale);
        }

        if (count($hull) === 2) {
            // Hull yang seluruhnya segaris hanya menyisakan ruas: lebarnya nol,
            // tetapi arah dan panjangnya masih bermakna.
            $dx = $hull[1][0] - $hull[0][0];
            $dy = $hull[1][1] - $hull[0][1];
            $center = [
                ($hull[0][0] + $hull[1][0]) / 2.0,
                ($hull[0][1] + $hull[1][1]) / 2.0,
            ];

            return self::rectangle(
                sqrt($dx * $dx + $dy * $dy),
                0.0,
                self::normaliseDegrees(rad2deg(atan2($dy, $dx))),
                $center,
                $scale,
            );
        }

        $best = null;
        $hullCount = count($hull);

        for ($i = 0; $i < $hullCount; $i++) {
            [$x1, $y1] = $hull[$i];
            [$x2, $y2] = $hull[($i + 1) % $hullCount];

            $dx = $x2 - $x1;
            $dy = $y2 - $y1;
            $edgeLength = sqrt($dx * $dx + $dy * $dy);

            if ($edgeLength <= self::EPSILON) {
                continue;
            }

            $ux = $dx / $edgeLength;
            $uy = $dy / $edgeLength;

            $minU = INF;
            $maxU = -INF;
            $minV = INF;
            $maxV = -INF;

            foreach ($hull as [$x, $y]) {
                $u = $x * $ux + $y * $uy;
                $v = -$x * $uy + $y * $ux;

                $minU = min($minU, $u);
                $maxU = max($maxU, $u);
                $minV = min($minV, $v);
                $maxV = max($maxV, $v);
            }

            $spanU = $maxU - $minU;
            $spanV = $maxV - $minV;
            $area = $spanU * $spanV;

            if ($best !== null && $area >= $best['area'] - 1e-9) {
                continue;
            }

            // Kembalikan pusat dari koordinat (u, v) ke koordinat ring.
            $centerU = ($minU + $maxU) / 2.0;
            $centerV = ($minV + $maxV) / 2.0;

            $best = [
                'area' => $area,
                'spanU' => $spanU,
                'spanV' => $spanV,
                'ux' => $ux,
                'uy' => $uy,
                'center' => [
                    $centerU * $ux - $centerV * $uy,
                    $centerU * $uy + $centerV * $ux,
                ],
            ];
        }

        if ($best === null) {
            return self::rectangle(0.0, 0.0, 0.0, self::centroid($points), $scale);
        }

        // Sisi panjang persegi adalah rentang yang lebih besar, dan arahnya yang
        // menentukan sudut rotasi.
        $alongU = $best['spanU'] >= $best['spanV'];
        $dirX = $alongU ? $best['ux'] : -$best['uy'];
        $dirY = $alongU ? $best['uy'] : $best['ux'];

        return self::rectangle(
            max($best['spanU'], $best['spanV']),
            min($best['spanU'], $best['spanV']),
            self::normaliseDegrees(rad2deg(atan2($dirY, $dirX))),
            $best['center'],
            $scale,
        );
    }

    /**
     * Empat titik sudut persegi panjang pembatas terkecil (ring terbuka).
     *
     * Mengembalikan array kosong bila ring tidak membentuk bidang bernilai luas.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    public static function minAreaRectangleCorners(array $ring): array
    {
        $rect = self::minAreaRectangle($ring);

        if ($rect['length'] <= self::EPSILON || $rect['width'] <= self::EPSILON) {
            return [];
        }

        $rad = deg2rad($rect['rotation_deg']);
        $ux = cos($rad);
        $uy = sin($rad);
        $vx = -$uy;
        $vy = $ux;

        $halfLength = $rect['length'] / 2.0;
        $halfWidth = $rect['width'] / 2.0;
        [$cx, $cy] = $rect['center'];

        return [
            [
                round($cx - $halfLength * $ux - $halfWidth * $vx, 2),
                round($cy - $halfLength * $uy - $halfWidth * $vy, 2),
            ],
            [
                round($cx + $halfLength * $ux - $halfWidth * $vx, 2),
                round($cy + $halfLength * $uy - $halfWidth * $vy, 2),
            ],
            [
                round($cx + $halfLength * $ux + $halfWidth * $vx, 2),
                round($cy + $halfLength * $uy + $halfWidth * $vy, 2),
            ],
            [
                round($cx - $halfLength * $ux + $halfWidth * $vx, 2),
                round($cy - $halfLength * $uy + $halfWidth * $vy, 2),
            ],
        ];
    }

    /**
     * Merapikan kontur mask segmentasi menjadi poligon arsitektural yang bersih.
     *
     * Mask YOLO yang membulat ("blobby") dengan rasio luas terhadap kotak pembatas
     * terkecil >= `$rectangularityThreshold` dirapikan ke empat sudut siku 90°,
     * sedangkan bentuk majemuk seperti atap L/U tetap mempertahankan bentuk aslinya
     * dengan tepi yang disederhanakan. Kontur memanjang melebihi `$maxAspectRatio`
     * (misal false positive jalan) dibuang dengan mengembalikan array kosong.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}> Ring tertutup sederhana, atau kosong bila disaring.
     */
    public static function regularize(
        array $ring,
        float $simplifyTolerancePx = 1.8,
        float $rectangularityThreshold = 0.80,
        float $maxAspectRatio = 5.0,
    ): array {
        $simple = self::makeSimple(self::simplify($ring, $simplifyTolerancePx));

        if (count($simple) < 4) {
            return [];
        }

        $area = self::area($simple);
        $rect = self::minAreaRectangle($simple);

        if ($area <= self::EPSILON || $rect['width'] <= self::EPSILON) {
            return [];
        }

        if ($maxAspectRatio > 0.0 && ($rect['length'] / $rect['width']) > $maxAspectRatio) {
            return [];
        }

        $rectArea = $rect['length'] * $rect['width'];
        $rectangularity = $rectArea > self::EPSILON ? ($area / $rectArea) : 0.0;

        if ($rectangularityThreshold > 0.0 && $rectangularityThreshold <= 1.0 && $rectangularity >= $rectangularityThreshold) {
            $corners = self::minAreaRectangleCorners($simple);

            if ($corners !== []) {
                return self::closeRing($corners);
            }
        }

        // Bentuk non-persegi (mis. L/U) tetap dijaga bentuknya, namun bila masih
        // sangat padat verteks karena mask blobby, sederhanakan ulang sedikit lebih tegas.
        if (count(self::openRing($simple)) > 12) {
            $firmer = self::makeSimple(self::simplify($simple, max($simplifyTolerancePx, 2.5)));

            if (count($firmer) >= 4) {
                return $firmer;
            }
        }

        return $simple;
    }

    /**
     * Penyederhanaan ring dengan Douglas-Peucker, ring tertutup.
     *
     * Mask dari model segmentasi sangat padat: satu tangkapan 512 piksel dengan 14
     * deteksi menghasilkan lebih dari enam ribu titik, dan poligon terbesarnya
     * sendiri mencapai ribuan titik. Diteruskan apa adanya, satu simulasi dapat
     * menyimpan ratusan kilobita JSON yang seluruhnya hanya menggambarkan tepi yang
     * bergerigi beberapa persepuluh piksel.
     *
     * Ring diperlakukan sebagai dua jalur yang bertemu di titik terjauh dari titik
     * pertama. Titik pertemuan itu dipilih, bukan titik pertama, supaya bentuk di
     * sekitar titik awal tidak ikut terhapus — Douglas-Peucker selalu mempertahankan
     * kedua ujung jalurnya.
     *
     * Bila penyederhanaan menyisakan kurang dari tiga titik sudut, ring aslinya
     * dikembalikan: bidang yang sedemikian tipis tidak punya bentuk yang dapat
     * disederhanakan, dan mengosongkannya akan menghilangkan bidang yang nyata.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @param  float  $tolerancePx  Jarak maksimum titik yang boleh dibuang, dalam
     *                              satuan ring.
     * @return array<int, array{0: float, 1: float}> Ring tertutup dengan minimal
     *         tiga titik sudut; kosong bila masukannya bukan poligon.
     */
    public static function simplify(array $ring, float $tolerancePx): array
    {
        $points = self::points($ring);
        $count = count($points);

        if ($count < 4 || $tolerancePx <= 0.0) {
            return $count < 3 ? [] : self::closeRing($points);
        }

        $anchor = self::farthestPointIndex($points, $points[0]);

        $simplified = array_merge(
            self::douglasPeucker(array_slice($points, 0, $anchor + 1), $tolerancePx),
            array_slice(self::douglasPeucker(array_slice($points, $anchor), $tolerancePx), 1),
        );

        $unique = self::dropRedundantPoints(self::points($simplified), $tolerancePx);

        return count($unique) < 3 ? self::closeRing($points) : self::closeRing($unique);
    }

    /**
     * Apakah titik pertama dan terakhir ring sama — syarat ring GeoJSON.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     */
    public static function isClosedRing(array $ring): bool
    {
        $points = array_values($ring);
        $count = count($points);

        if ($count < 3) {
            return false;
        }

        $first = [(float) $points[0][0], (float) $points[0][1]];
        $last = $points[$count - 1];

        return self::samePoint($first, [(float) $last[0], (float) $last[1]]);
    }

    /**
     * Ring tertutup. Ring yang sudah tertutup dikembalikan apa adanya.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    public static function closeRing(array $ring): array
    {
        $points = [];

        foreach ($ring as $point) {
            $points[] = [(float) $point[0], (float) $point[1]];
        }

        if ($points === []) {
            return [];
        }

        if (! self::samePoint($points[0], $points[count($points) - 1])) {
            $points[] = $points[0];
        }

        return $points;
    }

    /**
     * Ring tanpa titik penutup dan tanpa titik berulang berturut-turut.
     *
     * Kebalikan dari `closeRing()`, dan bentuk yang dipakai pada ruang piksel: titik
     * penutup hanya syarat ring GeoJSON, sedangkan antarmuka menggambar poligon
     * piksel dari daftar titik sudutnya saja.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    public static function openRing(array $ring): array
    {
        return self::points($ring);
    }

    /**
     * Ring sebagai daftar titik bertipe float, tanpa titik penutup dan tanpa titik
     * berulang berturut-turut.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    private static function points(array $ring): array
    {
        $casted = [];

        foreach ($ring as $point) {
            $casted[] = [(float) $point[0], (float) $point[1]];
        }

        if (count($casted) > 1 && self::samePoint($casted[0], $casted[count($casted) - 1])) {
            array_pop($casted);
        }

        $points = [];

        foreach ($casted as $point) {
            if ($points === [] || ! self::samePoint($points[count($points) - 1], $point)) {
                $points[] = $point;
            }
        }

        return $points;
    }

    /**
     * Luas bertanda: positif bila ring berputar searah jarum jam pada sumbu citra
     * yang tumbuh ke bawah.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     */
    private static function signedArea(array $points): float
    {
        $count = count($points);
        $sum = 0.0;

        for ($i = 0; $i < $count; $i++) {
            [$x1, $y1] = $points[$i];
            [$x2, $y2] = $points[($i + 1) % $count];

            $sum += $x1 * $y2 - $x2 * $y1;
        }

        return $sum / 2.0;
    }

    /**
     * Hasil offset hanya dipakai bila ringnya benar-benar bidang yang menyusut.
     *
     * Pemeriksaannya memakai persilangan sungguhan, bukan kesederhanaan ketat:
     * kontur mask kerap menyentuh dirinya sendiri di satu titik, dan bidang seperti
     * itu tetap satu bidang yang utuh. Yang tidak boleh ada adalah sisi yang saling
     * melewati, karena di situlah luasnya tidak lagi menggambarkan bidangnya.
     *
     * @param  array<int, array{0: float, 1: float}>  $result
     * @param  array<int, array{0: float, 1: float}>  $base  Bidang yang benar-benar di-offset.
     */
    private static function isUsableInset(array $result, array $base, float $bound): bool
    {
        if (count($result) < 3 || self::firstIntersectingPair($result, includeTouches: false) !== null) {
            return false;
        }

        $resultArea = self::signedArea($result);

        if ($resultArea === 0.0 || abs($resultArea) >= $bound) {
            return false;
        }

        $orientation = self::signedArea($base) >= 0.0 ? 1.0 : -1.0;

        if (($resultArea >= 0.0 ? 1.0 : -1.0) !== $orientation) {
            return false;
        }

        // Sambungan mitre pada sudut yang tajam dapat melompat ke luar bidang;
        // titik di luar bidang asal berarti hasilnya bukan lagi bagian dari atap.
        foreach ($result as $point) {
            if (! self::pointInPolygon($base, $point)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Titik temu dua sisi.
     *
     * Untuk sisi yang bersilangan, titik potong kedua garisnya. Untuk sisi yang
     * bersinggungan (segaris atau berbagi ujung), titik terdekat antara kedua pasang
     * ujungnya — itulah tempat keduanya benar-benar bertemu.
     *
     * @param  array{0: float, 1: float}  $p1
     * @param  array{0: float, 1: float}  $p2
     * @param  array{0: float, 1: float}  $p3
     * @param  array{0: float, 1: float}  $p4
     * @return array{0: float, 1: float}
     */
    private static function intersectionPoint(array $p1, array $p2, array $p3, array $p4): array
    {
        $firstX = $p2[0] - $p1[0];
        $firstY = $p2[1] - $p1[1];
        $secondX = $p4[0] - $p3[0];
        $secondY = $p4[1] - $p3[1];

        $cross = $firstX * $secondY - $firstY * $secondX;

        if (abs($cross) > self::EPSILON) {
            $t = (($p3[0] - $p1[0]) * $secondY - ($p3[1] - $p1[1]) * $secondX) / $cross;

            return [$p1[0] + $t * $firstX, $p1[1] + $t * $firstY];
        }

        $closest = [$p1, $p3];
        $closestDistance = INF;

        foreach ([[$p1, $p3], [$p1, $p4], [$p2, $p3], [$p2, $p4]] as [$a, $b]) {
            $distance = ($a[0] - $b[0]) ** 2 + ($a[1] - $b[1]) ** 2;

            if ($distance < $closestDistance) {
                $closestDistance = $distance;
                $closest = [$a, $b];
            }
        }

        return [
            ($closest[0][0] + $closest[1][0]) / 2.0,
            ($closest[0][1] + $closest[1][1]) / 2.0,
        ];
    }

    /**
     * Apakah dua sisi saling melewati — persilangan sungguhan, bukan persinggungan.
     *
     * @param  array{0: float, 1: float}  $p1
     * @param  array{0: float, 1: float}  $p2
     * @param  array{0: float, 1: float}  $p3
     * @param  array{0: float, 1: float}  $p4
     */
    private static function properlyCrosses(array $p1, array $p2, array $p3, array $p4): bool
    {
        $d1 = self::cross($p3, $p4, $p1);
        $d2 = self::cross($p3, $p4, $p2);
        $d3 = self::cross($p1, $p2, $p3);
        $d4 = self::cross($p1, $p2, $p4);

        $straddlesFirst = ($d1 > 0.0 && $d2 < 0.0) || ($d1 < 0.0 && $d2 > 0.0);
        $straddlesSecond = ($d3 > 0.0 && $d4 < 0.0) || ($d3 < 0.0 && $d4 > 0.0);

        return $straddlesFirst && $straddlesSecond;
    }

    /**
     * Apakah dua sisi bersinggungan: salah satu ujungnya terletak pada sisi yang lain.
     *
     * Persinggungan mencakup titik yang terulang pada kontur dan dua sisi yang
     * bertumpuk segaris. Keduanya tidak mengubah luas, tetapi membuat ring menyentuh
     * dirinya sendiri — dan PostGIS menolak ring seperti itu.
     *
     * @param  array{0: float, 1: float}  $p1
     * @param  array{0: float, 1: float}  $p2
     * @param  array{0: float, 1: float}  $p3
     * @param  array{0: float, 1: float}  $p4
     */
    private static function touches(array $p1, array $p2, array $p3, array $p4): bool
    {
        return self::onSegment($p3, $p4, $p1)
            || self::onSegment($p3, $p4, $p2)
            || self::onSegment($p1, $p2, $p3)
            || self::onSegment($p1, $p2, $p4);
    }

    /**
     * Apakah titik berada pada ruas, dengan toleransi kesamaan titik.
     *
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     * @param  array{0: float, 1: float}  $point
     */
    private static function onSegment(array $a, array $b, array $point): bool
    {
        if (abs(self::cross($a, $b, $point)) > self::EPSILON) {
            return false;
        }

        return $point[0] >= min($a[0], $b[0]) - self::EPSILON
            && $point[0] <= max($a[0], $b[0]) + self::EPSILON
            && $point[1] >= min($a[1], $b[1]) - self::EPSILON
            && $point[1] <= max($a[1], $b[1]) + self::EPSILON;
    }

    /**
     * Convex hull (rantai monoton Andrew) tanpa titik yang segaris.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     * @return array<int, array{0: float, 1: float}>
     */
    private static function convexHull(array $points): array
    {
        $points = array_values(array_unique($points, SORT_REGULAR));
        $count = count($points);

        if ($count < 3) {
            return $points;
        }

        usort($points, static function (array $a, array $b): int {
            return $a[0] === $b[0] ? $a[1] <=> $b[1] : $a[0] <=> $b[0];
        });

        $walk = static function (array $ordered): array {
            $chain = [];

            foreach ($ordered as $point) {
                while (count($chain) >= 2
                    && self::cross($chain[count($chain) - 2], $chain[count($chain) - 1], $point) <= 0.0) {
                    array_pop($chain);
                }

                $chain[] = $point;
            }

            return $chain;
        };

        $lower = $walk($points);
        $upper = $walk(array_reverse($points));

        array_pop($lower);
        array_pop($upper);

        return array_merge($lower, $upper);
    }

    /**
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     * @param  array{0: float, 1: float}  $point
     */
    private static function cross(array $a, array $b, array $point): float
    {
        return ($b[0] - $a[0]) * ($point[1] - $a[1]) - ($b[1] - $a[1]) * ($point[0] - $a[0]);
    }

    /**
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     */
    private static function samePoint(array $a, array $b): bool
    {
        return abs($a[0] - $b[0]) <= self::EPSILON && abs($a[1] - $b[1]) <= self::EPSILON;
    }

    /**
     * Membuang titik yang masih berlebih setelah penyederhanaan.
     *
     * Douglas-Peucker selalu mempertahankan kedua ujung jalurnya, dan pada ring titik
     * awal adalah salah satu ujung itu — padahal titik awal tidak punya arti
     * geometris apa pun pada sebuah bidang. Sekali pemeriksaan keliling menyingkirkan
     * titik itu bersama sisa titik yang ternyata masih segaris, dan berhenti sebelum
     * bidangnya kehilangan bentuk: tiga titik sudut selalu tersisa.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     * @return array<int, array{0: float, 1: float}>
     */
    private static function dropRedundantPoints(array $points, float $tolerance): array
    {
        $kept = array_values($points);
        $changed = true;

        while ($changed && count($kept) > 3) {
            $changed = false;
            $count = count($kept);

            for ($i = 0; $i < $count && count($kept) > 3; $i++) {
                $previous = $kept[($i + $count - 1) % $count];
                $current = $kept[$i];
                $next = $kept[($i + 1) % $count];

                if (self::distanceToSegment($current, $previous, $next) <= $tolerance + 1e-9) {
                    array_splice($kept, $i, 1);
                    $changed = true;

                    // Indeks setelah titik yang dibuang sudah bergeser.
                    break;
                }
            }
        }

        return $kept;
    }

    /**
     * Douglas-Peucker atas satu jalur terbuka. Kedua ujung jalur selalu dipertahankan.
     *
     * @param  array<int, array{0: float, 1: float}>  $path
     * @return array<int, array{0: float, 1: float}>
     */
    private static function douglasPeucker(array $path, float $tolerance): array
    {
        $count = count($path);

        if ($count < 3) {
            return $path;
        }

        $first = $path[0];
        $last = $path[$count - 1];
        $farthest = 0.0;
        $index = 0;

        for ($i = 1; $i < $count - 1; $i++) {
            $distance = self::distanceToSegment($path[$i], $first, $last);

            if ($distance > $farthest) {
                $farthest = $distance;
                $index = $i;
            }
        }

        if ($farthest <= $tolerance) {
            return [$first, $last];
        }

        $left = self::douglasPeucker(array_slice($path, 0, $index + 1), $tolerance);
        $right = self::douglasPeucker(array_slice($path, $index), $tolerance);

        // Titik belah muncul di kedua hasil.
        return array_merge(array_slice($left, 0, -1), $right);
    }

    /**
     * Jarak titik ke ruas terdekat, bukan ke garis perpanjangannya, supaya titik di
     * luar rentang ujung tidak dianggap dekat hanya karena segaris.
     *
     * @param  array{0: float, 1: float}  $point
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     */
    private static function distanceToSegment(array $point, array $a, array $b): float
    {
        $dx = $b[0] - $a[0];
        $dy = $b[1] - $a[1];
        $lengthSquared = $dx * $dx + $dy * $dy;

        if ($lengthSquared <= 0.0) {
            return sqrt(($point[0] - $a[0]) ** 2 + ($point[1] - $a[1]) ** 2);
        }

        $projection = (($point[0] - $a[0]) * $dx + ($point[1] - $a[1]) * $dy) / $lengthSquared;
        $projection = max(0.0, min(1.0, $projection));

        $closestX = $a[0] + $projection * $dx;
        $closestY = $a[1] + $projection * $dy;

        return sqrt(($point[0] - $closestX) ** 2 + ($point[1] - $closestY) ** 2);
    }

    /**
     * Indeks titik terjauh dari satu titik acuan.
     *
     * @param  array<int, array{0: float, 1: float}>  $points
     * @param  array{0: float, 1: float}  $origin
     */
    private static function farthestPointIndex(array $points, array $origin): int
    {
        $index = 0;
        $farthest = -1.0;

        foreach ($points as $candidate => $point) {
            $distance = ($point[0] - $origin[0]) ** 2 + ($point[1] - $origin[1]) ** 2;

            if ($distance > $farthest) {
                $farthest = $distance;
                $index = $candidate;
            }
        }

        return $index;
    }

    /**
     * @param  array{0: float, 1: float}  $center
     * @return array{
     *     length_m: float,
     *     width_m: float,
     *     rotation_deg: float,
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     * }
     */
    private static function rectangle(float $length, float $width, float $rotationDeg, array $center, float $scale): array
    {
        return [
            'length_m' => $length * $scale,
            'width_m' => $width * $scale,
            'rotation_deg' => $rotationDeg,
            'center' => $center,
            'length' => $length,
            'width' => $width,
        ];
    }

    /**
     * Sudut dinormalkan ke [-90, 90): persegi simetris terhadap putaran 180 derajat,
     * sehingga hanya satu wakil yang perlu dipilih agar dapat dibandingkan.
     */
    private static function normaliseDegrees(float $degrees): float
    {
        while ($degrees >= 90.0) {
            $degrees -= 180.0;
        }

        while ($degrees < -90.0) {
            $degrees += 180.0;
        }

        return $degrees;
    }
}
