import HeroV5 from "@/components/landing/HeroV5";
import ProcessSection from "@/components/landing/ProcessSection";
import AgentCallSection from "@/components/landing/AgentCallSection";
import DashboardSection from "@/components/landing/DashboardSection";
import FeaturesAndPricing from "@/components/landing/FeaturesAndPricing";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CoverageFooterCTA from "@/components/landing/CoverageFooterCTA";
import "./hero-globals.css";

export default function Home() {
  return (
    <div className="hero-homepage-root">
      <main>
        <div id="hero-v5">
          <HeroV5 />
        </div>
        <ProcessSection />
        <AgentCallSection />
        <DashboardSection />
        <FeaturesAndPricing />
        <TestimonialsSection />
        <CoverageFooterCTA />
      </main>
    </div>
  );
}
