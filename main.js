// Bio-Force: Parasite Dawn - Main Entry Point

// Asset Loader stub (for future sprite replacement)
const AssetLoader = {
    images: {},
    
    load(name, src) {
        const img = new Image();
        img.src = src;
        this.images[name] = img;
        return img;
    },
    
    loadAll(assets) {
        for (const [name, src] of Object.entries(assets)) {
            this.load(name, src);
        }
    },
    
    get(name) {
        return this.images[name] || null;
    },
    
    isLoaded(name) {
        const img = this.images[name];
        return img && img.complete && img.naturalWidth > 0;
    },
    
    allLoaded() {
        return Object.values(this.images).every(img => img.complete && img.naturalWidth > 0);
    }
};

// Example usage for future sprite loading:
// AssetLoader.loadAll({
//     player: 'sprites/player.png',
//     pod: 'sprites/pod.png',
//     enemy_drone: 'sprites/enemy_drone.png',
//     boss: 'sprites/boss.png'
// });

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});

// Log version info
console.log('Bio-Force: Parasite Dawn v1.0');
console.log('Controls: Arrow Keys/WASD to move, Z/Space to fire, X for Force Pod');
