"use client"


import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

export function RepositorySearch() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const repositories = [
        {
            id: 1,
            name: "react",
            fullName: "facebook/react",
            description: "A JavaScript library for building user interfaces",
            language: "JavaScript",
            stars: 215000,
        },
        {
            id: 2,
            name: "tensorflow",
            fullName: "tensorflow/tensorflow",
            description: "An open source machine learning framework",
            language: "Python",
            stars: 178000,
        },
        {
            id: 3,
            name: "django",
            fullName: "django/django",
            description: "The Web framework for perfectionists with deadlines",
            language: "Python",
            stars: 73000,
        },
        {
            id: 4,
            name: "flutter",
            fullName: "flutter/flutter",
            description: "Google's UI toolkit for apps",
            language: "Dart",
            stars: 156000,
        },
        {
            id: 5,
            name: "vue",
            fullName: "vuejs/vue",
            description: "Progressive JavaScript framework",
            language: "JavaScript",
            stars: 210000,
        },
        {
            id: 6,
            name: "laravel",
            fullName: "laravel/laravel",
            description: "PHP framework for web artisans",
            language: "PHP",
            stars: 75000,
        },
    ];

    const filteredRepositories = repositories.filter(repo => {
        const matchesQuery = searchQuery === "" ||
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = activeFilter === "all" || repo.language.toLowerCase() === activeFilter.toLowerCase();

        return matchesQuery && matchesFilter;
    });

    const languages = ["all", ...Array.from(new Set(repositories.map(repo => repo.language)))];

    return (
        <div>
            <div className="max-w-3xl mx-auto mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search repositories by name, owner, or description..."
                        className="pl-10 h-12 text-lg"
                    />
                </div>

                {/* Language filters */}
                <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-2">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex gap-2">
                        {languages.map((lang) => (
                            <Badge
                                key={lang}
                                variant={activeFilter === lang ? "default" : "outline"}
                                className={`cursor-pointer ${activeFilter === lang ? "" : "hover:bg-accent"}`}
                                onClick={() => setActiveFilter(lang)}
                            >
                                {lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRepositories.length > 0 ? (
                    filteredRepositories.map((repo, index) => (
                        <motion.div
                            key={repo.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="h-full flex flex-col">
                                <CardContent className="flex-grow p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold truncate">{repo.fullName}</h3>
                                        <Badge variant="outline" className="shrink-0 ml-2">
                                            {repo.language}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {repo.description}
                                    </p>
                                    <div className="text-sm text-muted-foreground">
                                        ⭐ {repo.stars.toLocaleString()}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 pb-6 px-6">
                                    <Button variant="outline" size="sm" className="w-full">
                                        View Documentation
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No repositories found matching your search criteria.
                    </div>
                )}
            </div>

            {filteredRepositories.length > 0 && (
                <div className="mt-8 text-center">
                    <Button variant="outline">Load More Results</Button>
                </div>
            )}
        </div>
    );
}
