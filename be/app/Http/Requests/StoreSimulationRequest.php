<?php

namespace App\Http\Requests;

/**
 * Payload simpan identik dengan payload simulasi.
 *
 * Sengaja tidak menambahkan aturan apa pun untuk kunci hasil: kunci semacam itu
 * diabaikan, dan server menghitung ulang seluruh angkanya.
 */
class StoreSimulationRequest extends SimulateRequest {}
