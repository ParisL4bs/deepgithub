"use client"


import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function RepositoryShowcase() {
    const featuredRepos = [
        {
            id: 1,
            name: "React",
            description: "A JavaScript library for building user interfaces",
            stars: 215000,
            language: "JavaScript",
            color: "rgb(97, 218, 251)",
            tags: ["frontend", "ui"],
        },
        {
            id: 2,
            name: "TensorFlow",
            description: "An open source machine learning framework for everyone",
            stars: 178000,
            language: "Python",
            color: "rgb(255, 111, 0)",
            tags: ["machine-learning", "ai"],
        },
        {
            id: 3,
            name: "Kubernetes",
            description: "Production-Grade Container Orchestration",
            stars: 103000,
            language: "Go",
            color: "rgb(50, 108, 229)",
            tags: ["devops", "container"],
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredRepos.map((repo, index) => (
                <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                >
                    <Card className="h-full border border-muted hover:border-primary/20 transition-colors duration-300">
                        <CardContent className="p-6 flex flex-col h-full">
                            <div className="mb-4 flex items-center">
                                <div
                                    className="w-3 h-3 rounded-full mr-3"
                                    style={{ backgroundColor: repo.color }}
                                />
                                <h3 className="font-medium">{repo.name}</h3>
                            </div>

                            <p className="text-muted-foreground mb-4 text-sm flex-grow">
                                {repo.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline">{repo.language}</Badge>
                                {repo.tags.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="bg-muted/50">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                    ⭐ {repo.stars.toLocaleString()}
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs">
                                    View Docs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
