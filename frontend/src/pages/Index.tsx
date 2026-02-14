import AmbientBackground from "@/components/landing/AmbientBackground";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Capabilities from "@/components/landing/Capabilities";
import Journey from "@/components/landing/Journey";
import WhySection from "@/components/landing/WhySection";
import IntegrationsMarquee from "@/components/landing/IntegrationsMarquee";
import Testimonial from "@/components/landing/Testimonial";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <Hero />
      <TrustBar />
      <Capabilities />
      <Journey />
      <WhySection />
      <IntegrationsMarquee />
      <Testimonial />
      <CTASection />
      <Footer />
    </>
  );
};

export default Index;
