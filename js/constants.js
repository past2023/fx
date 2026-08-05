export const STATES=Object.freeze({MENU:'MENU',PLAYING:'PLAYING',BOSS:'BOSS',VICTORY:'VICTORY',GAME_OVER:'GAME_OVER'});
export const W=1280,H=720,LEVEL_LENGTH=6000;
export const COLORS={bg:'#0a0a1a',cyan:'#49f5ff',blue:'#4c80ff',green:'#62f59b',red:'#ff547d',yellow:'#ffd84d',purple:'#b987ff',white:'#e9fbff'};
export const SHIPS={fighter:{name:'FIGHTER',speed:300,hp:100,cooldown:.15,color:COLORS.blue},interceptor:{name:'INTERCEPTOR',speed:450,hp:70,cooldown:.12,color:COLORS.cyan},tank:{name:'TANK',speed:180,hp:150,cooldown:.25,color:COLORS.green}};
export const WEAPONS={blaster:{name:'BLASTER',cooldown:1,damage:25},spread:{name:'SPREAD',cooldown:1.2,damage:18},laser:{name:'LASER',cooldown:0,damage:8}};
export const ENEMIES={scout:{hp:30,speed:150,points:100,color:'#ff4c6e',size:18},tank:{hp:80,speed:80,points:200,color:'#9aa3b7',size:30},drone:{hp:20,speed:250,points:150,color:'#ffd34e',size:14},heavy:{hp:200,speed:60,points:500,color:'#b77aff',size:42}};
export const WAVES=[{at:500,type:'scout',count:5,delay:.14},{at:1200,type:'tank',count:3,delay:.5},{at:2000,type:'drone',count:8,delay:.08},{at:2800,mixed:[['tank',2],['scout',4]],delay:.32},{at:3600,type:'scout',count:10,delay:.09},{at:4400,type:'heavy',count:1,delay:0}];
export const TUNING={scrollSpeed:80,farSpeed:30,nearSpeed:80,maxEnemies:30,maxBullets:100,maxParticles:300,playerInvuln:1.5,bossHp:1500};