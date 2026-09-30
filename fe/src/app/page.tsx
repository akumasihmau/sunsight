import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import QuickCalculator from "@/components/landing/QuickCalculator";
import HowItWorks from "@/components/landing/HowItWorks";
import SmartFeatures from "@/components/landing/SmartFeatures";
import Comparison from "@/components/landing/Comparison";
import Testimonials from "@/components/landing/Testimonials";
import Faq from "@/components/landing/Faq";
import Cta from "@/components/landing/Cta";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-slate-50 font-body-md text-on-surface antialiased selection:bg-amber-100 selection:text-amber-900 min-h-screen">
      <Navbar />

      <main className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#fbfbfe]">
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
