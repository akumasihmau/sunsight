<?php

namespace Tests\Feature;

use App\Models\ImageryAsset;
use App\Models\User;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Imagery\ImageryBoundingBox;
use App\Services\IrradianceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeIrradianceProvider;
use Tests\TestCase;

class RoofDetectionTest extends TestCase
{
    use RefreshDatabase;

    /** Tangkapan uji 512 x 512 piksel dengan skala tepat 0,5 m/px. */
    private const BBOX = [106.8000000, -6.6023152, 106.8023151, -6.6000000];

    private const ZOOM = 19;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Simulasi lanjutan pada uji alur juga tidak boleh menyentuh jaringan.
        $this->app->bind(IrradianceProvider::class, fn () => new FakeIrradianceProvider);
    }

    public function test_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/roof-detections', [])->assertStatus(401);
    }

    public function test_mengembalikan_seluruh_bidang_terurut_menurut_keyakinan(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse([
            self::detection('det_a', self::square(100, 100, 40), 0.55),
            self::detection('det_b', self::square(200, 200, 60), 0.92),
        ]))]);

        $response = $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload())
            ->assertOk();

        $response->assertJsonStructure([
            'image_id',
            'detection_id',
            'model' => ['name', 'version'],
            'image' => ['width', 'height', 'bbox', 'meters_per_pixel', 'zoom'],
            'roofs' => [['id', 'polygon_px', 'polygon_lnglat', 'bbox_px' => ['x1', 'y1', 'x2', 'y2'], 'confidence', 'area_sqm']],
        ]);

        $this->assertSame('req_uji_1', $response->json('detection_id'));
        $this->assertSame('yolov8n-seg', $response->json('model.name'));
        $this->assertSame('roof-v1.0.0', $response->json('model.version'));
        $this->assertSame(512, $response->json('image.width'));
        $this->assertEqualsWithDelta(0.5, (float) $response->json('image.meters_per_pixel'), 0.001);
        $this->assertSame(self::ZOOM, $response->json('image.zoom'));
        $this->assertEquals(self::BBOX, $response->json('image.bbox'));

        // Bidang dengan keyakinan tertinggi lebih dulu.
        $this->assertSame('det_b', $response->json('roofs.0.id'));
        $this->assertSame('det_a', $response->json('roofs.1.id'));

        // 60 x 60 piksel pada 0,5 m/px adalah 30 x 30 meter.
        $this->assertEqualsWithDelta(900.0, (float) $response->json('roofs.0.area_sqm'), 0.01);
        $this->assertEqualsWithDelta(400.0, (float) $response->json('roofs.1.area_sqm'), 0.01);

        // Ruang piksel memakai ring terbuka, ruang geografis memakai ring tertutup.
        $this->assertCount(4, $response->json('roofs.0.polygon_px'));
        $this->assertCount(5, $response->json('roofs.0.polygon_lnglat'));
        $this->assertEquals([200, 200], $response->json('roofs.0.polygon_px.0'));
    }

    public function test_tangkapan_tidak_pernah_ditulis_ke_penyimpanan(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse([self::detection('det_a', self::square(100, 100, 40))]))]);

        $imageId = $this->actingAsUser()->post('/api/roof-detections', $this->upload())->assertOk()->json('image_id');

        $asset = ImageryAsset::query()->sole();

        $this->assertSame($imageId, $asset->image_id);
        $this->assertSame(ImageryAsset::KIND_CAPTURE, $asset->kind);
        $this->assertNull($asset->path);
        $this->assertNull($asset->extension);
        $this->assertNull($asset->mime_type);
        $this->assertSame(512, $asset->width);
        $this->assertSame(self::ZOOM, $asset->zoom);
        $this->assertEqualsWithDelta(0.5, (float) $asset->meters_per_pixel, 0.001);
        $this->assertEqualsWithDelta(-6.6011576, (float) $asset->center_lat, 1e-6);
        $this->assertEqualsWithDelta(106.8011576, (float) $asset->center_lng, 1e-6);

        // Berkas tangkapan hanya diteruskan ke layanan model, tidak disimpan.
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_tidak_ada_bidang_yang_ditemukan_tetap_berhasil(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse([]))]);

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload())
            ->assertOk()
            ->assertJsonCount(0, 'roofs');
    }

    public function test_layanan_model_yang_tidak_dapat_dihubungi_dijawab_503(): void
    {
        Http::fake(['*' => Http::failedConnection('cURL error 6: Could not resolve host: 127.0.0.1')]);

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload())
            ->assertStatus(503)
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'tidak dapat dihubungi'));

        // Deteksi yang gagal tidak boleh meninggalkan aset yatim.
        $this->assertDatabaseCount('imagery_assets', 0);
    }

    public function test_layanan_model_yang_lewat_batas_waktu_dijawab_504(): void
    {
        Http::fake(['*' => Http::failedConnection('cURL error 28: Operation timed out after 60001 milliseconds with 0 bytes received')]);

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload())
            ->assertStatus(504)
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'batas waktu'));

        $this->assertDatabaseCount('imagery_assets', 0);
    }

    public function test_batas_waktu_layanan_model_memberi_ruang_untuk_inferensi_cpu(): void
    {
        // Permintaan pertama setelah layanan dinyalakan memerlukan belasan detik untuk
        // pemanasan model, dan mesin yang lebih lambat dua kali lebih lama; batas 15
        // detik akan menggagalkan permintaan yang sebenarnya sehat.
        $this->assertSame(60, (int) config('services.ml.timeout'));
    }

    public function test_menolak_bbox_yang_tidak_konsisten_dengan_ukuran_berkas(): void
    {
        Http::fake();

        // Rentang bujur lima kali lebih lebar dari yang seharusnya, sehingga skala
        // lintang dan bujur berselisih jauh lebih dari 2%.
        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload([
                'bbox' => json_encode([106.7900000, -6.6023152, 106.8123151, -6.6000000]),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');

        Http::assertNothingSent();
    }

    public function test_menolak_bbox_yang_tidak_berurutan_atau_terlalu_lebar(): void
    {
        Http::fake();

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['bbox' => json_encode([106.81, -6.60, 106.80, -6.59])]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');

        // Rentang lintang 0,05 derajat adalah batas kontrak.
        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['bbox' => json_encode([106.80, -6.70, 106.8023151, -6.60])]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['bbox' => 'bukan json']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');

        Http::assertNothingSent();
    }

    public function test_menolak_ukuran_yang_di_luar_rentang(): void
    {
        Http::fake();

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['width' => 32]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('width');

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['zoom' => 30]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zoom');

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['min_confidence' => 1.5]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('min_confidence');

        Http::assertNothingSent();
    }

    public function test_menolak_berkas_yang_bukan_gambar(): void
    {
        Http::fake();

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload([
                'file' => UploadedFile::fake()->create('catatan.txt', 4, 'text/plain'),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        Http::assertNothingSent();
    }

    public function test_berkas_yang_melebihi_batas_dijawab_413(): void
    {
        Http::fake();

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload([
                // Sedikit di atas sepuluh megabita, karena ukuran tepat sepuluh
                // megabita masih diterima.
                'file' => UploadedFile::fake()->create('tangkapan.jpg', 10 * 1024 + 1, 'image/jpeg'),
            ]))
            ->assertStatus(413);

        $this->assertDatabaseCount('imagery_assets', 0);
        Http::assertNothingSent();
    }

    public function test_permintaan_ke_layanan_model_memakai_multipart_tanpa_roi(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse())]);

        $this->actingAsUser()
            ->post('/api/roof-detections', $this->upload(['min_confidence' => 0.4]))
            ->assertOk();

        Http::assertSent(function (Request $request): bool {
            $body = (string) $request->body();

            return str_starts_with($request->url(), 'http://127.0.0.1:8001/api/v1/predict')
                // Ambang keyakinan dibaca layanan model dari query string, bukan dari
                // badan multipart; dikirim sebagai field, nilainya diabaikan.
                && str_contains($request->url(), 'min_confidence=0.4')
                && str_contains($body, 'name="file"')
                && str_contains($body, 'filename="capture.jpg"')
                // Seluruh tangkapan diperiksa, jadi tidak ada ROI yang dikirim.
                && ! str_contains($request->url(), 'roi_')
                && ! str_contains($body, 'roi_');
        });
    }

    public function test_keyakinan_minimum_tidak_dikirim_bila_tidak_diminta(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse())]);

        $this->actingAsUser()->post('/api/roof-detections', $this->upload())->assertOk();

        Http::assertSent(fn (Request $request): bool => ! str_contains($request->url(), 'min_confidence')
            && ! str_contains((string) $request->body(), 'min_confidence'));
    }

    public function test_poligon_yang_padat_disederhanakan_sebelum_dikembalikan(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse([
            self::detection('det_padat', self::denseSquare(50, 50, 400, 100), 0.9),
        ]))]);

        $response = $this->actingAsUser()->post('/api/roof-detections', $this->upload())->assertOk();

        // Empat ratus titik masuk, empat titik sudut keluar.
        $this->assertCount(4, $response->json('roofs.0.polygon_px'));

        // Toleransi 0,5 piksel: 400 x 400 piksel pada 0,5 m/px tetap 400 x 400 meter persegi.
        $this->assertEqualsWithDelta(40000.0, (float) $response->json('roofs.0.area_sqm'), 1.0);
    }

    public function test_hasil_deteksi_dapat_langsung_disimulasikan(): void
    {
        Http::fake(['*' => Http::response(self::mlResponse([
            self::detection('det_a', self::square(100, 100, 40), 0.9),
        ]))]);

        $user = User::factory()->create();

        $detection = $this->actingAs($user, 'sanctum')
            ->post('/api/roof-detections', $this->upload())
            ->assertOk();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/analyses', [
            'image_id' => $detection->json('image_id'),
            'roofs' => [[
                'label' => 'Bidang Atap Utama',
                'detection_id' => $detection->json('roofs.0.id'),
                'confidence' => $detection->json('roofs.0.confidence'),
                'roof_polygon_px' => $detection->json('roofs.0.polygon_px'),
                'setback_m' => 0.5,
                'gutter_m' => 0.6,
                'tilt_deg' => 22,
                'azimuth_deg' => 188,
                'module_key' => 'mono_perc_550',
                'orientation' => 'portrait',
                'clearance_m' => 0.03,
                'panel_count' => null,
            ]],
            'inverter_type' => 'string',
            'monthly_bill_idr' => 2_800_000,
            'tariff_key' => 'R2',
        ])->assertStatus(201);

        $this->assertSame(1, $response->json('result.roof_count'));
        $this->assertSame('det_a', $response->json('roofs.0.detection_id'));
        $this->assertEqualsWithDelta(0.9, (float) $response->json('roofs.0.confidence'), 0.0001);
        $this->assertEqualsWithDelta(self::ZOOM, (float) $response->json('map_zoom'), 0.001);
        $this->assertSame('Polygon', $response->json('roofs.0.roof_polygon.type'));
        $this->assertGreaterThan(0, $response->json('roofs.0.result.installed'));
    }

    public function test_poligon_menyilang_dari_layanan_model_dirapikan_sebelum_dipakai(): void
    {
        // Model segmentasi memang dapat mengembalikan kontur yang menyilang dirinya
        // sendiri. Ring seperti itu bukan bidang yang sah bagi PostGIS, dan shoelace-nya
        // menghitung sebagian luas dua kali.
        $bowtie = [[100, 100], [300, 300], [300, 100], [100, 300]];

        Http::fake(['*' => Http::response(self::mlResponse([
            self::detection('det_silang', $bowtie, 0.8),
        ]))]);

        $response = $this->actingAsUser()->post('/api/roof-detections', $this->upload())->assertOk();

        $polygon = $response->json('roofs.0.polygon_px');

        $this->assertGreaterThanOrEqual(3, count($polygon));
        $this->assertSame(0, self::crossings($polygon), 'Poligon yang dikirim balik harus sederhana.');

        // Luas dihitung dari ring hasil perapian, bukan dari ring mentah, dan skalanya
        // dihitung server dari bbox — bukan angka bulat yang diasumsikan uji.
        $metersPerPixel = ImageryBoundingBox::metersPerPixelFromBbox(self::BBOX, 512, 512)['lat'];

        $this->assertEqualsWithDelta(
            PolygonGeometry::area($polygon) * $metersPerPixel ** 2,
            (float) $response->json('roofs.0.area_sqm'),
            0.01,
        );
    }

    /**
     * Jumlah pasangan sisi tak bersebelahan yang benar-benar bersilangan.
     *
     * Ditulis ulang di sini dengan sengaja, supaya uji ini tidak ikut lolos bila
     * pemeriksa di kelasnya salah.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     */
    private static function crossings(array $ring): int
    {
        $count = count($ring);
        $hasil = 0;

        $cross = static fn (array $a, array $b, array $p): float => ($b[0] - $a[0]) * ($p[1] - $a[1]) - ($b[1] - $a[1]) * ($p[0] - $a[0]);

        for ($i = 0; $i < $count; $i++) {
            $next = ($i + 1) % $count;

            for ($j = $i + 1; $j < $count; $j++) {
                $nextOther = ($j + 1) % $count;

                if ($j === $next || $nextOther === $i) {
                    continue;
                }

                $d1 = $cross($ring[$j], $ring[$nextOther], $ring[$i]);
                $d2 = $cross($ring[$j], $ring[$nextOther], $ring[$next]);
                $d3 = $cross($ring[$i], $ring[$next], $ring[$j]);
                $d4 = $cross($ring[$i], $ring[$next], $ring[$nextOther]);

                if ((($d1 > 0 && $d2 < 0) || ($d1 < 0 && $d2 > 0)) && (($d3 > 0 && $d4 < 0) || ($d3 < 0 && $d4 > 0))) {
                    $hasil++;
                }
            }
        }

        return $hasil;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function upload(array $overrides = []): array
    {
        return array_merge([
            'file' => UploadedFile::fake()->image('capture.jpg', 512, 512),
            'bbox' => json_encode(self::BBOX),
            'width' => 512,
            'height' => 512,
            'zoom' => self::ZOOM,
        ], $overrides);
    }

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }

    /**
     * @param  array<int, array<string, mixed>>  $detections
     * @return array<string, mixed>
     */
    private static function mlResponse(array $detections = []): array
    {
        return [
            'success' => true,
            'request_id' => 'req_uji_1',
            'data' => [
                'image' => ['width' => 512, 'height' => 512],
                'total_detections' => count($detections),
                'detections' => $detections,
            ],
            'error' => null,
            'meta' => [
                'model' => 'yolov8n-seg',
                'model_version' => 'roof-v1.0.0',
                'inference_time_ms' => 4123,
            ],
        ];
    }

    /**
     * @param  array<int, array{0: float|int, 1: float|int}>  $polygon
     * @return array<string, mixed>
     */
    private static function detection(string $id, array $polygon, float $confidence = 0.9): array
    {
        return [
            'id' => $id,
            'class_id' => 0,
            'class_name' => 'roof',
            'confidence' => $confidence,
            'bbox' => ['x1' => 10.0, 'y1' => 20.0, 'x2' => 110.0, 'y2' => 220.0],
            'polygon' => $polygon,
            'area_px' => 20000.0,
        ];
    }

    /**
     * @return array<int, array{0: float, 1: float}>
     */
    private static function square(float $x, float $y, float $size): array
    {
        return [
            [$x, $y],
            [$x + $size, $y],
            [$x + $size, $y + $size],
            [$x, $y + $size],
        ];
    }

    /**
     * Persegi yang tiap sisinya diisi titik interpolasi, meniru mask model yang padat.
     *
     * @return array<int, array{0: float, 1: float}>
     */
    private static function denseSquare(float $x, float $y, float $size, int $perSide): array
    {
        $corners = [[$x, $y], [$x + $size, $y], [$x + $size, $y + $size], [$x, $y + $size]];
        $ring = [];

        foreach ($corners as $index => $corner) {
            $next = $corners[($index + 1) % 4];

            for ($step = 0; $step < $perSide; $step++) {
                $ratio = $step / $perSide;

                $ring[] = [
                    $corner[0] + ($next[0] - $corner[0]) * $ratio,
                    $corner[1] + ($next[1] - $corner[1]) * $ratio,
                ];
            }
        }

        return $ring;
    }
}
