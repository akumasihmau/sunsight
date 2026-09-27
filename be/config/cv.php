<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Interpreter Python
    |--------------------------------------------------------------------------
    |
    | Jalur interpreter dipatok, bukan diambil dari PATH, supaya pemrosesan citra
    | tidak bergantung pada `python3` milik sistem yang belum tentu punya OpenCV.
    |
    */

    'python' => env('CV_PYTHON', base_path('.venv/bin/python')),

    /*
    |--------------------------------------------------------------------------
    | Batas waktu
    |--------------------------------------------------------------------------
    */

    'timeout' => (int) env('CV_TIMEOUT', 120),

    /*
    |--------------------------------------------------------------------------
    | Skrip
    |--------------------------------------------------------------------------
    */

    'scripts' => [
        'refine_polygon' => base_path('scripts/cv/refine_polygon.py'),
        'detect_shadow' => base_path('scripts/cv/detect_shadow.py'),
    ],

];
