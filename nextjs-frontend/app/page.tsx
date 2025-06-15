"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled
          ? "bg-background/80 backdrop-blur-lg border-b border-muted"
          : "bg-transparent"
          }`}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <Github className="h-6 w-6" />
            <h1 className="font-medium">ParisLabs</h1>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => router.push("/explorer")}>
              Explorer
            </Button>
            <Button size="sm" onClick={() => router.push("/doc")}>
              Try Now
            </Button>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />

        <section className="relative min-h-screen flex flex-col justify-center items-center pt-16 overflow-hidden">
          <div className="container flex flex-col justify-center items-center flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-md mx-auto text-center mb-12"
            >
              <h2 className="text-3xl font-medium mb-4">How It Works</h2>
              <p className="text-muted-foreground">
                Our approach to making repository documentation more accessible and insightful.
              </p>
            </motion.div>
            <HowItWorks />
          </div>
        </section>


        <section className="py-20 bg-muted/30 flex flex-col justify-center items-center">
          <div className="container flex flex-col justify-center items-center flex-1 px-4 md:px-6">
            <motion.div
              className="max-w-2xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-medium mb-4">Ready to explore?</h2>
              <p className="text-muted-foreground mb-8">
                Enter any public repository and see its structure visualized with intelligent insights.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => router.push("/explorer")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Exploring
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-muted py-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center w-full">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Github className="h-5 w-5" />
            <span className="font-medium">ParisLabs</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ParisLabs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
