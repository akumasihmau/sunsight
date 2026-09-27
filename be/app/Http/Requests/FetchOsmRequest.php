<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FetchOsmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        $min = config('imagery.zoom.min');
        $max = config('imagery.zoom.max');

        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'zoom' => ['sometimes', 'integer', "between:{$min},{$max}"],
        ];
    }

    public function zoom(): int
    {
        return (int) ($this->validated('zoom') ?? config('imagery.zoom.default'));
    }
}
