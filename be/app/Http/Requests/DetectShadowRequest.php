<?php

namespace App\Http\Requests;

class DetectShadowRequest extends PolygonRequest
{
    protected function polygonField(): string
    {
        return 'refined_polygon';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return $this->polygonRules($this->polygonField());
    }
}
