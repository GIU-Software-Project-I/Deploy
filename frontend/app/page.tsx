'use client'
import {HeroSection} from "@/components/landing/hero-section";
import {StatsSection} from "@/components/landing/stats-section";
import {FeaturesSection} from "@/components/landing/features-section";
import {JobsSection} from "@/components/landing/jobs-section";
import {CTASection} from "@/components/landing/cta-section";
import {LandingFooter} from "@/components/landing/footer";
import {LandingNavbar} from "@/components/landing/navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <JobsSection />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  )
}
