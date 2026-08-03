// Bio-Force: Parasite Dawn - Sound Effects (Web Audio API)

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.muted = false;
        this.masterGain = null;
        this.initialized = false;
    }
    
    // Initialize audio context on user interaction
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Master volume
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
    }
    
    // Create an oscillator with envelope
    playTone(frequency, type, duration, startTime = 0, frequencySweep = null) {
        if (!this.initialized || this.muted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        if (frequencySweep) {
            osc.frequency.exponentialRampToValueAtTime(
                frequencySweep.endFreq, 
                this.audioContext.currentTime + startTime + frequencySweep.duration
            );
        }
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(this.audioContext.currentTime + startTime);
        osc.stop(this.audioContext.currentTime + startTime + duration);
    }
    
    // Create noise for explosions
    playNoise(duration, startTime = 0) {
        if (!this.initialized || this.muted) return;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start(this.audioContext.currentTime + startTime);
    }
    
    // Laser shot sound
    playLaser() {
        this.playTone(800, 'square', 0.1, 0, { endFreq: 400, duration: 0.1 });
    }
    
    // Pod laser (higher pitch)
    playPodLaser() {
        this.playTone(1200, 'sine', 0.15, 0, { endFreq: 600, duration: 0.15 });
    }
    
    // Enemy bullet
    playEnemyBullet() {
        this.playTone(300, 'triangle', 0.1);
    }
    
    // Small explosion
    playExplosionSmall() {
        this.playNoise(0.2);
        this.playTone(150, 'sawtooth', 0.2, 0, { endFreq: 50, duration: 0.2 });
    }
    
    // Large explosion (boss, mid-boss)
    playExplosionLarge() {
        this.playNoise(0.5);
        this.playTone(100, 'sawtooth', 0.5, 0, { endFreq: 30, duration: 0.5 });
    }
    
    // Player death
    playPlayerDeath() {
        this.playNoise(0.8);
        this.playTone(200, 'sawtooth', 0.8, 0, { endFreq: 50, duration: 0.8 });
    }
    
    // Power-up collect
    playPowerUp() {
        this.playTone(600, 'sine', 0.1);
        this.playTone(800, 'sine', 0.1, 0.1);
        this.playTone(1000, 'sine', 0.2, 0.2);
    }
    
    // Boss warning
    playBossWarning() {
        for (let i = 0; i < 3; i++) {
            this.playTone(400, 'square', 0.3, i * 0.35);
        }
    }
    
    // Boss enter
    playBossEnter() {
        this.playNoise(1.0);
        this.playTone(80, 'sawtooth', 1.0, 0, { endFreq: 40, duration: 1.0 });
    }
    
    // Pod detach/attach
    playPodToggle() {
        this.playTone(500, 'sine', 0.15, 0, { endFreq: 700, duration: 0.15 });
    }
    
    // Hit sound
    playHit() {
        this.playTone(200, 'square', 0.05);
    }
}

// Global sound instance
const Sound = new SoundManager();
