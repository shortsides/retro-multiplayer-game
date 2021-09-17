import SceneMainBuilding from "./src/scenes/mainBuilding.js";
import SceneWorld from "./src/scenes/World.js";

// production server config
//const socket = io('https://quiet-coast-19364.herokuapp.com/');

// local testing config
export const socket = io('http://localhost:3000/');

socket.on('init', handleInit);
socket.on('serverFull', handleServerFull);

const initialScreen = document.getElementById('initialScreen');
const initialScreenMessage = document.getElementById('initialScreenMessage');
const gameScreen = document.getElementById('game-container');
const nameInput = document.getElementById('nameInput');
const playButton = document.getElementById('playButton');

playButton.addEventListener('click', playGame);

export let playerName;
export let playerSprite;

export const FRAME_RATE = 10;
export const SPRITES = [
    {
        spriteNum: 0,
        spriteSheet: 'sprites1',
        spriteSheetPath: 'assets/sprites/Chara01.png',
        front: 0,
        left: 16,
        right: 32,
        back: 48
    },
    {
        spriteNum: 1,
        spriteSheet: 'sprites1',
        spriteSheetPath: 'assets/sprites/Chara01.png',
        front: 4,
        left: 20,
        right: 36,
        back: 52
    },
    {
        spriteNum: 2,
        spriteSheet: 'sprites1',
        spriteSheetPath: 'assets/sprites/Chara01.png',
        front: 8,
        left: 24,
        right: 40,
        back: 56
    },
    {
        spriteNum: 3,
        spriteSheet: 'sprites1',
        spriteSheetPath: 'assets/sprites/Chara01.png',
        front: 12,
        left: 28,
        right: 44,
        back: 60
    },
    {
        spriteNum: 4,
        spriteSheet: 'sprites2',
        spriteSheetPath: 'assets/sprites/Chara02.png',
        front: 0,
        left: 32,
        right: 16,
        back: 48
    },
    {
        spriteNum: 5,
        spriteSheet: 'sprites2',
        spriteSheetPath: 'assets/sprites/Chara02.png',
        front: 4,
        left: 36,
        right: 20,
        back: 52
    },
    {
        spriteNum: 6,
        spriteSheet: 'sprites2',
        spriteSheetPath: 'assets/sprites/Chara02.png',
        front: 8,
        left: 40,
        right: 24,
        back: 56
    },
    {
        spriteNum: 7,
        spriteSheet: 'sprites2',
        spriteSheetPath: 'assets/sprites/Chara02.png',
        front: 12,
        left: 44,
        right: 28,
        back: 60
    },
    {
        spriteNum: 8,
        spriteSheet: 'sprites3',
        spriteSheetPath: 'assets/sprites/Chara03.png',
        front: 0,
        left: 32,
        right: 16,
        back: 48
    },
    {
        spriteNum: 9,
        spriteSheet: 'sprites3',
        spriteSheetPath: 'assets/sprites/Chara03.png',
        front: 4,
        left: 36,
        right: 20,
        back: 52
    },
    {
        spriteNum: 10,
        spriteSheet: 'sprites3',
        spriteSheetPath: 'assets/sprites/Chara03.png',
        front: 8,
        left: 40,
        right: 24,
        back: 56
    }
  ];



function playGame() {
    playerName = nameInput.value;
    if (playerName.length < 1) {
        initialScreenMessage.innerText = 'Please enter your name';
        return;
    }
    socket.emit('playGame', playerName);
    initialScreenMessage.innerText = 'Joining server...';
}

function handleServerFull(serverName) {
    initialScreenMessage.innerText = `${serverName} is full`;
}

function handleInit() {

    initialScreen.style.display = 'none';
    gameScreen.style.display = 'flex';

    playerSprite = getUserSprite(playerName);

}


// select a sprite for player based on hash of their username
export function getUserSprite (username) {
    // Compute hash code
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate sprite number
    const index = Math.abs(hash % SPRITES.length);
    return SPRITES[index];
}


const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game-container",
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 }
        }
    },
    dom: {
        createContainer: true
    },
    scene: [ SceneMainBuilding, SceneWorld ]
};

const game = new Phaser.Game(config);
