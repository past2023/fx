import {loadAssets} from './assetLoader.js';import Game from './game.js';
const canvas=document.getElementById('game');
(async()=>{try{const assets=await loadAssets();const game=new Game(canvas,assets);game.start();window.nebulaFall=game}catch(error){console.error('[NEBULA//FALL] failed to boot',error)}})();