import { BrandMarquee } from '../components/landing/BrandMarquee';
import { CtaSection, FaqSection } from '../components/landing/FaqSection';
import {
  FeaturesSection,
  HowItWorksSection,
} from '../components/landing/FeaturesSection';
import { HeroSection, StatsSection } from '../components/landing/HeroSection';
import { SiteFooter } from '../components/layout/SiteFooter';
import { SiteHeader } from '../components/layout/SiteHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <SiteHeader variant="dark" />
      <HeroSection />
      <BrandMarquee />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
