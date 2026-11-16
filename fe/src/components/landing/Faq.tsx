"use client";

import { useState } from "react";

export default function Faq() {
  const [openId, setOpenId] = useState<number | null>(1);

  const faqs = [
    {
      id: 1,
      question: "Apakah atap rumah saya di Bogor cocok untuk panel surya?",
      answer: "Sebagian besar atap hunian (genteng keramik, beton, spandek, dan dak beton) cocok. SunSight menganalisis kemiringan dan arah azimuth agar tangkapan energi optimal sepanjang tahun.",
    },
    {
      id: 2,
      question: "Bagaimana cara menghitung penghematan listriknya?",
      answer: "Sistem memadukan data iradiasi NASA POWER & Solargis wilayah Bogor, luas efektif atap, spesifikasi modul 550 Wp Tier-1, dan tarif resmi PLN sesuai Permen ESDM No. 2 & 7/2024.",
    },
    {
      id: 3,
      question: "Berapa lama masa pakai dan garansi panel surya?",
      answer: "Modul Tier-1 berstandar IEC 61215 memiliki garansi kinerja daya hingga 25 tahun (≥ 84,8% di tahun ke-25) dengan perawatan ringan.",
    },
    {
      id: 4,
      question: "Apakah simulasi di SunSight gratis?",
      answer: "Ya, 100% gratis. Anda dapat mendesain tata letak di Studio CAD, membandingkan skenario finansial, dan mencetak proposal PDF tanpa biaya.",
    },
    {
      id: 5,
      question: "Apakah hasil proposal bisa dipakai untuk instalasi fisik?",
      answer: "Bisa. Proposal PDF memuat spesifikasi teknis, perkiraan RAB CAPEX, dan standar keselamatan PUIL 2020 sebagai acuan diskusi dengan kontraktor EPC.",
    },
  ];

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-18 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="text-center space-y-3 mb-12">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 text-amber-900 text-xs font-semibold shadow-2xs">
          Tanya Jawab
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Pertanyaan{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            umum.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          Jawaban singkat seputar simulasi, biaya, dan pemasangan panel surya.
        </p>
      </div>

      {/* Single Grouped Apple Frosted Glass Accordion */}
      <div className="rounded-[28px] bg-white/80 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.04)] divide-y divide-slate-900/[0.06] overflow-hidden">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id}>
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                className="w-full p-5 sm:px-6 text-left flex items-center justify-between gap-4 hover:bg-slate-900/[0.02] transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-900 text-sm sm:text-base font-title">
                  {faq.question}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen
                      ? "bg-amber-100 text-amber-950 rotate-180"
                      : "bg-slate-900/[0.05] text-slate-500"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </span>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed animate-fadeIn">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
