<?php

namespace App\Http\Requests;

class CalculateSolarRequest extends PolygonRequest
{
    protected function polygonField(): string
    {
        return 'polygon';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'usable_area_sqm' => ['required', 'numeric', 'gt:0'],
            'center_point' => ['required', 'array'],
            'center_point.lat' => ['required', 'numeric', 'between:-90,90'],
            'center_point.lng' => ['required', 'numeric', 'between:-180,180'],
            'polygon' => ['required', 'array', 'min:3'],
            'polygon.*' => ['array', 'size:2'],
            'polygon.*.*' => ['numeric'],
        ];
    }

    public function latitude(): float
    {
        return (float) $this->validated('center_point')['lat'];
    }

    public function longitude(): float
    {
        return (float) $this->validated('center_point')['lng'];
    }

    public function usableAreaSqm(): float
    {
        return (float) $this->validated('usable_area_sqm');
    }
}
