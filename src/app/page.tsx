import HeroV5 from "@/components/landing/HeroV5";
import ProcessSection from "@/components/landing/ProcessSection";
import AgentCallSection from "@/components/landing/AgentCallSection";
import DashboardSection from "@/components/landing/DashboardSection";
import FeaturesAndPricing from "@/components/landing/FeaturesAndPricing";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CoverageFooterCTA from "@/components/landing/CoverageFooterCTA";
import { cmsSections } from "@/server/repositories/cms-sections";
import "./hero-globals.css";

export const revalidate = 60;

interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export default async function Home() {
  // CMS-driven FAQ (Admin → CMS → faq section). Missing/inactive section or
  // empty items hide the block — the homepage never renders dead headings.
  let faqs: FaqEntry[] = [];
  try {
    const section = await cmsSections.findBySlug("faq");
    const content = section?.content as { items?: FaqItem[] } | null;
    if (section?.active && Array.isArray(content?.items)) {
      faqs = content.items
        .filter((it) => it.question?.trim() && it.answer?.trim())
        .map((it) => ({
          question: it.question.trim(),
          answer: it.answer.trim(),
          category: it.category?.trim() || "General",
        }));
    }
  } catch {
    faqs = [];
  }

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
        <FAQSection items={faqs} />
        <CoverageFooterCTA />
      </main>
    </div>
  );
}

interface FaqEntry {
  question: string;
  answer: string;
  category: string;
}
