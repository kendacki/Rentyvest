import { CtaSection, FaqSection } from '../components/landing/FaqSection';
import {
  FeaturesSection,
  HowItWorksSection,
} from '../components/landing/FeaturesSection';
import {
  HeroSection,
  StatsSection,
  TechMarquee,
} from '../components/landing/HeroSection';
import { SiteFooter } from '../components/layout/SiteFooter';
import { SiteHeader } from '../components/layout/SiteHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader variant="dark" />
      <HeroSection />
      <TechMarquee />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
