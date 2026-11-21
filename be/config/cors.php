<?php

$defaultOrigins = array_values(array_unique(array_filter([
    rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])));

$configured = env('CORS_ALLOWED_ORIGINS');

$allowedOrigins = is_string($configured) && trim($configured) !== ''
    ? array_values(array_filter(array_map(
        static fn (string $origin): string => rtrim(trim($origin), '/'),
        explode(',', $configured),
    )))
    : $defaultOrigins;

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,
];
