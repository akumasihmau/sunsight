<?php

namespace App\Http\Requests;

use App\Support\Polygon;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Dasar untuk request yang membawa poligon.
 *
 * Dipakai baik oleh poligon koordinat piksel (pipeline CV) maupun poligon
 * geografis (kalkulasi dan penyimpanan riwayat). Pemeriksaan jumlah titik unik
 * tidak dapat dilakukan oleh aturan bawaan, sehingga dijalankan sebagai
 * pemeriksaan tambahan setelah validasi bentuk.
 */
abstract class PolygonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Nama field poligon pada payload.
     */
    abstract protected function polygonField(): string;

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $field = $this->polygonField();
                $points = $this->input($field);

                if (is_array($points) && Polygon::uniquePointCount($points) < 3) {
                    $validator->errors()->add($field, 'Poligon perlu minimal 3 titik unik.');
                }
            },
        ];
    }

    /**
     * Poligon sebagai pasangan [x, y] bertipe float.
     *
     * @return array<int, array{0: float, 1: float}>
     */
    public function polygon(): array
    {
        $points = (array) $this->validated($this->polygonField());

        return array_values(array_map(
            static fn (array $point): array => [(float) $point[0], (float) $point[1]],
            $points,
        ));
    }

    /**
     * @return array<string, array<int, string>>
     */
    protected function polygonRules(string $field): array
    {
        return [
            'image_id' => ['required', 'string', 'uuid'],
            $field => ['required', 'array', 'min:3'],
            $field.'.*' => ['array', 'size:2'],
            $field.'.*.*' => ['numeric'],
        ];
    }
}
