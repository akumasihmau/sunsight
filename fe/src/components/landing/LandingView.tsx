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
    <div className="bg-slate-50 font-body-md text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900 min-h-screen flex flex-col">
      <Navbar />

      <main className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#fbfbfe] flex-1">
        <Hero />
        <QuickCalculator />
        <HowItWorks />
        <SmartFeatures />
        <Comparison />
        <Testimonials />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}

