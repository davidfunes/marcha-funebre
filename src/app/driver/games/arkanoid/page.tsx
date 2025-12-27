'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trophy, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameTimer } from '@/hooks/useGameTimer';
import { soundManager } from '@/utils/sound';

// --- Arkanoid Constants ---
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 480;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 14;
const BALL_RADIUS = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 6;
const BRICK_PADDING = 8;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 15;
const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLS - 1))) / BRICK_COLS;
const BRICK_HEIGHT = 20;

type Brick = {
    x: number;
    y: number;
    status: number; // 1 = visible, 0 = destroyed
    color: string;
};

export default function ArkanoidGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [isSoundEnabled, setIsSoundEnabled] = useState(false);
    const [win, setWin] = useState(false);

    // Paddle & Ball Refs for physics (avoiding state lag in animation loop)
    const paddleX = useRef((CANVAS_WIDTH - PADDLE_WIDTH) / 2);
    const ballX = useRef(CANVAS_WIDTH / 2);
    const ballY = useRef(CANVAS_HEIGHT - 30);
    const dx = useRef(2.5);
    const dy = useRef(-2.5);
    const bricks = useRef<Brick[]>([]);

    // State for UI rendering
    const [internalScore, setInternalScore] = useState(0);

    // Gamification Hook
    useGameTimer(isPlaying && !gameOver && !win);

    // Initial Setup
    useEffect(() => {
        const savedHigh = localStorage.getItem('arkanoid_highscore');
        if (savedHigh) setHighScore(parseInt(savedHigh));
        initBricks();
    }, []);

    const initBricks = () => {
        const newBricks: Brick[] = [];
        const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];
        for (let c = 0; c < BRICK_COLS; c++) {
            for (let r = 0; r < BRICK_ROWS; r++) {
                const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
                const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
                newBricks.push({ x: brickX, y: brickY, status: 1, color: colors[r] });
            }
        }
        bricks.current = newBricks;
    };

    const resetGame = () => {
        setGameOver(false);
        setWin(false);
        setInternalScore(0);
        setScore(0);
        paddleX.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
        ballX.current = CANVAS_WIDTH / 2;
        ballY.current = CANVAS_HEIGHT - 30;
        dx.current = 2.5 + Math.random() * 1.5;
        dy.current = -2.5 - Math.random() * 1.5;
        initBricks();
        setIsPlaying(true);
    };

    // Sound Management
    useEffect(() => {
        if (isPlaying && !gameOver && !win) {
            // Using its own theme
            soundManager.playMusic('arkanoid');
        } else {
            soundManager.stopMusic();
        }
        return () => soundManager.stopMusic();
    }, [isPlaying, gameOver, win]);

    useEffect(() => {
        soundManager.setMuted(!isSoundEnabled);
    }, [isSoundEnabled]);

    // Game Loop
    useEffect(() => {
        if (!isPlaying || gameOver || win) return;

        let animationFrameId: number;

        const drawBall = (ctx: CanvasRenderingContext2D) => {
            ctx.beginPath();
            ctx.arc(ballX.current, ballY.current, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.fill();
            ctx.closePath();
            ctx.shadowBlur = 0;
        };

        const drawPaddle = (ctx: CanvasRenderingContext2D) => {
            ctx.beginPath();
            ctx.roundRect(paddleX.current, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
            ctx.fillStyle = '#3b82f6';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#3b82f6';
            ctx.fill();
            ctx.closePath();
            ctx.shadowBlur = 0;
        };

        const drawBricks = (ctx: CanvasRenderingContext2D) => {
            bricks.current.forEach(b => {
                if (b.status === 1) {
                    ctx.beginPath();
                    ctx.roundRect(b.x, b.y, BRICK_WIDTH, BRICK_HEIGHT, 4);
                    ctx.fillStyle = b.color;
                    ctx.fill();
                    ctx.closePath();
                }
            });
        };

        const collisionDetection = () => {
            bricks.current.forEach(b => {
                if (b.status === 1) {
                    if (
                        ballX.current > b.x &&
                        ballX.current < b.x + BRICK_WIDTH &&
                        ballY.current > b.y &&
                        ballY.current < b.y + BRICK_HEIGHT
                    ) {
                        dy.current = -dy.current;
                        b.status = 0;
                        soundManager.playArkanoidBreak();
                        setInternalScore(s => {
                            const newScore = s + 10;
                            if (newScore > highScore) {
                                setHighScore(newScore);
                                localStorage.setItem('arkanoid_highscore', newScore.toString());
                            }
                            return newScore;
                        });

                        // Check Win
                        if (bricks.current.every(brick => brick.status === 0)) {
                            setWin(true);
                            soundManager.playWin();
                        }
                    }
                }
            });
        };

        const update = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Background (faint gradient)
            ctx.fillStyle = '#0b0c15';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            drawBricks(ctx);
            drawBall(ctx);
            drawPaddle(ctx);
            collisionDetection();

            // Wall Collision
            if (ballX.current + dx.current > CANVAS_WIDTH - BALL_RADIUS || ballX.current + dx.current < BALL_RADIUS) {
                dx.current = -dx.current;
                soundManager.playArkanoidBounce();
            }
            if (ballY.current + dy.current < BALL_RADIUS) {
                dy.current = -dy.current;
                soundManager.playArkanoidBounce();
            } else if (ballY.current + dy.current > CANVAS_HEIGHT - BALL_RADIUS - 10) {
                // Check Paddle
                if (ballX.current > paddleX.current && ballX.current < paddleX.current + PADDLE_WIDTH) {
                    dy.current = -dy.current;
                    // Add some variance based on where it hits the paddle
                    const hitPoint = (ballX.current - (paddleX.current + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
                    dx.current += hitPoint * 2;
                    soundManager.playArkanoidBounce();
                } else if (ballY.current + dy.current > CANVAS_HEIGHT) {
                    setGameOver(true);
                    soundManager.playGameOver();
                }
            }

            ballX.current += dx.current;
            ballY.current += dy.current;

            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, win, highScore]);

    // Controls
    const moveLeft = useRef(false);
    const moveRight = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') moveLeft.current = true;
            if (e.key === 'ArrowRight') moveRight.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') moveLeft.current = false;
            if (e.key === 'ArrowRight') moveRight.current = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const controlLoop = setInterval(() => {
            if (moveLeft.current) {
                paddleX.current = Math.max(0, paddleX.current - 7);
            }
            if (moveRight.current) {
                paddleX.current = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddleX.current + 7);
            }
        }, 16);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(controlLoop);
        };
    }, []);

    // Mouse/Touch Move
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isPlaying || gameOver || win) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const x = (e.clientX - rect.left) * scaleX;
        paddleX.current = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2));
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
                <Link href="/driver/games" className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className={`p-2 rounded-full transition-colors ${isSoundEnabled ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'}`}
                    >
                        {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono">
                        SCORE <span className="text-primary font-bold">{internalScore}</span>
                    </div>
                    <div className="bg-yellow-900/20 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 border border-yellow-500/20">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="text-yellow-500 font-bold">{highScore}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">

                <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-[#0b0c15] touch-none">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onPointerMove={handlePointerMove}
                        className="block w-full h-auto aspect-[3/4]"
                    />

                    {(!isPlaying || gameOver || win) && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                            {win ? (
                                <h1 className="text-4xl font-black text-green-500 mb-2 drop-shadow-glow">¡VICTORIA!</h1>
                            ) : (
                                <h1 className="text-4xl font-black text-primary mb-2 italic tracking-tighter">ARKANOID</h1>
                            )}

                            {gameOver && (
                                <div className="mb-4">
                                    <p className="text-red-500 font-bold uppercase tracking-widest">Game Over</p>
                                    <p className="text-3xl font-mono text-white mt-1">{internalScore}</p>
                                </div>
                            )}

                            <button
                                onClick={resetGame}
                                className="px-10 py-4 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                {gameOver || win ? 'REINTENTAR' : 'JUGAR'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-full flex justify-between gap-6 max-w-[320px] mt-6">
                    <button
                        onPointerDown={(e) => { e.preventDefault(); moveLeft.current = true; }}
                        onPointerUp={(e) => { e.preventDefault(); moveLeft.current = false; }}
                        onPointerLeave={(e) => { e.preventDefault(); moveLeft.current = false; }}
                        className="flex-1 aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all touch-none"
                    >
                        <ChevronLeft className="w-12 h-12 text-white" />
                    </button>
                    <button
                        onPointerDown={(e) => { e.preventDefault(); moveRight.current = true; }}
                        onPointerUp={(e) => { e.preventDefault(); moveRight.current = false; }}
                        onPointerLeave={(e) => { e.preventDefault(); moveRight.current = false; }}
                        className="flex-1 aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all touch-none"
                    >
                        <ChevronRight className="w-12 h-12 text-white" />
                    </button>
                </div>

                <p className="mt-6 text-[10px] text-muted-foreground animate-pulse font-bold uppercase tracking-widest">
                    Usa los cursores o desliza sobre el tablero
                </p>

            </main>
        </div>
    );
}
