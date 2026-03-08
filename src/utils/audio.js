import bgMusicUrl from '../audios/background.mp3';

// A simple Web Audio API synthesizer for programmatic sound effects
// Allows for game-like audio without needing external mp3/wav files

class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgMusic = new Audio(bgMusicUrl);
        this.bgMusic.loop = true;
        this.bgMusic.volume = 2.8; // Default menu volume
        this.bgMusicStarted = false;

        // Backup: force replay if loop doesn't work
        this.bgMusic.addEventListener('ended', () => {
            this.bgMusic.currentTime = 0;
            this.bgMusic.play().catch(() => { });
        });
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play background music (requires user interaction to start on most browsers)
    startBackgroundMusic() {
        this.bgMusic.play().then(() => {
            this.bgMusicStarted = true;
        }).catch(e => {
            console.log("Autoplay prevented, waiting for interaction...", e);
        });
    }

    // Dynamically change volume (useful for ducking audio when mic is active)
    setMusicVolume(vol = 0.5) {
        if (this.bgMusic) {
            this.bgMusic.volume = vol;
        }
    }

    // Racing game style countdown beep (short, medium pitch)
    playBeep(frequency = 440, duration = 0.1, type = 'sine') {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Envelope
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // High pitched long beep for "GO!"
    playGoBeep() {
        this.playBeep(880, 0.4, 'square');
    }

    // Low pitched short beep for 3, 2, 1
    playCountdownBeep() {
        this.playBeep(440, 0.15, 'square');
    }

}

// Export a singleton instance
export const audioSystem = new AudioEngine();
