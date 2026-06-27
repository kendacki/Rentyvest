'use client';

import { ChainSection } from './ChainSection';
import { FeatureGrid } from './FeatureGrid';
import { GetStarted } from './GetStarted';
import { HeroSection } from './HeroSection';
import { HomeFooter } from './HomeFooter';
import { HomeHeader } from './HomeHeader';
import { ScrollShowcase } from './ScrollShowcase';

export function HomePage() {
  return (
    <div className="bg-black text-white">
      <HomeHeader />
      <main>
        <HeroSection />
        <ScrollShowcase />
        <FeatureGrid />
        <ChainSection />
        <GetStarted />
      </main>
      <HomeFooter />
    </div>
  );
}
