
export class SoundManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = true;

    constructor() {
        // Initialize AudioContext lazily on user interaction
    }

    private getContext(): AudioContext | null {
        if (!this.audioContext && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
        return this.audioContext;
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.currentAudio) {
            this.currentAudio.muted = muted;
        }
        if (!muted && this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    public isAudioMuted(): boolean {
        return this.isMuted;
    }

    private playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    // --- Specific Game Sounds ---

    // Pacman Sounds
    public playPacmanWaka() {
        if (this.isMuted) return;
        // Two tones to simulate waka-waka
        this.playTone(300, 'triangle', 0.1, 0.1);
        setTimeout(() => this.playTone(450, 'triangle', 0.1, 0.1), 150);
    }

    public playEatDot() {
        this.playTone(600, 'sine', 0.05, 0.05);
    }

    public playEatGhost() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Rapid arpeggio
        const now = ctx.currentTime;
        [800, 1000, 1200, 1500].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = 'square';
            gain.gain.setValueAtTime(0.1, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.05 + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }

    // Snake Sounds
    public playSnakeEat() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Rising chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    // --- Background Music ---
    private currentAudio: HTMLAudioElement | null = null;
    private currentTrack: 'pacman' | 'snake' | null = null;
    private currentTempo: number = 100; // Base percentage (100 = 1.0x)

    public setTempo(tempo: number) {
        // Map abstract tempo to playbackRate
        // 100 -> 1.0
        // 120 -> 1.2
        // etc.
        this.currentTempo = tempo;
        if (this.currentAudio) {
            // Smooth adjustment? 
            // Clamp to reasonable limits (0.5x to 4.0x)
            // Pacman base: 100 -> Start at 1.0
            // Snake base: 120 -> Start at 1.0 (logic in game sends 120 as base for snake? Let's check game logic)
            // Snake sends 120 + score. 
            // Pacman sends 100 + progress.

            // Normalize: 
            // For Snake: starts at 120. Let's treat 120 as 1.0x.
            // For Pacman: starts at 100. Let's treat 100 as 1.0x.

            let rate = 1.0;
            if (this.currentTrack === 'snake') {
                rate = tempo / 120;
            } else {
                rate = tempo / 100;
            }

            // Safety Clamps
            rate = Math.max(0.5, Math.min(3.0, rate));

            this.currentAudio.playbackRate = rate;
        }
    }

    public playMusic(track: 'pacman' | 'snake') {
        if (this.currentTrack === track && this.currentAudio && !this.currentAudio.paused) return;

        this.stopMusic();
        this.currentTrack = track;

        const path = track === 'pacman'
            ? '/music/funeral-march.mp3'
            : '/music/ride-of-the-valkyries.mp3';

        this.currentAudio = new Audio(path);
        this.currentAudio.loop = true;
        this.currentAudio.volume = 0.5; // Default volume

        // Restore mute state
        this.currentAudio.muted = this.isMuted;

        // Initial Tempo Set
        this.setTempo(this.currentTempo);

        this.currentAudio.play().catch(e => console.error("Audio play failed:", e));
    }

    public stopMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.currentTrack = null;
    }


    // Common Sounds
    public playGameOver() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Descending slide
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
        osc.type = 'sawtooth';

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }

    public playWin() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Fanfare
        const now = ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = 'square';

            const time = now + i * 0.15;
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.3);
        });
    }
}

export const soundManager = new SoundManager();
