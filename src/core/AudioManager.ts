export class AudioManager {
    private sounds: Record<string, HTMLAudioElement> = {};
    private muted: boolean = false;

    constructor() {
        // Preload sounds
        this.load('place', 'public/sounds/place.mp3');
        this.load('build', 'public/sounds/build.mp3');
        this.load('error', 'public/sounds/error.mp3');
        this.load('fanfare', 'public/sounds/fanfare.mp3');
        this.load('click', 'public/sounds/click.mp3');
    }

    private load(name: string, path: string) {
        const audio = new Audio(path);
        this.sounds[name] = audio;
    }

    public play(name: string) {
        if (this.muted) return;
        
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0; // Reset to start so it can overlap/replay quickly
            if (name === 'build') {
                sound.volume = 0.5;
            }
            sound.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    public toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}