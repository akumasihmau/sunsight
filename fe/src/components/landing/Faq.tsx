'use client';

import { useState } from 'react';

export default function Faq() {
  // State untuk melacak FAQ mana yang sedang terbuka (null berarti tertutup semua)
  // Kita set default 1 agar pertanyaan pertama langsung terbuka
  const [openId, setOpenId] = useState<number | null>(1);

  const faqs = [
    {
      id: 1,
      question: "Apakah atap rumah saya cocok untuk dipasang panel surya?",
      answer: "Sebagian besar tipe atap di Indonesia (genteng keramik, genteng beton, spandek/metal roof, dan dak beton) sangat cocok. SunSight menganalisis kemiringan optimal (10°–25°) dan orientasi hadap khatulistiwa agar produksi listrik maksimal."
    },
    {
      id: 2,
      question: "Bagaimana aturan regulasi Permen ESDM No. 2 Tahun 2024 terbaru?",
      answer: "Regulasi Permen ESDM 2/2024 menghapus batasan kapasitas maksimal 100% daya tersambung dan menggantinya dengan sistem kuota per wilayah transmisi PLN. SunSight secara otomatis menghitung sizing ratio optimal yang memenuhi izin kuota PLN tanpa over-capacity."
    },
    {
      id: 3,
      question: "Berapa lama masa pakai panel surya dan inverter?",
      answer: "Panel surya Tier-1 memiliki garansi performa degradasi hingga 25 tahun (output tetap >80%). Inverter memiliki masa pakai rata-rata 10–15 tahun, dan model finansial SunSight telah memperhitungkan biaya penggantian inverter pada tahun ke-12."
    },
    {
      id: 4,
      question: "Berapa lama proses pemasangan hingga PLTS menyala?",
      answer: "Proses pemasangan fisik panel surya residensial umumnya hanya memakan waktu 2–4 hari kerja. Pengurusan perizinan dan pemasangan meteran net-metering kWh Exim PLN rata-rata memakan waktu 2–4 minggu dibantu penuh oleh mitra EPC resmi kami."
    },
    {
      id: 5,
      question: "Apakah simulasi di platform SunSight ini benar-benar gratis?",
      answer: "Ya, 100% gratis tanpa perlu registrasi kartu kredit. Anda dapat mencoba simulasi atap, menyesuaikan jumlah panel, melihat analisis finansial, dan mengunduh proposal PDF secara cuma-cuma."
    }
  ];

  const toggleFaq = (id: number) => {
    // Jika yang diklik sudah terbuka, maka tutup (set null). Jika belum, buka yang diklik.
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-16 sm:py-20 bg-slate-100/60 border-t border-slate-200/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
            Pertanyaan Umum
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
            Hal yang Sering Ditanyakan
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Jawaban transparan untuk semua keraguan Anda sebelum memasang PLTS atap.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            
            return (
              <div 
                key={faq.id} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <button 
                  type="button" 
                  onClick={() => toggleFaq(faq.id)} 
                  className="w-full p-4 sm:p-5 text-left font-title font-bold text-slate-900 text-sm sm:text-base flex items-center justify-between gap-3 hover:text-amber-600 transition cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <span 
                    className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    expand_more
                  </span>
                </button>
                
                {/* Bagian Jawaban */}
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
