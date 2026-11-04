import type { Metadata } from "next";

import { LandingView } from "@/components/landing/LandingView";

export const metadata: Metadata = {
  title: "SunSight — Platform Pintar Simulasi PLTS Atap",
  description: "Rancang PLTS atap rumah Anda dengan tenang, presisi, dan instan dari citra satelit nadir.",
};

export default function LandingPageRoute() {
  return <LandingView />;
}
