"use client"

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function HeroSection() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsAnimated(true), 300);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const setCanvasSize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        class Node {
            x: number;
            y: number;
            radius: number;
            color: string;
            vx: number;
            vy: number;
            name: string;
            opacity: number;
            targetOpacity: number;
            connections: Node[];

            constructor(x: number, y: number, radius: number, color: string, name: string) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.color = color;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.name = name;
                this.opacity = 0;
                this.targetOpacity = 1;
                this.connections = [];
            }

            draw(ctx: CanvasRenderingContext2D) {
                this.opacity += (this.targetOpacity - this.opacity) * 0.05;

                this.connections.forEach(node => {
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(node.x, node.y);
                    ctx.strokeStyle = `rgba(150, 150, 150, ${this.opacity * 0.2})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                });

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
                ctx.fill();


                if (this.radius > 10 && this.opacity > 0.7) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(this.name, this.x, this.y + this.radius + 12);
                }
            }

            update(width: number, height: number) {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < this.radius || this.x > width - this.radius) {
                    this.vx *= -1;
                }
                if (this.y < this.radius || this.y > height - this.radius) {
                    this.vy *= -1;
                }
            }
        }
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        const nodes: Node[] = [];

        const colors = [
            "75, 192, 192", // teal
            "255, 99, 132", // pink
            "54, 162, 235", // blue
            "255, 206, 86", // yellow
            "153, 102, 255", // purple
            "255, 159, 64", // orange
            "231, 233, 237" // Grey
        ];

        const repoNames = [
            "react", "typescript", "node.js", "vue", "angular",
            "tensorflow", "pytorch", "scikit-learn", "next.js", "svelte",
            "django", "flask", "fastapi", "spring", "laravel"
        ];

        const addNodesWithDelay = () => {
            let index = 0;
            const totalNodes = 15;

            const addNode = () => {
                if (index >= totalNodes) return;

                const x = Math.random() * (width - 40) + 20;
                const y = Math.random() * (height - 40) + 20;
                const radius = Math.random() * 8 + 5;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const name = repoNames[index % repoNames.length];

                const node = new Node(x, y, radius, color, name);

                if (nodes.length > 0) {
                    const connections = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < connections; i++) {
                        if (nodes.length > i) {
                            const connectToIndex = Math.floor(Math.random() * nodes.length);
                            node.connections.push(nodes[connectToIndex]);
                            nodes[connectToIndex].connections.push(node);
                        }
                    }
                }

                nodes.push(node);
                index++;

                const delay = Math.random() * 1000 + 500;
                if (index < totalNodes) {
                    setTimeout(addNode, delay);
                }
            };

            addNode();
        };

        if (isAnimated) {
            addNodesWithDelay();
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            nodes.forEach(node => {
                node.update(width, height);
                node.draw(ctx);
            });

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
        };
    }, [isAnimated]);

    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                />
            </div>

            {/* Content */}
            <div className="container flex flex-col justify-center items-center flex-1 px-4 md:px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
                    <div className="flex flex-col justify-center space-y-8 lg:col-span-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2"
                        >
                            <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full inline-block">
                                Explore documentation reimagined
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                                Connect with <span className="text-primary">code that matters</span>
                            </h1>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg text-muted-foreground max-w-md"
                        >
                            Navigate repositories with intelligent documentation and insights. Explore connections between projects and concepts like never before.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="github.com/username/repo"
                                    className="pl-10 h-12"
                                />
                            </div>
                            <Button
                                size="lg"
                                onClick={() => router.push("/explorer")}
                                className="h-12"
                            >
                                Explore Repository
                            </Button>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="lg:col-span-6 flex items-center justify-center"
                    >
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/20 to-primary opacity-75 blur-lg"></div>
                            <div className="relative bg-card rounded-lg p-8 flex items-center justify-center">
                                <div className="text-sm max-w-xs">
                                    <p className="font-medium mb-2">Popular repositories are continuously being indexed</p>
                                    <p className="text-muted-foreground">
                                        Watch the network grow as new repositories are added to our ecosystem. Each node represents a project that's ready to explore.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
