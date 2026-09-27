<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SolarAnalysisController extends Controller
{
    public function calculate(Request $request)
    {
        // TODO: Hitung azimuth dari poligon, fetch data radiasi NASA API, kalkulasi rumus daya, return estimasi kWh
    }

    public function index(Request $request)
    {
        // TODO: Ambil daftar riwayat analisis dari database (tabel roof_analyses) milik user aktif + paginasi
    }

    public function store(Request $request)
    {
        // TODO: Validasi data kalkulasi akhir, simpan ke database menggunakan tipe data geometri/postgis
    }

    public function show($id)
    {
        // TODO: Ambil dan kembalikan detail satu riwayat analisis spesifik berdasarkan ID
    }

    public function destroy($id)
    {
        // TODO: Cek kepemilikan data, lalu hapus record analisis dari database berdasarkan ID
    }
}