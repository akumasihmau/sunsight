<?php

namespace App\Services\Imagery;

use RuntimeException;

/**
 * Penyedia citra tidak dapat dipakai.
 *
 * Dibedakan dari kegagalan lain supaya pesannya dapat ditampilkan apa adanya ke
 * klien: masalahnya ada di konfigurasi, dan pengguna berhak tahu apa yang harus diisi.
 */
class ImageryUnavailableException extends RuntimeException {}
