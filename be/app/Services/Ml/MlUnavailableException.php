<?php

namespace App\Services\Ml;

use RuntimeException;
use Throwable;

/**
 * Layanan model tidak dapat dihubungi, atau menjawab di luar kesepakatan.
 *
 * Dipetakan menjadi HTTP 503 oleh penangan exception, bukan 500: penyebabnya ada di
 * luar aplikasi ini, dan pemanggil berhak tahu bahwa ia boleh mencoba lagi.
 */
class MlUnavailableException extends RuntimeException
{
    public static function fromConnection(Throwable $previous): self
    {
        return new self(
            'Layanan deteksi bidang atap tidak dapat dihubungi.',
            previous: $previous,
        );
    }

    public static function becauseOfStatus(int $status): self
    {
        return new self("Layanan deteksi bidang atap menjawab dengan status {$status}.");
    }

    public static function becauseOfPayload(): self
    {
        return new self('Layanan deteksi bidang atap mengembalikan jawaban yang tidak dikenali.');
    }
}
