import { Game } from './core/Game';
import { Renderer } from './ui/Renderer';
import { MultiplayerGame } from './core/MultiplayerGame';
import { AudioManager } from './core/AudioManager';
import { LobbyController } from './ui/LobbyController';
import { GameController } from './ui/GameController';

// 1. INITIALIZATION
const game = new Game();
const renderer = new Renderer();
const multiplayer = new MultiplayerGame(game);
const audio = new AudioManager();

// 2. CONTROLLERS
const lobby = new LobbyController(multiplayer, audio);
const gameController = new GameController(game, renderer, multiplayer, audio);

// 3. HOOK MULTIPLAYER EVENTS
multiplayer.onStateChange = (data) => {
    try {
        if (data.status === 'LOBBY') {
            lobby.update(data);
        } else {
            // PLAYING or FINISHED states are handled by GameController
            gameController.handleGameUpdate(data);
        }
    } catch (err) {
        console.error("State Sync Error:", err);
    }
};

multiplayer.onGameStart = () => {
    // Hide start modal and prep UI
    const modal = document.getElementById('start-screen-modal');
    if (modal) modal.classList.add('hidden');

    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) gameContainer.classList.remove('hidden');
    
    renderer.renderDeck(game.gameRegistry);
    gameController.renderAll();
};

// 4. DEBUG TOOLS
(window as any).setMonument = (name: string) => gameController.debugSetMonument(name);

console.log("🏙️ Tiny Towns Initialized.");