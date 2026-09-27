<?php

namespace App\Services\Cv;

use RuntimeException;
use Throwable;

/**
 * Kegagalan pemrosesan citra yang pesannya aman ditampilkan ke klien.
 *
 * Dipakai agar skrip Python yang mati, melewati batas waktu, atau mengembalikan
 * keluaran yang tidak sesuai kontrak berakhir sebagai kesalahan yang dapat dibaca,
 * bukan sebagai 500 tanpa keterangan.
 */
class CvFailureException extends RuntimeException
{
    public static function timeout(string $script, int $seconds): self
    {
        return new self("Pemrosesan citra melewati batas waktu {$seconds} detik ({$script}).");
    }

    public static function interpreterUnavailable(string $python, ?Throwable $previous = null, string $detail = ''): self
    {
        $message = "Interpreter Python tidak dapat dijalankan ({$python}). Set CV_PYTHON, "
            .'atau bangun environment lewat langkah di README.md.';

        if (trim($detail) !== '') {
            $message .= ' Pesan dari sistem: '.trim($detail);
        }

        return new self($message, 0, $previous);
    }

    public static function scriptFailed(string $script, int $exitCode, string $stderr): self
    {
        $detail = trim($stderr);

        return new self(sprintf(
            'Skrip %s gagal dengan kode keluar %d: %s',
            $script,
            $exitCode,
            $detail === '' ? '(tanpa pesan)' : $detail,
        ));
    }

    public static function invalidOutput(string $script, string $reason): self
    {
        return new self("Keluaran skrip {$script} tidak sesuai kontrak: {$reason}");
    }
}
