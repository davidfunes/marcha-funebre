'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { useGameTimer } from '@/hooks/useGameTimer';

const GRID_SIZE = 20;
const CANVAS_SIZE = 400; // Mobile friendly
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

export default function SnakeGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState({ x: 15, y: 5 });
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(0);

    // Gamification: Earn points while playing
    useGameTimer(isPlaying && !gameOver);

    // Initial setup
    useEffect(() => {
        const savedHigh = localStorage.getItem('snake_highscore');
        if (savedHigh) setHighScore(parseInt(savedHigh));
    }, []);

    const spawnFood = useCallback(() => {
        let newFood: { x: number; y: number };
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            // Ensure food doesn't spawn on snake
            // eslint-disable-next-line no-loop-func
            const onSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
            if (!onSnake) break;
        }
        setFood(newFood);
    }, [snake]);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
        spawnFood();
    };

    const changesDirectionRef = useRef(false); // Prevent multiple turns per tick

    // Game Loop
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const moveSnake = () => {
            setSnake(prevSnake => {
                const head = prevSnake[0];
                const newHead = {
                    x: head.x + direction.x,
                    y: head.y + direction.y
                };

                // Check collisions
                // 1. Walls
                if (
                    newHead.x < 0 ||
                    newHead.x >= GRID_SIZE ||
                    newHead.y < 0 ||
                    newHead.y >= GRID_SIZE
                ) {
                    setGameOver(true);
                    return prevSnake;
                }

                // 2. Self
                if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

                // Check Food
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => {
                        const newScore = s + 1;
                        if (newScore > highScore) {
                            setHighScore(newScore);
                            localStorage.setItem('snake_highscore', newScore.toString());
                        }
                        return newScore;
                    });
                    spawnFood();
                } else {
                    newSnake.pop(); // Remove tail if no food eaten
                }

                changesDirectionRef.current = false;
                return newSnake;
            });
        };

        const interval = setInterval(moveSnake, BASE_SPEED);
        return () => clearInterval(interval);
    }, [isPlaying, gameOver, direction, food, highScore, spawnFood]);

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (changesDirectionRef.current) return;

            switch (e.key) {
                case 'ArrowUp':
                    if (direction.y === 0) { setDirection({ x: 0, y: -1 }); changesDirectionRef.current = true; }
                    break;
                case 'ArrowDown':
                    if (direction.y === 0) { setDirection({ x: 0, y: 1 }); changesDirectionRef.current = true; }
                    break;
                case 'ArrowLeft':
                    if (direction.x === 0) { setDirection({ x: -1, y: 0 }); changesDirectionRef.current = true; }
                    break;
                case 'ArrowRight':
                    if (direction.x === 0) { setDirection({ x: 1, y: 0 }); changesDirectionRef.current = true; }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [direction]);

    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#0b0c15';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw Snake
        snake.forEach((segment, index) => {
            // Gradient or color logic
            ctx.fillStyle = index === 0 ? '#10b981' : '#34d399'; // Green head vs body
            // Round rect manually or simple rect
            ctx.fillRect(
                segment.x * CELL_SIZE + 1,
                segment.y * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );
        });

        // Draw Food
        ctx.fillStyle = '#ef4444'; // Red
        ctx.beginPath();
        const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
        const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.arc(foodX, foodY, CELL_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();

    }, [snake, food]);

    // Mobile Controls
    const handleControl = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        if (changesDirectionRef.current) return;

        if (dir === 'UP' && direction.y === 0) { setDirection({ x: 0, y: -1 }); changesDirectionRef.current = true; }
        if (dir === 'DOWN' && direction.y === 0) { setDirection({ x: 0, y: 1 }); changesDirectionRef.current = true; }
        if (dir === 'LEFT' && direction.x === 0) { setDirection({ x: -1, y: 0 }); changesDirectionRef.current = true; }
        if (dir === 'RIGHT' && direction.x === 0) { setDirection({ x: 1, y: 0 }); changesDirectionRef.current = true; }
    };

    return (
        <div className="min-h-screen bg-[#0b0c15] text-white flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-[#151621] border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-10">
                <Link href="/driver/games" className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full">
                        <span className="text-gray-400 text-xs uppercase">Score</span>
                        <span className="font-mono font-bold">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-900/20 border border-yellow-500/20 rounded-full">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="font-mono font-bold text-yellow-500">{highScore}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">

                <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-[#0b0c15]">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className="block w-full max-w-[400px] h-auto aspect-square"
                    />

                    {/* Overlays */}
                    {(!isPlaying || gameOver) && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                            {gameOver && (
                                <h2 className="text-3xl font-bold text-red-500 mb-2">¡GAME OVER!</h2>
                            )}
                            {!isPlaying && !gameOver && (
                                <h2 className="text-3xl font-bold text-green-500 mb-2">SNAKE</h2>
                            )}

                            <p className="text-gray-300 mb-6">
                                {gameOver ? `Puntuación final: ${score}` : 'Usa las flechas o botones para moverte'}
                            </p>

                            <button
                                onClick={resetGame}
                                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-transform active:scale-95 shadow-lg shadow-primary/25"
                            >
                                <RefreshCw className="w-5 h-5" />
                                {gameOver ? 'Reintentar' : 'Jugar'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile D-Pad */}
                <div className="mt-8 grid grid-cols-3 gap-2 w-48">
                    <div className="col-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl('UP')}
                        >
                            <ArrowLeft className="w-8 h-8 rotate-90" />
                        </button>
                    </div>
                    <div className="col-start-1 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl('LEFT')}
                        >
                            <ArrowLeft className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="col-start-2 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl('DOWN')}
                        >
                            <ArrowLeft className="w-8 h-8 -rotate-90" />
                        </button>
                    </div>
                    <div className="col-start-3 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl('RIGHT')}
                        >
                            <ArrowLeft className="w-8 h-8 rotate-180" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
