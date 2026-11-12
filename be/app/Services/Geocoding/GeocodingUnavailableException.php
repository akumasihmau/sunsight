<?php

namespace App\Services\Geocoding;

use RuntimeException;

/**
 * Layanan pencarian alamat tidak dapat dihubungi atau menolak permintaan.
 *
 * Dipisahkan dari kegagalan validasi supaya pengendali dapat menjawab 503 alih-alih
 * 422: masukan pengguna benar, yang bermasalah adalah layanan di luar kendali kita.
 */
final class GeocodingUnavailableException extends RuntimeException {}
