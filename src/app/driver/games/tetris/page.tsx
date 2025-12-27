'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useGameTimer } from '@/hooks/useGameTimer';
import { soundManager } from '@/utils/sound';

// --- Tetris Constants ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20; // Will scale on canvas
const COLORS = {
    I: '#00f0f0',
    J: '#0000f0',
    L: '#f0a000',
    O: '#f0f000',
    S: '#00f000',
    T: '#a000f0',
    Z: '#f00000',
};

const TETROMINOS = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

type Piece = {
    pos: { x: number; y: number };
    shape: number[][];
    color: string;
};

export default function TetrisGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [grid, setGrid] = useState<string[][]>(createGrid());
    const [activePiece, setActivePiece] = useState<Piece | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [isSoundEnabled, setIsSoundEnabled] = useState(false);
    const [lines, setLines] = useState(0);

    // Gamification Hook
    useGameTimer(isPlaying && !gameOver);

    // Initial Setup
    useEffect(() => {
        const savedHigh = localStorage.getItem('tetris_highscore');
        if (savedHigh) setHighScore(parseInt(savedHigh));
    }, []);

    // Sound and Music
    useEffect(() => {
        if (isPlaying && !gameOver) {
            soundManager.playMusic('tetris');
        } else {
            soundManager.stopMusic();
        }
        return () => soundManager.stopMusic();
    }, [isPlaying, gameOver]);

    useEffect(() => {
        soundManager.setMuted(!isSoundEnabled);
    }, [isSoundEnabled]);

    function createGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    }

    const spawnPiece = useCallback(() => {
        const keys = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
        const type = keys[Math.floor(Math.random() * keys.length)];
        const shape = TETROMINOS[type];
        const color = COLORS[type];

        const newPiece: Piece = {
            pos: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 },
            shape,
            color,
        };

        if (checkCollision(newPiece, grid)) {
            setGameOver(true);
            soundManager.playGameOver();
            return null;
        }
        return newPiece;
    }, [grid]);

    const resetGame = () => {
        setGrid(createGrid());
        setScore(0);
        setLevel(1);
        setLines(0);
        setGameOver(false);
        setIsPlaying(true);
        const p = spawnPieceInitial();
        setActivePiece(p);
    };

    // Helper for initial spawn because spawnPiece depends on grid
    const spawnPieceInitial = () => {
        const keys = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
        const type = keys[Math.floor(Math.random() * keys.length)];
        const shape = TETROMINOS[type];
        const color = COLORS[type];
        return {
            pos: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 },
            shape,
            color,
        };
    };

    function checkCollision(piece: Piece, currentGrid: string[][]) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] !== 0) {
                    const nextX = piece.pos.x + x;
                    const nextY = piece.pos.y + y;
                    if (
                        nextX < 0 ||
                        nextX >= COLS ||
                        nextY >= ROWS ||
                        (nextY >= 0 && currentGrid[nextY][nextX] !== '')
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    const mergePiece = useCallback(() => {
        if (!activePiece) return;
        const newGrid = [...grid.map(row => [...row])];
        activePiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const gy = activePiece.pos.y + y;
                    const gx = activePiece.pos.x + x;
                    if (gy >= 0) newGrid[gy][gx] = activePiece.color;
                }
            });
        });

        // Clear Lines
        let linesCleared = 0;
        const filteredGrid = newGrid.filter(row => {
            const isFull = row.every(cell => cell !== '');
            if (isFull) linesCleared++;
            return !isFull;
        });

        while (filteredGrid.length < ROWS) {
            filteredGrid.unshift(Array(COLS).fill(''));
        }

        if (linesCleared > 0) {
            const points = [0, 100, 300, 500, 800][linesCleared] * level;
            setScore(s => {
                const newScore = s + points;
                if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem('tetris_highscore', newScore.toString());
                }
                return newScore;
            });
            setLines(l => {
                const totalLines = l + linesCleared;
                setLevel(Math.floor(totalLines / 10) + 1);
                return totalLines;
            });
            soundManager.playTetrisLine();
        } else {
            soundManager.playTetrisDrop();
        }

        setGrid(filteredGrid);
        setActivePiece(spawnPiece());
    }, [activePiece, grid, level, highScore, spawnPiece]);

    const movePiece = useCallback((dx: number, dy: number) => {
        if (!activePiece || gameOver) return false;
        const nextPiece = { ...activePiece, pos: { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy } };
        if (!checkCollision(nextPiece, grid)) {
            setActivePiece(nextPiece);
            if (dx !== 0) soundManager.playTetrisMove();
            return true;
        } else if (dy > 0) {
            mergePiece();
            return false;
        }
        return false;
    }, [activePiece, grid, gameOver, mergePiece]);

    const rotatePiece = useCallback(() => {
        if (!activePiece || gameOver) return;
        const rotated = activePiece.shape[0].map((_, i) =>
            activePiece.shape.map(row => row[i]).reverse()
        );
        const nextPiece = { ...activePiece, shape: rotated };
        // Basic wall kick
        if (checkCollision(nextPiece, grid)) {
            if (!checkCollision({ ...nextPiece, pos: { ...nextPiece.pos, x: nextPiece.pos.x - 1 } }, grid)) {
                nextPiece.pos.x -= 1;
            } else if (!checkCollision({ ...nextPiece, pos: { ...nextPiece.pos, x: nextPiece.pos.x + 1 } }, grid)) {
                nextPiece.pos.x += 1;
            } else {
                return;
            }
        }
        setActivePiece(nextPiece);
        soundManager.playTetrisRotate();
    }, [activePiece, grid, gameOver]);

    // Game Loop
    useEffect(() => {
        if (!isPlaying || gameOver) return;
        const speed = Math.max(100, 800 - (level - 1) * 100);
        const interval = setInterval(() => {
            movePiece(0, 1);
        }, speed);
        return () => clearInterval(interval);
    }, [isPlaying, gameOver, level, movePiece]);

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying || gameOver) return;
            switch (e.key) {
                case 'ArrowLeft': movePiece(-1, 0); break;
                case 'ArrowRight': movePiece(1, 0); break;
                case 'ArrowDown': movePiece(0, 1); break;
                case 'ArrowUp': rotatePiece(); break;
                case ' ': // Hard drop
                    let canMove = true;
                    while (canMove) {
                        canMove = movePiece(0, 1);
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver, movePiece, rotatePiece]);

    // Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cellW = w / COLS;
        const cellH = h / ROWS;

        // Clear
        ctx.fillStyle = '#0b0c15';
        ctx.fillRect(0, 0, w, h);

        // Draw GridLines
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, h); ctx.stroke();
        }
        for (let i = 0; i <= ROWS; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(w, i * cellH); ctx.stroke();
        }

        // Draw Settled Blocks
        grid.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color !== '') {
                    drawBlock(ctx, x, y, color, cellW, cellH);
                }
            });
        });

        // Draw Active Piece
        if (activePiece) {
            activePiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        drawBlock(ctx, activePiece.pos.x + x, activePiece.pos.y + y, activePiece.color, cellW, cellH);
                    }
                });
            });
        }

        function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w: number, h: number) {
            const px = x * w;
            const py = y * h;

            // Neon Block Style
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.roundRect(px + 1, py + 1, w - 2, h - 2, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Glossy effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(px + 3, py + 3, w / 3, h / 3);
        }
    }, [grid, activePiece]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
                <Link href="/driver/games" className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className={`p-2 rounded-full transition-colors ${isSoundEnabled ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'}`}
                    >
                        {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono">
                        LVL <span className="text-primary font-bold">{level}</span>
                    </div>
                    <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono">
                        <span className="font-bold">{score}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center gap-6">

                <div className="flex w-full gap-4 items-start">
                    {/* Game Board */}
                    <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-[#0b0c15] flex-1">
                        <canvas
                            ref={canvasRef}
                            width={240}
                            height={480}
                            className="block w-full h-auto aspect-[1/2]"
                        />

                        {(!isPlaying || gameOver) && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                                <h1 className="text-4xl font-black text-primary mb-2 tracking-tighter italic">TETRIS</h1>
                                {gameOver && (
                                    <div className="mb-4">
                                        <p className="text-red-500 font-bold">GAME OVER</p>
                                        <p className="text-2xl font-mono">{score}</p>
                                    </div>
                                )}
                                <button
                                    onClick={resetGame}
                                    className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    {gameOver ? 'REINTENTAR' : 'JUGAR'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Sidebar */}
                    <div className="w-24 space-y-4">
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">RECORD</p>
                            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                            <p className="font-mono text-sm leading-none">{highScore}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">LÍNEAS</p>
                            <p className="font-mono text-lg font-bold leading-none">{lines}</p>
                        </div>
                    </div>
                </div>

                {/* Mobile Controls */}
                <div className="w-full grid grid-cols-3 gap-3 max-w-[300px]">
                    <div className="col-start-2">
                        <button
                            onPointerDown={(e) => { e.preventDefault(); rotatePiece(); }}
                            className="w-full aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <RefreshCw className="w-8 h-8 text-white" />
                        </button>
                    </div>
                    <div className="col-start-1 row-start-2">
                        <button
                            onPointerDown={(e) => { e.preventDefault(); movePiece(-1, 0); }}
                            className="w-full aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <ArrowLeft className="w-8 h-8 text-white" />
                        </button>
                    </div>
                    <div className="col-start-2 row-start-2">
                        <button
                            onPointerDown={(e) => { e.preventDefault(); movePiece(0, 1); }}
                            className="w-full aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <ArrowLeft className="w-8 h-8 -rotate-90 text-white" />
                        </button>
                    </div>
                    <div className="col-start-3 row-start-2">
                        <button
                            onPointerDown={(e) => { e.preventDefault(); movePiece(1, 0); }}
                            className="w-full aspect-square bg-gray-800 rounded-2xl flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <ArrowLeft className="w-8 h-8 rotate-180 text-white" />
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
