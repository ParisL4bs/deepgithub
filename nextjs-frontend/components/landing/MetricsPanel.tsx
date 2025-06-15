"use client"

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const counterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: 0.1 * i,
            duration: 0.8,
        }
    })
};

export function MetricsPanel() {
    const [metrics, setMetrics] = useState({
        repositories: 0,
        users: 0,
        searches: 0,
        languages: 0
    });

    const targetMetrics = {
        repositories: 10842,
        users: 5762,
        searches: 142879,
        languages: 37
    };


    useEffect(() => {
        const handleScroll = () => {
            const section = document.querySelector('.metrics-section');
            if (section) {
                const sectionTop = section.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;

                if (sectionTop < windowHeight * 0.75) {
                    const duration = 2000;
                    const startTime = Date.now();

                    const interval = setInterval(() => {
                        const now = Date.now();
                        const elapsedTime = now - startTime;
                        const progress = Math.min(elapsedTime / duration, 1);

                        setMetrics({
                            repositories: Math.round(targetMetrics.repositories * progress),
                            users: Math.round(targetMetrics.users * progress),
                            searches: Math.round(targetMetrics.searches * progress),
                            languages: Math.round(targetMetrics.languages * progress)
                        });

                        if (progress === 1) clearInterval(interval);
                    }, 16);

                    window.removeEventListener('scroll', handleScroll);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const metricsItems = [
        { title: "Repositories Indexed", value: metrics.repositories.toLocaleString(), icon: "📚" },
        { title: "Active Users", value: metrics.users.toLocaleString(), icon: "👥" },
        { title: "Documentation Searches", value: metrics.searches.toLocaleString(), icon: "🔍" },
        { title: "Programming Languages", value: metrics.languages.toLocaleString(), icon: "💻" }
    ];

    return (
        <div className="metrics-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricsItems.map((item, index) => (
                <motion.div
                    key={index}
                    variants={counterVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={index}
                >
                    <Card className="h-full">
                        <CardContent className="flex flex-col items-center justify-center p-6 h-full">
                            <span className="text-4xl mb-2">{item.icon}</span>
                            <h3 className="text-3xl font-bold mb-1">{item.value}</h3>
                            <p className="text-muted-foreground text-center">{item.title}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
