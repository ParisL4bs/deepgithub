"use client"
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export function HowItWorks() {
    const steps = [
        {
            title: "Connect",
            description: "Enter any public GitHub repository to begin exploring its documentation",
            icon: "→",
        },
        {
            title: "Index",
            description: "Our system analyzes the repository structure, code, and documentation resources",
            icon: "⚡",
        },
        {
            title: "Visualize",
            description: "See connections between components and understand relationships at a glance",
            icon: "◎",
        },
        {
            title: "Discover",
            description: "Ask questions and navigate through the repository with AI-powered assistance",
            icon: "?",
        }
    ];


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
    };

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
        >
            {steps.map((step, index) => (
                <motion.div key={index} variants={itemVariants}>
                    <Card className="h-full border-none bg-background shadow-none">
                        <CardContent className="pt-6 pb-8 px-0">
                            <div className="mb-6 flex justify-start">
                                <div className="text-4xl font-light text-primary">
                                    {step.icon}
                                </div>
                            </div>
                            <div className="mb-2">
                                <span className="inline-block py-1 px-3 text-xs rounded-full bg-muted text-primary/80 mb-3">
                                    0{index + 1}
                                </span>
                                <h3 className="font-medium text-xl">{step.title}</h3>
                            </div>
                            <p className="text-muted-foreground">
                                {step.description}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </motion.div>
    );
}
