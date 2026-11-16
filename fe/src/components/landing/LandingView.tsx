import Navbar from "./Navbar";
import Hero from "./Hero";
import QuickCalculator from "./QuickCalculator";
import HowItWorks from "./HowItWorks";
import SmartFeatures from "./SmartFeatures";
import Comparison from "./Comparison";
import Testimonials from "./Testimonials";
import Faq from "./Faq";
import Cta from "./Cta";
import Footer from "./Footer";

export function LandingView() {
  return (
    <div className="bg-[#F7F8FA] font-body-md text-slate-800 antialiased selection:bg-amber-100 selection:text-amber-950 min-h-screen flex flex-col relative overflow-x-clip">
      {/* Continuous Ambient Soft Radiant Glow Atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1100px] h-[680px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(254,240,138,0.34) 0%, rgba(253,230,138,0.14) 44%, transparent 74%)",
          }}
        />
        <div
          className="absolute top-[18%] -right-32 w-[620px] h-[620px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(186,230,253,0.28) 0%, rgba(224,242,254,0.10) 48%, transparent 74%)",
          }}
        />
        <div
          className="absolute top-[48%] -left-32 w-[580px] h-[580px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(254,243,199,0.28) 0%, rgba(253,230,138,0.08) 48%, transparent 74%)",
          }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[760px] h-[540px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(167,243,208,0.20) 0%, rgba(254,249,195,0.12) 48%, transparent 74%)",
          }}
        />
      </div>

      <Navbar />

      <main className="relative z-10 min-h-screen flex flex-col flex-1">
        <Hero />
        <SmartFeatures />
        <QuickCalculator />
        <HowItWorks />
        <Comparison />
        <Testimonials />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}
