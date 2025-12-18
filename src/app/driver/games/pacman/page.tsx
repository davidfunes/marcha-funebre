'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useGameTimer } from '@/hooks/useGameTimer';
import { soundManager } from '@/utils/sound';

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
    // Add mouth state for animation
    const [mouthOpen, setMouthOpen] = useState(0.2);
    const [mouthOpening, setMouthOpening] = useState(true);

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
    const [isSoundEnabled, setIsSoundEnabled] = useState(false);

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

    useEffect(() => {
        if (isPlaying && !gameOver && !gameWon) {
            soundManager.playMusic('pacman');
        } else {
            soundManager.stopMusic();
        }
        return () => soundManager.stopMusic();
    }, [isPlaying, gameOver, gameWon, isSoundEnabled]);

    useEffect(() => {
        soundManager.setMuted(!isSoundEnabled);
        if (isPlaying && !gameOver && !gameWon && isSoundEnabled) {
            soundManager.playMusic('pacman');
        } else if (!isSoundEnabled) {
            soundManager.stopMusic();
        }
    }, [isSoundEnabled, isPlaying, gameOver, gameWon]);

    const toggleSound = () => {
        setIsSoundEnabled(!isSoundEnabled);
    };

    // Dynamic Tempo Logic
    // Compute total dots once
    const totalDots = useRef(0);
    useEffect(() => {
        let count = 0;
        BOARD.forEach(row => row.forEach(cell => { if (cell === 0) count++ }));
        totalDots.current = count;
    }, []);

    useEffect(() => {
        if (!isPlaying || !totalDots.current) return;

        let remaining = 0;
        dots.forEach(row => row.forEach(d => { if (d) remaining++ }));

        // Progress 0 to 1
        const progress = 1 - (remaining / totalDots.current);
        const progressPercent = Math.floor(progress * 10) * 10; // 0, 10, 20...

        // +5 bpm per 10%
        // progressPercent / 10 = 0..10
        // Increase = (0..10) * 5
        const tempoIncrease = (progressPercent / 10) * 5;
        const newTempo = 100 + tempoIncrease; // Base 100

        soundManager.setTempo(newTempo);

    }, [dots, isPlaying]);

    // Keyboard Controls (D-Pad standard)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying || gameOver || gameWon) return;

            // Prevent default scrolling for arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp':
                    setNextDirection({ x: 0, y: -1 });
                    break;
                case 'ArrowDown':
                    setNextDirection({ x: 0, y: 1 });
                    break;
                case 'ArrowLeft':
                    setNextDirection({ x: -1, y: 0 });
                    break;
                case 'ArrowRight':
                    setNextDirection({ x: 1, y: 0 });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver, gameWon]);


    // Helpers
    const isWall = (x: number, y: number) => {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
        return BOARD[y][x] === 1;
    };

    // Game Loop
    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const moveInterval = setInterval(() => {
            // Mouth animation logic
            setMouthOpen(prev => {
                if (mouthOpening) {
                    if (prev >= 0.25) { setMouthOpening(false); return 0.25; }
                    return prev + 0.05;
                } else {
                    if (prev <= 0.05) { setMouthOpening(true); return 0.05; }
                    return prev - 0.05;
                }
            });

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
                    // Play waka sound if moving - replaced by bg music
                    return { x: prev.x + moveDir.x, y: prev.y + moveDir.y };
                }
                return prev;
            });

            // 2. Consume Dots
            setPacman(currentPacman => {
                setDots(prevDots => {
                    if (prevDots[currentPacman.y][currentPacman.x]) {
                        // Ate a dot
                        soundManager.playEatDot();
                        const newDots = [...prevDots];
                        newDots[currentPacman.y] = [...newDots[currentPacman.y]];
                        newDots[currentPacman.y][currentPacman.x] = false;
                        setScore(s => s + 10);

                        // Check Win
                        const remaining = newDots.flat().filter(d => d).length;
                        if (remaining === 0) {
                            soundManager.playWin();
                            setGameWon(true);
                        }

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

        }, 150); // Faster game speed

        return () => clearInterval(moveInterval);
    }, [isPlaying, gameOver, gameWon, direction, nextDirection, ghosts, mouthOpening]);

    // Collision Check
    useEffect(() => {
        if (ghosts.some(g => g.x === pacman.x && g.y === pacman.y)) {
            soundManager.playGameOver();
            setGameOver(true);
        }
    }, [pacman, ghosts]);



    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear with slight transparency for trail effect (optional, maybe too messy)
        // ctx.fillStyle = 'rgba(11, 12, 21, 0.3)';
        ctx.fillStyle = '#0b0c15';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw Walls - NEON STYLE
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;

        ctx.beginPath();
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (BOARD[y][x] === 1) {
                    // Draw lines connecting neighbors for smoother look
                    const cx = x * CELL_SIZE + CELL_SIZE / 2;
                    const cy = y * CELL_SIZE + CELL_SIZE / 2;

                    // Check neighbors to draw partial lines
                    // Right
                    if (x + 1 < COLS && BOARD[y][x + 1] === 1) {
                        ctx.moveTo(cx, cy); ctx.lineTo(cx + CELL_SIZE, cy);
                    }
                    // Down
                    if (y + 1 < ROWS && BOARD[y + 1][x] === 1) {
                        ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + CELL_SIZE);
                    }
                    // If isolated or end of line, draw a dot
                    if ((x + 1 >= COLS || BOARD[y][x + 1] !== 1) && (y + 1 >= ROWS || BOARD[y + 1][x] !== 1) &&
                        (x - 1 < 0 || BOARD[y][x - 1] !== 1) && (y - 1 < 0 || BOARD[y - 1][x] !== 1)) {
                        ctx.moveTo(cx, cy); ctx.lineTo(cx, cy); // Dot 
                    }
                }
            }
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Draw Dots
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (dots[y] && dots[y][x]) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(
                        x * CELL_SIZE + CELL_SIZE / 2,
                        y * CELL_SIZE + CELL_SIZE / 2,
                        3,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Draw Ghosts
        ghosts.forEach(ghost => {
            const gx = ghost.x * CELL_SIZE + CELL_SIZE / 2;
            const gy = ghost.y * CELL_SIZE + CELL_SIZE / 2;
            const size = CELL_SIZE / 2 - 2;

            ctx.fillStyle = ghost.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ghost.color;

            // Ghost Body (Bell shape)
            ctx.beginPath();
            ctx.arc(gx, gy - 2, size, Math.PI, 0, false);
            ctx.lineTo(gx + size, gy + size);
            // Little feet
            for (let i = 1; i <= 3; i++) {
                ctx.lineTo(gx + size - (2 * size / 3) * i, gy + size - (i % 2 == 0 ? 2 : 0));
            }
            ctx.lineTo(gx - size, gy + size);
            ctx.fill();

            ctx.shadowBlur = 0;
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
            ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
            ctx.fill();
            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath();
            const lookX = ghost.dir.x * 1.5;
            const lookY = ghost.dir.y * 1.5;
            ctx.arc(gx - 4 + lookX, gy - 4 + lookY, 1.5, 0, Math.PI * 2);
            ctx.arc(gx + 4 + lookX, gy - 4 + lookY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Pacman
        ctx.fillStyle = '#eab308'; // Yellow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#eab308';
        ctx.beginPath();
        const px = pacman.x * CELL_SIZE + CELL_SIZE / 2;
        const py = pacman.y * CELL_SIZE + CELL_SIZE / 2;

        // Calculate mouth angle based on direction
        let rotation = 0;
        if (direction.x === 1) rotation = 0;
        else if (direction.x === -1) rotation = Math.PI;
        else if (direction.y === -1) rotation = -Math.PI / 2;
        else if (direction.y === 1) rotation = Math.PI / 2;

        ctx.arc(px, py, CELL_SIZE / 2 - 2, rotation + mouthOpen * Math.PI, rotation + (2 - mouthOpen) * Math.PI);
        ctx.lineTo(px, py);
        ctx.fill();
        ctx.shadowBlur = 0;

    }, [pacman, ghosts, dots, mouthOpen, direction]); // Re-draw on mouth update

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
                    <button
                        onClick={toggleSound}
                        className={`p-2 rounded-full transition-colors ${isSoundEnabled ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'}`}
                    >
                        {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
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
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                            {gameOver && <h2 className="text-3xl font-bold text-red-500 mb-2 drop-shadow-glow">¡GAME OVER!</h2>}
                            {gameWon && <h2 className="text-3xl font-bold text-yellow-500 mb-2 drop-shadow-glow">¡VICTORIA!</h2>}
                            {!isPlaying && !gameOver && !gameWon && <h2 className="text-3xl font-bold text-yellow-500 mb-2 drop-shadow-glow">Marcha-Man</h2>}

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

                {/* Music Credits */}
                <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-mono text-center">Music: "Funeral March"</span>
                    <a href="https://www.youtube.com/watch?v=uX0krxUArI8" target="_blank" rel="noreferrer" className="text-[10px] text-gray-600 hover:text-primary transition-colors font-mono">
                        Source: 8-bit Music (YouTube)
                    </a>
                </div>
            </main>
        </div>
    );
}

// Add CSS for glow effect if not present globally
// .drop-shadow-glow { filter: drop-shadow(0 0 10px currentColor); }
