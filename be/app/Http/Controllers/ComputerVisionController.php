<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ComputerVisionController extends Controller
{
    public function fetchOsm(Request $request)
    {
        // TODO: Validasi koordinat center/BBox, tembak API OSM, unduh & simpan gambar sementara, return URL
    }

    public function refinePolygon(Request $request)
    {
        // TODO: Terima poligon kasar, jalankan script Python (GrabCut/Edge Detection), return poligon presisi
    }

    public function detectShadow(Request $request)
    {
        // TODO: Terima poligon presisi, jalankan script Python untuk deteksi area gelap, return luas area bersih
    }
}