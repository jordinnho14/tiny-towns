export class AudioManager {
    private sounds: Record<string, HTMLAudioElement> = {};
    private muted: boolean = false;

    constructor() {
        const baseUrl = import.meta.env.BASE_URL;
        // Preload sounds
        this.load('place', `${baseUrl}sounds/place.mp3`);
        this.load('build', `${baseUrl}sounds/build.mp3`);
        this.load('error', `${baseUrl}sounds/error.mp3`);
        this.load('fanfare', `${baseUrl}sounds/fanfare.mp3`);
        this.load('click', `${baseUrl}sounds/click.mp3`);
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