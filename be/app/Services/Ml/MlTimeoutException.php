<?php

namespace App\Services\Ml;

use RuntimeException;
use Throwable;

/**
 * Layanan model belum menjawab sampai batas waktunya habis.
 *
 * Dipisahkan dari layanan yang mati karena penanganannya berbeda bagi pemanggil:
 * layanan yang hidup tetapi lambat masih dapat dicoba lagi dengan citra yang lebih
 * kecil, sedangkan layanan yang mati tidak. Dipetakan menjadi HTTP 504.
 */
class MlTimeoutException extends RuntimeException
{
    public static function fromConnection(float $timeoutSeconds, Throwable $previous): self
    {
        return new self(
            "Layanan deteksi bidang atap melewati batas waktu {$timeoutSeconds} detik.",
            previous: $previous,
        );
    }
}
