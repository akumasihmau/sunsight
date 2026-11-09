"use client";

import { useState } from "react";

export default function Faq() {
  const [openId, setOpenId] = useState<number | null>(1);

  const faqs = [
    {
      id: 1,
      question: "Apakah atap rumah saya di Bogor cocok untuk panel surya?",
      answer: "Sebagian besar atap hunian di Kota Bogor (genteng keramik, genteng beton, spandek/metal, dan dak beton) sangat cocok. SunSight otomatis menganalisis sudut kemiringan (tilt) dan orientasi hadap matahari agar tangkapan energi surya maksimal sepanjang tahun.",
    },
    {
      id: 2,
      question: "Bagaimana cara kerja perhitungan penghematan listriknya?",
      answer: "Sistem mengombinasikan data radiasi matahari harian spesifik wilayah Kota Bogor, ukuran luas bidang atap terdeteksi, spesifikasi modul 550W Tier-1, dan katalog tarif resmi PLN untuk memproyeksikan penghematan tagihan serta waktu balik modal (BEP).",
    },
    {
      id: 3,
      question: "Berapa lama masa pakai panel surya dan perawatannya?",
      answer: "Panel surya Tier-1 memiliki garansi performa daya hingga 25 tahun (efisiensi tetap di atas 80%). Perawatannya sangat minim, cukup pembersihan debu secara berkala atau memanfaatkan curah hujan alami Kota Bogor.",
    },
    {
      id: 4,
      question: "Apakah simulasi di SunSight ini benar-benar gratis?",
      answer: "Ya, 100% gratis tanpa perlu kartu kredit. Anda dapat mencoba simulasi atap, menata tata letak panel di Studio CAD, dan mengunduh ringkasan proposal PDF resmi secara cuma-cuma.",
    },
    {
      id: 5,
      question: "Bagaimana jika saya ingin melanjutkan ke pemasangan fisik?",
      answer: "Anda dapat mengunduh dokumen proposal PDF resmi dari Studio CAD untuk dijadikan acuan spesifikasi teknis dan RAB saat berkonsultasi dengan kontraktor atau penyedia PLTS pilihan Anda.",
    },
  ];

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#F4F3EE]/60 border-t border-amber-200/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header Apple-Style */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
            <span>Tanya Jawab</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
            Pertanyaan yang <br />
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              sering diajukan.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Semua hal mendasar yang perlu Anda ketahui sebelum merencanakan sistem PLTS atap.
          </p>
        </div>

        {/* Accordion List (Apple-Style Clean Cards) */}
        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-[24px] border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-white/95 border-amber-300/80 shadow-[0_12px_30px_rgba(245,158,11,0.08)]"
                    : "bg-white/70 hover:bg-white/90 border-slate-200/80"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base font-title">
                    {faq.question}
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "bg-amber-100 text-amber-950 rotate-180"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 animate-fadeIn">
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
