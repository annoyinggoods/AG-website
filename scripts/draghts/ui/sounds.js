import { getMuted } from "./localStorage.js";
const VOLUMES = {
    "terror-scream": 0.7,
    "illegal-move": 0.5,
    "promoted-to-king": 0.8,
    "bonus-turn": 0.8,
    "frenzy-turn": 0.35,
    "win-against-AI": 0.8,
    "lose-against-AI": 0.8
};
export class SoundPlayer {
    constructor() {
        this.audioCtx = null;
        this.unlocked = false;
        this.frenzySource = null;
        this.frenzyAudio = null;
        this.frenzyGain = null;
        this.frenzyLoopActive = false;
    }
    getContext() {
        if (!this.audioCtx) {
            const win = window;
            const AC = win.AudioContext ?? win.webkitAudioContext;
            this.audioCtx = new AC();
        }
        return this.audioCtx;
    }
    unlock() {
        if (this.unlocked) {
            return;
        }
        try {
            const ctx = this.getContext();
            if (ctx.state === "suspended") {
                ctx.resume().then(() => {
                    this.unlocked = true;
                }).catch(() => {
                    return;
                });
            }
            else {
                this.unlocked = true;
            }
        }
        catch {
            return;
        }
    }
    play(name, options = {}) {
        if (getMuted()) {
            return;
        }
        this.unlock();
        const url = "/assets/draghts/audio/" + name + ".mp3";
        const volume = VOLUMES[name] ?? 0.7;
        if (options.loop && name === "frenzy-turn") {
            this.startFrenzyLoop(name, volume);
            return;
        }
        if (name === "frenzy-turn" && !options.loop) {
            this.stopFrenzyLoop();
            return;
        }
        const audio = document.createElement("audio");
        audio.src = url;
        audio.volume = volume;
        if (name === "terror-scream" && !options.playbackRate) {
            audio.playbackRate = 0.9 + Math.random() * 0.2;
        }
        else if (options.playbackRate && options.playbackRate !== 1) {
            audio.playbackRate = options.playbackRate;
        }
        if (options.loop) {
            audio.loop = true;
        }
        audio.play().catch(() => {
            return;
        });
    }
    startFrenzyLoop(name, volume) {
        if (this.frenzyLoopActive) {
            return;
        }
        this.frenzyLoopActive = true;
        const url = "/assets/draghts/audio/" + name + ".mp3";
        fetch(url).then((r) => r.arrayBuffer()).then((buf) => this.getContext().decodeAudioData(buf)).then((audioBuffer) => {
            if (!this.frenzyLoopActive || getMuted()) {
                return;
            }
            const ctx = this.getContext();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            const gain = ctx.createGain();
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);
            this.frenzyGain = gain;
            this.frenzySource = source;
        }).catch(() => {
            const audio = document.createElement("audio");
            audio.src = url;
            audio.volume = volume;
            audio.loop = true;
            audio.play().catch(() => {
                return;
            });
            this.frenzyAudio = audio;
        });
    }
    stopFrenzyLoop() {
        this.frenzyLoopActive = false;
        if (this.frenzySource) {
            try {
                this.frenzySource.stop();
            }
            catch {
                return;
            }
            try {
                this.frenzySource.disconnect();
            }
            catch {
                return;
            }
            this.frenzySource = null;
        }
        if (this.frenzyGain) {
            try {
                this.frenzyGain.disconnect();
            }
            catch {
                return;
            }
            this.frenzyGain = null;
        }
        if (this.frenzyAudio) {
            try {
                this.frenzyAudio.pause();
            }
            catch {
                return;
            }
            this.frenzyAudio.removeAttribute("src");
            try {
                this.frenzyAudio.load();
            }
            catch {
                return;
            }
            this.frenzyAudio = null;
        }
    }
    stopAll() {
        this.stopFrenzyLoop();
    }
}
let globalPlayer = null;
export function getSoundPlayer() {
    if (!globalPlayer) {
        globalPlayer = new SoundPlayer();
    }
    return globalPlayer;
}
export function playSound(name, options) {
    getSoundPlayer().play(name, options);
}
export function startFrenzyLoop() {
    getSoundPlayer().play("frenzy-turn", { loop: true });
}
export function stopFrenzyLoopSound() {
    getSoundPlayer().stopFrenzyLoop();
}
export function ensureGestureUnlock() {
    const unlockOnce = () => {
        getSoundPlayer().unlock();
    };
    window.addEventListener("pointerdown", unlockOnce, { once: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
    window.addEventListener("touchstart", unlockOnce, { once: true });
}
//# sourceMappingURL=sounds.js.map