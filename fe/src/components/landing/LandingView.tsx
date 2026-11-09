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
    <div className="bg-[#FAF9F5] font-body-md text-slate-800 antialiased selection:bg-amber-100 selection:text-amber-950 min-h-screen flex flex-col">
      <Navbar />

      <main className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#FAF9F5] flex-1">
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

