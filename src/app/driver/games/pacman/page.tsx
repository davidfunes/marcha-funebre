'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { useGameTimer } from '@/hooks/useGameTimer';

// Simplified grid: 1 = Wall, 0 = Dot, 2 = Empty, 3 = Power Pellet (optional)
const BOARD = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 2, 2, 2, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const ROWS = BOARD.length;
const COLS = BOARD[0].length;
const CELL_SIZE = 24; // Adjusted for mobile screen fits
const WIDTH = COLS * CELL_SIZE;
const HEIGHT = ROWS * CELL_SIZE;

const INITIAL_PACMAN = { x: 7, y: 10 };
const GHOST_SPAWN = { x: 7, y: 7 };

type Direction = { x: number, y: number };

export default function PacmanPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pacman, setPacman] = useState(INITIAL_PACMAN);
    const [ghosts, setGhosts] = useState([
        { x: 7, y: 7, color: '#ff0000', dir: { x: 0, y: 0 } }, // Blinky - Red
        { x: 6, y: 8, color: '#ffb8ae', dir: { x: 0, y: 0 } }, // Pinky - Pink
        { x: 8, y: 8, color: '#00ffff', dir: { x: 0, y: 0 } }  // Inky - Cyan
    ]);
    const [dots, setDots] = useState<boolean[][]>([]);
    const [score, setScore] = useState(0);
    const [direction, setDirection] = useState<Direction>({ x: 0, y: 0 }); // Current moving dir
    const [nextDirection, setNextDirection] = useState<Direction>({ x: 0, y: 0 }); // Buffered input
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Gamification: Earn points while playing
    useGameTimer(isPlaying && !gameOver && !gameWon);

    // Initialize Board
    const initGame = useCallback(() => {
        const initialDots = BOARD.map(row => row.map(cell => cell === 0));
        setDots(initialDots);
        setPacman(INITIAL_PACMAN);
        setGhosts([
            { x: 7, y: 7, color: '#ef4444', dir: { x: 1, y: 0 } },
            { x: 6, y: 8, color: '#f472b6', dir: { x: -1, y: 0 } },
            { x: 8, y: 8, color: '#06b6d4', dir: { x: 0, y: 1 } }
        ]);
        setDirection({ x: 0, y: 0 });
        setNextDirection({ x: 0, y: 0 });
        setScore(0);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    }, []);

    useEffect(() => {
        if (!isPlaying) initGame();
        setIsPlaying(false); // Wait for user start
    }, [initGame]);

    // Helpers
    const isWall = (x: number, y: number) => {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
        return BOARD[y][x] === 1;
    };

    // Game Loop
    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const moveInterval = setInterval(() => {
            // 1. Update Pacman
            setPacman(prev => {
                let moveDir = direction;

                // Try to turn
                if (nextDirection.x !== 0 || nextDirection.y !== 0) {
                    if (!isWall(prev.x + nextDirection.x, prev.y + nextDirection.y)) {
                        moveDir = nextDirection;
                        setDirection(moveDir); // Commit turn
                    }
                }

                // Move
                if (!isWall(prev.x + moveDir.x, prev.y + moveDir.y)) {
                    return { x: prev.x + moveDir.x, y: prev.y + moveDir.y };
                }
                return prev;
            });

            // 2. Consume Dots
            setPacman(currentPacman => {
                setDots(prevDots => {
                    if (prevDots[currentPacman.y][currentPacman.x]) {
                        // Ate a dot
                        const newDots = [...prevDots];
                        newDots[currentPacman.y] = [...newDots[currentPacman.y]];
                        newDots[currentPacman.y][currentPacman.x] = false;
                        setScore(s => s + 10);

                        // Check Win
                        const remaining = newDots.flat().filter(d => d).length;
                        if (remaining === 0) setGameWon(true);

                        return newDots;
                    }
                    return prevDots;
                });
                return currentPacman;
            });

            // 3. Move Ghosts (Simple Random AI)
            setGhosts(prevGhosts => prevGhosts.map(ghost => {
                const possibleDirs = [
                    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
                ].filter(d => !isWall(ghost.x + d.x, ghost.y + d.y) && !(d.x === -ghost.dir.x && d.y === -ghost.dir.y)); // Don't reverse immediately if possible

                let newDir = ghost.dir;
                if (possibleDirs.length > 0) {
                    // Bias towards moving? Random for now.
                    if (Math.random() < 0.3 || isWall(ghost.x + newDir.x, ghost.y + newDir.y)) {
                        newDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    }
                } else {
                    // Dead end, just reverse
                    newDir = { x: -ghost.dir.x, y: -ghost.dir.y };
                }

                return {
                    ...ghost,
                    x: ghost.x + newDir.x,
                    y: ghost.y + newDir.y,
                    dir: newDir
                };
            }));

        }, 200); // 5 FPS game speed (retro feel)

        return () => clearInterval(moveInterval);
    }, [isPlaying, gameOver, gameWon, direction, nextDirection, ghosts]); // Careful with deps, simplified for this snippet

    // Collision Check (Separate effect to catch updates)
    useEffect(() => {
        if (ghosts.some(g => g.x === pacman.x && g.y === pacman.y)) {
            setGameOver(true);
        }
    }, [pacman, ghosts]);


    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#0b0c15';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw Walls
        ctx.fillStyle = '#1e3a8a'; // Blue walls
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (BOARD[y][x] === 1) {
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    // Inner stroke for aesthetics
                    ctx.strokeStyle = '#3b82f6';
                    ctx.strokeRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                }
            }
        }

        // Draw Dots
        ctx.fillStyle = '#fbbf24'; // Amber dot
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (dots[y] && dots[y][x]) {
                    ctx.beginPath();
                    ctx.arc(
                        x * CELL_SIZE + CELL_SIZE / 2,
                        y * CELL_SIZE + CELL_SIZE / 2,
                        3,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }

        // Draw Ghosts
        ghosts.forEach(ghost => {
            ctx.fillStyle = ghost.color;
            ctx.beginPath();
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2,
                ghost.y * CELL_SIZE + CELL_SIZE / 2,
                CELL_SIZE / 2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(ghost.x * CELL_SIZE + CELL_SIZE / 2 - 4, ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2, 3, 0, Math.PI * 2);
            ctx.arc(ghost.x * CELL_SIZE + CELL_SIZE / 2 + 4, ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Pacman
        ctx.fillStyle = '#eab308'; // Yellow
        ctx.beginPath();
        const px = pacman.x * CELL_SIZE + CELL_SIZE / 2;
        const py = pacman.y * CELL_SIZE + CELL_SIZE / 2;
        // Simple mouth animation could go here
        ctx.arc(px, py, CELL_SIZE / 2 - 2, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(px, py);
        ctx.fill();

    }, [pacman, ghosts, dots]);

    const handleControl = (x: number, y: number) => {
        setNextDirection({ x, y });
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
                </div>
            </div>

            <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">

                <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-[#0b0c15]">
                    <canvas
                        ref={canvasRef}
                        width={WIDTH}
                        height={HEIGHT}
                        className="block w-full h-auto"
                        style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
                    />

                    {/* Overlays */}
                    {(!isPlaying || gameOver || gameWon) && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                            {gameOver && <h2 className="text-3xl font-bold text-red-500 mb-2">¡GAME OVER!</h2>}
                            {gameWon && <h2 className="text-3xl font-bold text-yellow-500 mb-2">¡VICTORIA!</h2>}
                            {!isPlaying && !gameOver && !gameWon && <h2 className="text-3xl font-bold text-yellow-500 mb-2">Marcha-Man</h2>}

                            <p className="text-gray-300 mb-6">
                                {gameOver ? `Puntuación final: ${score}` : 'Recoge todos los puntos y evita a los fantasmas'}
                            </p>

                            <button
                                onClick={() => { setIsPlaying(true); initGame(); }}
                                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-transform active:scale-95 shadow-lg shadow-primary/25"
                            >
                                <RefreshCw className="w-5 h-5" />
                                {gameOver || gameWon ? 'Reintentar' : 'Jugar'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile D-Pad */}
                <div className="mt-8 grid grid-cols-3 gap-2 w-48 select-none">
                    <div className="col-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl(0, -1)}
                        >
                            <ArrowLeft className="w-8 h-8 rotate-90" />
                        </button>
                    </div>
                    <div className="col-start-1 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl(-1, 0)}
                        >
                            <ArrowLeft className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="col-start-2 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl(0, 1)}
                        >
                            <ArrowLeft className="w-8 h-8 -rotate-90" />
                        </button>
                    </div>
                    <div className="col-start-3 row-start-2">
                        <button
                            className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center active:bg-primary transition-colors touch-manipulation shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                            onPointerDown={() => handleControl(1, 0)}
                        >
                            <ArrowLeft className="w-8 h-8 rotate-180" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
