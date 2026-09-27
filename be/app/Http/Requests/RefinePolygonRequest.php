<?php

namespace App\Http\Requests;

class RefinePolygonRequest extends PolygonRequest
{
    protected function polygonField(): string
    {
        return 'rough_polygon';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return $this->polygonRules($this->polygonField());
    }
}
