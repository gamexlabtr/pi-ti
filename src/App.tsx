import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/* ===========================
   BLOGGER TAM EKRAN - ZORLA GİZLE
   =========================== */
const BLOGGER_FORCE_CSS = `
/* GameXLabTR Tavla – Blogger full override */
#navbar-iframe, .navbar, #Attribution1, .attribution,
#sidebar-wrapper, .sidebar, #sidebar, .sidebar-container,
#header-wrapper, .header, #footer-wrapper, footer, .footer,
.post-footer, .blog-pager, .post-feeds, .feed-links,
#blog-pager, .widget, .PopularPosts, .FollowByEmail,
#comments, .comments, .bg-ads, .ads, iframe[src*="blogger"],
header, nav, aside, .tabs, .tab-wrapper, .cap-top, .cap-bottom {
  display: none !important; visibility: hidden !important; height:0 !important; overflow:hidden !important;
}
html, body {
  margin:0 !important; padding:0 !important; overflow:hidden !important;
  background:#0a0e17 !important; height:100% !important; width:100% !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif !important;
}
#root, #app, .tavla-root {
  position: fixed !important; inset:0 !important; z-index:10000 !important;
  width:100vw !important; height:100dvh !important; background:#0a0e17 !important;
  overflow:hidden !important;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button, input { font-family: inherit; }
@media (min-width:1920px){ html{ font-size:18px; } }
@media (pointer:coarse){ button{ min-height:46px; } }
::-webkit-scrollbar{ width:8px; height:8px; } ::-webkit-scrollbar-thumb{ background:#27324a; border-radius:6px; }
`;

/* ===========================
   FIREBASE – HATA KORUMALI HİBRİT
   =========================== */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect, get, remove, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDoi750NzXB5KWXU8oDWr4scJZ0mf_2mWU",
  authDomain: "gmxlabtr.firebaseapp.com",
  databaseURL: "https://gmxlabtr-default-rtdb.firebaseio.com",
  projectId: "gmxlabtr",
  storageBucket: "gmxlabtr.firebasestorage.app",
  messagingSenderId: "779740910958",
  appId: "1:779740910958:web:45afeef855ec008a025d7f",
  measurementId: "G-SM7PRHBWQL"
};
let _db: Database | null = null;
function getDbSafe(): Database | null {
  if(_db) return _db;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    _db = getDatabase(app);
    return _db;
  } catch(e){
    console.warn('[TAVLA] Firebase offline', e);
    return null;
  }
}
async function fbSafe<T=any>(fn:()=>any, fallback:T|null=null):Promise<T|null>{
  try{ const r=fn(); return r && typeof r.then==='function' ? await r : r; } catch(e){ console.warn('[TAVLA fb]',e); return fallback; }
}

/* ===========================
   WEB AUDIO – DOSYASIZ AHŞAP SESLER
   =========================== */
let audioCtx: AudioContext | null = null;
function ac(): AudioContext | null {
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }catch{ return null; }
}
// Zar tıkırtısı – tahta üstünde seken 2 zar
function playDiceRoll(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  for(let i=0;i<7;i++){
    const tt = t0 + i*0.075 + Math.random()*0.018;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value= 820 + Math.random()*560; f.Q.value=2.1;
    o.type='square';
    o.frequency.setValueAtTime(240 + Math.random()*340, tt);
    o.frequency.exponentialRampToValueAtTime(130+Math.random()*90, tt+0.07);
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.linearRampToValueAtTime(0.16, tt+0.008);
    g.gain.exponentialRampToValueAtTime(0.001, tt+0.065);
    o.connect(f); f.connect(g); g.connect(ctx.destination);
    o.start(tt); o.stop(tt+0.08);
  }
  // wood thud base
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.frequency.setValueAtTime(92, t0+0.05); o2.frequency.exponentialRampToValueAtTime(54, t0+0.24);
  g2.gain.setValueAtTime(0.22, t0+0.05); g2.gain.exponentialRampToValueAtTime(0.001, t0+0.27);
  o2.connect(g2); g2.connect(ctx.destination); o2.start(t0+0.05); o2.stop(t0+0.3);
}
// pul – ahşap tok
function playCheckerHit(vol=0.5){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(310, t0);
  o.frequency.exponentialRampToValueAtTime(165, t0+0.11);
  g.gain.setValueAtTime(vol*0.34, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0+0.14);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0+0.16);
  // click
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.type='sine'; o2.frequency.value=1120;
  g2.gain.setValueAtTime(vol*0.09, t0);
  g2.gain.exponentialRampToValueAtTime(0.001, t0+0.035);
  o2.connect(g2); g2.connect(ctx.destination);
  o2.start(t0); o2.stop(t0+0.045);
}
// oyun bitiş melodisi – ney/vurmalı tadında kısa
function playWinMelody(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const seq = [523,659,784,1046, 784, 880, 1046];
  seq.forEach((freq,i)=>{
    const tt = t0 + i*0.148;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = i%2===0 ? 'triangle':'sine';
    o.frequency.setValueAtTime(freq, tt);
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.linearRampToValueAtTime(0.26, tt+0.018);
    g.gain.exponentialRampToValueAtTime(0.001, tt+0.135);
    o.connect(g); g.connect(ctx.destination);
    o.start(tt); o.stop(tt+0.15);
  });
}

/* ===========================
   TAVLA OYUN MANTIĞI
   =========================== */
type PlayerColor = 'w'|'b';
type PointState = { owner: PlayerColor | null; count: number };
type TavlaState = {
  points: PointState[];
  barW: number;
  barB: number;
  offW: number;
  offB: number;
  turn: PlayerColor;
  dice: [number,number];
  moves: number[];
  rolled: boolean;
  winner: PlayerColor | null;
};

function initialTavlaState(): TavlaState {
  const points: PointState[] = Array.from({length:24}, ()=>({ owner:null, count:0 }));
  // Klasik dizilim
  // Beyaz (w): 24(2),13(5),8(3),6(5)
  points[23] = { owner:'w', count:2 };
  points[12] = { owner:'w', count:5 };
  points[7] = { owner:'w', count:3 };
  points[5] = { owner:'w', count:5 };
  // Siyah (b): 1(2),12(5),17(3),19(5)
  points[0] = { owner:'b', count:2 };
  points[11] = { owner:'b', count:5 };
  points[16] = { owner:'b', count:3 };
  points[18] = { owner:'b', count:5 };
  return {
    points,
    barW:0, barB:0,
    offW:0, offB:0,
    turn:'w',
    dice:[1,1],
    moves:[],
    rolled:false,
    winner:null
  };
}

type Move = { from: number | 'barW' | 'barB'; to: number | 'offW' | 'offB'; die: number };

function cloneState(s:TavlaState):TavlaState {
  return {
    points: s.points.map(p=>({...p})),
    barW:s.barW, barB:s.barB, offW:s.offW, offB:s.offB,
    turn:s.turn, dice:[...s.dice] as [number,number],
    moves:[...s.moves],
    rolled:s.rolled,
    winner:s.winner
  };
}

function allInHome(state:TavlaState, player:PlayerColor):boolean{
  if(player==='w' && state.barW>0) return false;
  if(player==='b' && state.barB>0) return false;
  for(let i=0;i<24;i++){
    const pt = state.points[i];
    if(pt.owner===player && pt.count>0){
      if(player==='w' && i>5) return false;
      if(player==='b' && i<18) return false;
    }
  }
  return true;
}

function pointOpen(state:TavlaState, idx:number, player:PlayerColor): {open:boolean; hit:boolean}{
  if(idx<0 || idx>23) return { open:false, hit:false };
  const pt = state.points[idx];
  if(!pt.owner || pt.owner===player) return { open:true, hit:false };
  if(pt.count===1) return { open:true, hit:true };
  return { open:false, hit:false };
}

function getLegalMoves(state:TavlaState): Move[] {
  if(state.winner) return [];
  if(!state.rolled || state.moves.length===0) return [];
  const player = state.turn;
  const moves:Move[] = [];
  const usedDice = new Set<number>();

  const tryDie = (die:number)=>{
    if(!state.moves.includes(die)) return;
    if(usedDice.has(die) && state.moves.filter(d=>d===die).length <= [...usedDice].filter(d=>d===die).length) {
      // already used enough times – still allow duplicates via loop below
    }
    // bar entry first
    if(player==='w' && state.barW>0){
      const target = 24 - die; // 1..6 => 23..18
      if(target>=18 && target<=23){
        const {open} = pointOpen(state, target, player);
        if(open) moves.push({ from:'barW', to:target, die });
      }
      return; // must enter, cannot move other checkers
    }
    if(player==='b' && state.barB>0){
      const target = die-1;
      if(target>=0 && target<=5){
        const {open} = pointOpen(state, target, player);
        if(open) moves.push({ from:'barB', to:target, die });
      }
      return;
    }
    // normal moves
    for(let s=0;s<24;s++){
      const pt = state.points[s];
      if(pt.owner!==player || pt.count===0) continue;
      const target = player==='w' ? s - die : s + die;
      if(target>=0 && target<24){
        const {open} = pointOpen(state, target, player);
        if(open) moves.push({ from:s, to:target, die });
      } else {
        // bear off
        if(allInHome(state, player)){
          const distance = player==='w' ? s+1 : 24 - s;
          if(die === distance){
            moves.push({ from:s, to: player==='w' ? 'offW':'offB', die });
          } else if(die > distance){
            // check if no checker behind
            let blocked = false;
            if(player==='w'){
              for(let k=s+1;k<=5;k++){ const p=state.points[k]; if(p.owner===player && p.count>0){ blocked=true; break; } }
            } else {
              for(let k=18;k<s;k++){ const p=state.points[k]; if(p.owner===player && p.count>0){ blocked=true; break; } }
            }
            if(!blocked) moves.push({ from:s, to: player==='w' ? 'offW':'offB', die });
          }
        }
      }
    }
  };

  // unique dice values present
  [...new Set(state.moves)].forEach(d=> tryDie(d));
  // de-duplicate identical from/to/die
  const seen = new Set<string>();
  return moves.filter(m=>{
    const key = `${m.from}-${m.to}-${m.die}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function applyMove(state:TavlaState, mv:Move): TavlaState | null {
  const ns = cloneState(state);
  const player = ns.turn;
  // remove die
  const idx = ns.moves.indexOf(mv.die);
  if(idx===-1) return null;
  ns.moves.splice(idx,1);

  // remove checker from source
  if(mv.from==='barW'){
    if(ns.barW<=0) return null;
    ns.barW--;
  } else if(mv.from==='barB'){
    if(ns.barB<=0) return null;
    ns.barB--;
  } else {
    const sp = ns.points[mv.from];
    if(sp.owner!==player || sp.count<=0) return null;
    sp.count--;
    if(sp.count===0) sp.owner=null;
  }

  // place to target
  if(mv.to==='offW'){
    ns.offW++; 
  } else if(mv.to==='offB'){
    ns.offB++;
  } else {
    const tp = ns.points[mv.to as number];
    if(tp.owner && tp.owner !== player){
      // hit
      if(tp.count!==1) return null;
      // send opponent to bar
      if(player==='w'){ ns.barB++; } else { ns.barW++; }
      tp.owner = player;
      tp.count = 1;
    } else {
      tp.owner = player;
      tp.count = (tp.count||0)+1;
    }
  }

  // win check
  if(ns.offW >= 15){ ns.winner='w'; ns.moves=[]; }
  if(ns.offB >= 15){ ns.winner='b'; ns.moves=[]; }

  // turn switch if no moves left
  if(ns.moves.length===0 && !ns.winner){
    ns.turn = player==='w' ? 'b' : 'w';
    ns.rolled = false;
    ns.dice = [1,1];
  }
  return ns;
}

/* ===========================
   3D WORLD – TAVLA
   =========================== */
class TavlaWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  boardGroup = new THREE.Group();
  pointMeshes: THREE.Mesh[] = [];
  checkerMeshes: THREE.Mesh[] = [];
  diceMeshes: THREE.Mesh[] = [];

  // checker bodies for subtle physics tap
  world: CANNON.World;
  checkerBodies: CANNON.Body[] = [];

  // interaction
  dragChecker: { id:number; start:{x:number;z:number}; mesh:THREE.Mesh } | null = null;
  hoverPoint: number | null = null;
  selectedPoint: number | 'barW' | 'barB' | null = null;

  // camera orbit
  isOrbit=false; orbitSX=0; orbitSY=0; orbitTheta0=Math.PI*0.18; orbitPhi0=1.18;
  camTheta=Math.PI*0.18; camPhi=1.18; camRadius=7.8;
  camTarget = new THREE.Vector3(0,0,0);

  // callbacks
  onPointClick?: (point:number|'barW'|'barB'|null)=>void;
  onCheckerDrop?: (from:number|'barW'|'barB', to:number|'offW'|'offB'|null)=>void;
  canInteractRef = { current:true };

  private animId=0;
  private resizeObs?: ResizeObserver;

  constructor(canvas: HTMLCanvasElement){
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101b);
    this.scene.fog = new THREE.Fog(0x0a101b, 12, 22);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    this.updateCamera();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // lights
    this.scene.add(new THREE.HemisphereLight(0xfff3d6, 0x16203a, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 1.12);
    key.position.set(4.5,7.5,3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048,2048);
    // @ts-ignore
    key.shadow.camera.left=-6; key.shadow.camera.right=6; key.shadow.camera.top=5; key.shadow.camera.bottom=-5;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x99c9ff, 0.28);
    fill.position.set(-5,3,-4);
    this.scene.add(fill);

    // board
    this.buildBoard();
    this.scene.add(this.boardGroup);

    // physics (light)
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
    this.world.defaultContactMaterial.restitution = 0.14;

    // dice
    this.buildDice();

    this.bindEvents();
    this.setupResize();
    this.animate();
  }

  private buildBoard(){
    const g = this.boardGroup;
    // base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(9.2,0.28,6.9),
      new THREE.MeshStandardMaterial({ color:0x5a3720, roughness:0.72, metalness:0.04 })
    );
    base.position.y = -0.14;
    base.receiveShadow = true;
    g.add(base);
    // inner felt
    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(8.4,0.02,6.1),
      new THREE.MeshStandardMaterial({ color:0x1a5b3a, roughness:0.92, metalness:0 })
    );
    felt.position.y = 0.011;
    felt.receiveShadow = true;
    g.add(felt);
    // outer frame
    const frameMat = new THREE.MeshStandardMaterial({ color:0x3b2316, roughness:0.55 });
    const fw = 0.36;
    const top = new THREE.Mesh(new THREE.BoxGeometry(9.2,0.38, fw), frameMat);
    top.position.set(0,0.09, 3.45- fw/2);
    top.castShadow = true;
    g.add(top);
    const bottom = top.clone(); bottom.position.z = -3.45+fw/2; g.add(bottom);
    const left = new THREE.Mesh(new THREE.BoxGeometry(fw,0.38,6.9), frameMat); left.position.set(-4.6+fw/2,0.09,0); g.add(left);
    const right = left.clone(); right.position.x = 4.6 - fw/2; g.add(right);
    // middle bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,6.1), new THREE.MeshStandardMaterial({ color:0x2b1810, roughness:0.6 }));
    bar.position.y = 0.20;
    bar.castShadow = true;
    g.add(bar);

    // points (24 triangles)
    const pointW = 0.56;
    const pointDepth = 2.35;
    const makeTri = (sign:number)=>{
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        -pointW/2, 0.012, 0,
         pointW/2, 0.012, 0,
         0, 0.012, sign*pointDepth
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts,3));
      geo.computeVertexNormals();
      return geo;
    };
    const matA = new THREE.MeshStandardMaterial({ color:0xe8cfa7, roughness:0.72 });
    const matB = new THREE.MeshStandardMaterial({ color:0x8b3a2a, roughness:0.68 });

    // x positions right to left
    const xs = [3.45,2.83,2.21,1.59,0.97,0.35, -0.35,-0.97,-1.59,-2.21,-2.83,-3.45];
    // bottom row points 1-12 (indices 0-11) at z = +2.65 pointing north (-)
    for(let i=0;i<12;i++){
      const x = xs[i];
      const mesh = new THREE.Mesh(makeTri(-1), (i%2===0)?matA:matB);
      mesh.position.set(x, 0, 2.78);
      // @ts-ignore
      mesh.userData.pointIndex = i; // 0 = point1
      mesh.userData.side = 'bottom';
      this.pointMeshes[i] = mesh;
      g.add(mesh);
    }
    // top row points 13-24 (indices 12-23) at z = -2.78 pointing south (+)
    for(let i=0;i<12;i++){
      const boardIdx = 12+i;
      const x = xs[11-i]; // reverse: point13 leftmost
      const mesh = new THREE.Mesh(makeTri(1), (i%2===0)?matA:matB);
      mesh.position.set(x, 0, -2.78);
      // @ts-ignore
      mesh.userData.pointIndex = boardIdx;
      mesh.userData.side = 'top';
      this.pointMeshes[boardIdx] = mesh;
      g.add(mesh);
    }
    // point number labels (simple sprites)
    const makeLabel = (text:string, x:number, z:number)=>{
      const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=64;
      const c = canvas.getContext('2d')!;
      c.clearRect(0,0,128,64);
      c.fillStyle='rgba(255,244,220,0.88)';
      c.font='bold 34px Inter, Arial';
      c.textAlign='center'; c.textBaseline='middle';
      c.fillText(text,64,34);
      const tex = new THREE.CanvasTexture(canvas);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true }));
      spr.position.set(x,0.025,z);
      spr.scale.set(0.52,0.26,1);
      return spr;
    };
    // bottom numbers 1..12 left->right reversed? we already placed 1 at right.
    for(let i=0;i<12;i++){
      const ptIdx = i; // 0=point1
      const mesh = this.pointMeshes[ptIdx];
      g.add(makeLabel(String(ptIdx+1), mesh.position.x, mesh.position.z + 0.34));
    }
    for(let i=12;i<24;i++){
      const mesh = this.pointMeshes[i];
      g.add(makeLabel(String(i+1), mesh.position.x, mesh.position.z - 0.34));
    }

    // bearing off trays (visual)
    const trayW = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.06,2.7), new THREE.MeshStandardMaterial({ color:0xf1ece4, roughness:0.75 }));
    trayW.position.set(4.95,0.03,1.05); g.add(trayW);
    const trayB = trayW.clone(); // @ts-ignore
    trayB.material = trayB.material.clone(); // @ts-ignore
    trayB.material.color.setHex(0x252834);
    trayB.position.z = -1.05; g.add(trayB);
  }

  private buildDice(){
    const makeFaceTexture = (n:number)=>{
      const s=128; const cvs=document.createElement('canvas'); cvs.width=s; cvs.height=s;
      const cx=cvs.getContext('2d')!;
      cx.fillStyle='#f7f3ea'; cx.fillRect(0,0,s,s);
      cx.fillStyle='#1b1b1b';
      const dot=(x:number,y:number)=>{ cx.beginPath(); cx.arc(x*s,y*s,s*0.11,0,Math.PI*2); cx.fill(); };
      const p=[[0.5,0.5],[0.25,0.25],[0.75,0.75],[0.25,0.75],[0.75,0.25],[0.25,0.5],[0.75,0.5]];
      const map:any = {1:[0],2:[1,2],3:[0,1,2],4:[1,2,3,4],5:[0,1,2,3,4],6:[1,2,3,4,5,6]};
      (map[n]||[]).forEach((i:number)=>dot(p[i][0], p[i][1]));
      return new THREE.CanvasTexture(cvs);
    };
    const mats1 = [1,2,3,4,5,6].map(n=> new THREE.MeshStandardMaterial({ map: makeFaceTexture(n), roughness:0.45 }));
    const mats2 = [1,2,3,4,5,6].map(n=> new THREE.MeshStandardMaterial({ map: makeFaceTexture(n), roughness:0.45 }));
    // dice cube – map faces order: +x, -x, +y, -y, +z, -z . We'll just assign.
    const geo = new THREE.BoxGeometry(0.28,0.28,0.28);
    const d1 = new THREE.Mesh(geo, mats1);
    d1.castShadow=true; d1.position.set(-0.55,1.6,0); d1.visible=false;
    const d2 = new THREE.Mesh(geo, mats2);
    d2.castShadow=true; d2.position.set(0.55,1.6,0); d2.visible=false;
    this.scene.add(d1,d2);
    this.diceMeshes = [d1,d2];
  }

  // point -> world XZ
  pointXZ(idx:number): {x:number,z:number}{
    const m = this.pointMeshes[idx];
    if(m) return { x:m.position.x, z:m.position.z + (idx<12 ? -0.95 : 0.95) * 0.72 }; // center of triangle
    return {x:0,z:0};
  }

  updateBoard(state:TavlaState, highlights:number[] = []){
    // remove old checkers
    this.checkerMeshes.forEach(m=> this.boardGroup.remove(m));
    this.checkerMeshes = [];
    this.checkerBodies.forEach(b=> this.world.removeBody(b));
    this.checkerBodies = [];

    const placeStack = (idx:number, owner:PlayerColor, count:number)=>{
      const {x,z} = this.pointXZ(idx);
      const dir = idx < 12 ? -1 : 1; // bottom moves north, top moves south
      const baseZ = z;
      for(let i=0;i<count;i++){
        const y = 0.038 + i*0.074;
        const zz = baseZ + dir * Math.min(i,5) * 0.012; // slight spread if >5
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.235,0.235,0.068,36),
          new THREE.MeshStandardMaterial({ color: owner==='w' ? 0xf4efe6 : 0x23252f, roughness: owner==='w'?0.52:0.44, metalness: owner==='w'?0.02:0.06 })
        );
        mesh.position.set(x, y, zz);
        mesh.castShadow = true; mesh.receiveShadow = true;
        // @ts-ignore
        mesh.userData = { pointIndex: idx, checkerOwner: owner, stackIndex:i };
        this.boardGroup.add(mesh);
        this.checkerMeshes.push(mesh);

        // light physics body for tap
        const body = new CANNON.Body({ mass:0.12, shape: new CANNON.Cylinder(0.235,0.235,0.068,20), position: new CANNON.Vec3(x,y,zz) });
        // @ts-ignore cannon-es cylinder is Y axis – rotate
        body.quaternion.setFromEuler(Math.PI/2,0,0);
        this.world.addBody(body);
        this.checkerBodies.push(body);
      }
    };

    state.points.forEach((pt, idx)=>{
      if(pt.owner && pt.count>0) placeStack(idx, pt.owner, Math.min(pt.count, 8)); // cap visual
    });

    // bar
    const barBaseY = 0.038;
    for(let i=0;i<state.barW;i++){
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.235,0.235,0.068,36),
        new THREE.MeshStandardMaterial({ color:0xf4efe6, roughness:0.52 })
      );
      mesh.position.set(0.26, barBaseY + i*0.074, 0.18 - i*0.012);
      mesh.castShadow=true;
      // @ts-ignore
      mesh.userData = { pointIndex:'barW', checkerOwner:'w' };
      this.boardGroup.add(mesh); this.checkerMeshes.push(mesh);
    }
    for(let i=0;i<state.barB;i++){
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.235,0.235,0.068,36),
        new THREE.MeshStandardMaterial({ color:0x23252f, roughness:0.44 })
      );
      mesh.position.set(-0.26, barBaseY + i*0.074, -0.18 + i*0.012);
      mesh.castShadow=true;
      // @ts-ignore
      mesh.userData = { pointIndex:'barB', checkerOwner:'b' };
      this.boardGroup.add(mesh); this.checkerMeshes.push(mesh);
    }

    // off trays
    for(let i=0;i<state.offW;i++){
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21,0.21,0.058,32),
        new THREE.MeshStandardMaterial({ color:0xf4efe6, roughness:0.5 })
      );
      m.position.set(4.95, 0.065 + (i%10)*0.061, 1.05 - Math.floor(i/10)*0.5);
      this.scene.add(m); this.checkerMeshes.push(m);
    }
    for(let i=0;i<state.offB;i++){
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21,0.21,0.058,32),
        new THREE.MeshStandardMaterial({ color:0x23252f, roughness:0.44 })
      );
      m.position.set(4.95, 0.065 + (i%10)*0.061, -1.05 + Math.floor(i/10)*0.5);
      this.scene.add(m); this.checkerMeshes.push(m);
    }

    // highlight legal target points
    this.pointMeshes.forEach((pm, idx)=>{
      // @ts-ignore
      const mat = pm.material as THREE.MeshStandardMaterial;
      if(highlights.includes(idx)){
        mat.emissive.setHex(0x2fd07a);
        mat.emissiveIntensity = 0.31;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  async rollDiceVisual(_d1:number,_d2:number): Promise<void>{
    const [m1,m2] = this.diceMeshes;
    void _d1; void _d2;
    m1.visible = true; m2.visible = true;
    m1.position.set(-0.6, 2.1, 0.15);
    m2.position.set(0.6, 2.25, -0.12);
    playDiceRoll();
    const start = performance.now();
    const dur = 980;
    return new Promise(res=>{
      const tick = ()=>{
        const t = Math.min(1, (performance.now()-start)/dur);
        m1.rotation.x += 0.42; m1.rotation.z += 0.31;
        m2.rotation.x -= 0.37; m2.rotation.y += 0.44;
        m1.position.y = 0.34 + Math.abs(Math.sin(t*Math.PI*4.5)) * (1.0*(1-t));
        m2.position.y = 0.34 + Math.abs(Math.cos(t*Math.PI*4.2)) * (1.0*(1-t));
        if(t<1) requestAnimationFrame(tick);
        else {
          // snap to face – approximate
          m1.rotation.set(0,0,0);
          m2.rotation.set(0,0,0);
          m1.position.y = 0.165;
          m2.position.y = 0.165;
          res();
        }
      };
      tick();
    });
  }
  hideDice(){ this.diceMeshes.forEach(d=> d.visible=false); }

  /* interaction */
  private bindEvents(){
    const c = this.renderer.domElement;
    const getMouse = (clientX:number, clientY:number)=>{
      const r=c.getBoundingClientRect();
      this.mouse.x = ((clientX - r.left)/r.width)*2-1;
      this.mouse.y = -((clientY - r.top)/r.height)*2+1;
    };
    c.addEventListener('mousemove', e=>{
      getMouse(e.clientX,e.clientY);
      if(this.dragChecker){
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0,1,0), -0.05);
        const hit = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, hit);
        this.dragChecker.mesh.position.x = hit.x;
        this.dragChecker.mesh.position.z = hit.z;
        return;
      }
      if(this.isOrbit){
        const dx = e.clientX - this.orbitSX;
        const dy = e.clientY - this.orbitSY;
        this.camTheta = this.orbitTheta0 - dx*0.0049;
        this.camPhi = Math.max(0.45, Math.min(1.48, this.orbitPhi0 + dy*0.0031));
        this.updateCamera();
        return;
      }
      // hover point
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.pointMeshes, false);
      const hp = hits[0]?.object.userData.pointIndex ?? null;
      this.hoverPoint = typeof hp==='number' ? hp : null;
      c.style.cursor = hp!==null ? 'pointer' : 'grab';
    });
    c.addEventListener('mousedown', e=>{
      getMouse(e.clientX,e.clientY);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      // try checker pick
      const chits = this.raycaster.intersectObjects(this.checkerMeshes, false);
      if(chits[0] && this.canInteractRef.current){
        const mesh = chits[0].object as THREE.Mesh;
        const pi = mesh.userData.pointIndex;
        if(pi!==undefined){
          this.dragChecker = { id: Date.now(), start:{ x: mesh.position.x, z: mesh.position.z }, mesh };
          // select point
          if(typeof pi === 'number' || pi==='barW' || pi==='barB'){
            this.selectedPoint = pi as any;
            this.onPointClick?.(this.selectedPoint);
          }
          c.style.cursor='grabbing';
          e.preventDefault();
          return;
        }
      }
      // try point click
      const hits = this.raycaster.intersectObjects(this.pointMeshes, false);
      if(hits[0]){
        const pi = hits[0].object.userData.pointIndex as number;
        this.selectedPoint = pi;
        this.onPointClick?.(pi);
        return;
      }
      // orbit
      this.isOrbit = true;
      this.orbitSX = e.clientX; this.orbitSY = e.clientY;
      this.orbitTheta0 = this.camTheta; this.orbitPhi0 = this.camPhi;
      c.style.cursor='grabbing';
    });
    window.addEventListener('mouseup', ()=>{
      if(this.dragChecker){
        // find nearest point
        const mesh = this.dragChecker.mesh;
        let nearest:number|null = null; let best=0.82;
        this.pointMeshes.forEach((pm,idx)=>{
          const dx = mesh.position.x - pm.position.x;
          const dz = mesh.position.z - pm.position.z;
          const d = Math.sqrt(dx*dx+dz*dz);
          if(d < best){ best=d; nearest=idx; }
        });
        // also check bearing off zones
        let target: number | 'offW' | 'offB' | null = nearest;
        if(mesh.position.x > 4.4) {
          // bearing tray – guess by turn? we'll let onCheckerDrop decide
          target = null; // will be resolved by app
        }
        if(this.dragChecker && this.selectedPoint!==null){
          this.onCheckerDrop?.(this.selectedPoint, target as any);
        }
        // snap back visually (state update will re-render)
        mesh.position.x = this.dragChecker.start.x;
        mesh.position.z = this.dragChecker.start.z;
      }
      this.dragChecker = null;
      this.isOrbit = false;
      c.style.cursor = this.hoverPoint!==null ? 'pointer' : 'grab';
    });
    c.addEventListener('wheel', e=>{
      e.preventDefault();
      this.camRadius = Math.max(4.8, Math.min(11.5, this.camRadius + e.deltaY*0.004));
      this.updateCamera();
    }, { passive:false });
    // touch
    c.addEventListener('touchstart', e=>{
      if(e.touches[0]){ const t=e.touches[0]; getMouse(t.clientX,t.clientY);
        const me = new MouseEvent('mousedown', { clientX:t.clientX, clientY:t.clientY, bubbles:true });
        c.dispatchEvent(me);
      }
    }, {passive:true});
    c.addEventListener('touchmove', e=>{
      if(e.touches[0]){ const t=e.touches[0]; getMouse(t.clientX,t.clientY);
        const me = new MouseEvent('mousemove', { clientX:t.clientX, clientY:t.clientY, bubbles:true });
        c.dispatchEvent(me);
      }
    }, {passive:true});
    c.addEventListener('touchend', ()=> window.dispatchEvent(new Event('mouseup')));
    c.addEventListener('contextmenu', e=> e.preventDefault());
  }

  private updateCamera(){
    const r=this.camRadius, theta=this.camTheta, phi=this.camPhi;
    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = 2.1 + r * Math.cos(phi) * 0.62;
    const z = r * Math.sin(phi) * Math.cos(theta);
    this.camera.position.set(x,y,z);
    this.camera.lookAt(this.camTarget);
  }

  private setupResize(){
    const canvas = this.renderer.domElement;
    const doResize = ()=>{
      const parent = canvas.parentElement;
      if(!parent) return;
      const w = parent.clientWidth || 640;
      const h = parent.clientHeight || 480;
      this.camera.aspect = w/h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w,h,false);
    };
    doResize();
    try{
      this.resizeObs = new ResizeObserver(doResize);
      if(canvas.parentElement) this.resizeObs.observe(canvas.parentElement);
    }catch{}
    window.addEventListener('resize', doResize);
    window.addEventListener('orientationchange', ()=> setTimeout(doResize, 350));
  }

  private animate = ()=>{
    this.animId = requestAnimationFrame(this.animate);
    this.world.step(1/60);
    // sync checker bodies to meshes (subtle)
    for(let i=0;i< Math.min(this.checkerBodies.length, this.checkerMeshes.length); i++){
      const b = this.checkerBodies[i]; const m = this.checkerMeshes[i];
      if(!b || !m) continue;
      // light follow
      // @ts-ignore
      m.position.x += (b.position.x - m.position.x)*0.16;
      // @ts-ignore
      m.position.z += (b.position.z - m.position.z)*0.16;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose(){
    cancelAnimationFrame(this.animId);
    try{ this.resizeObs?.disconnect(); }catch{}
    this.renderer.dispose();
  }
}

/* ===========================
   BOT – basit akıllı
   =========================== */
function botChooseMove(state:TavlaState): Move | null {
  const legal = getLegalMoves(state);
  if(legal.length===0) return null;
  // score moves
  const scored = legal.map(m=>{
    let score = Math.random()*0.18;
    // hit?
    if(typeof m.to==='number'){
      const tp = state.points[m.to];
      if(tp.owner && tp.owner !== state.turn && tp.count===1) score += 2.8;
      // make a point / safe
      if(!tp.owner) score += 0.35;
      // advance
      const adv = state.turn==='w' ? (typeof m.from==='number' ? m.from - (m.to as number) : 0) : (typeof m.from==='number' ? (m.to as number) - m.from : 0);
      score += adv*0.04;
      // home building
      if(state.turn==='w' && (m.to as number) <=5) score += 0.5;
      if(state.turn==='b' && (m.to as number) >=18) score += 0.5;
    }
    // bear off
    if(m.to==='offW' || m.to==='offB') score += 3.2;
    // leaving blot?
    if(typeof m.from==='number'){
      const sp = state.points[m.from];
      if(sp.count===1) score -= 0.15; // leaving empty is ok, leaving blot elsewhere?
    }
    return {m, score};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].m;
}

/* ===========================
   GAME VIEW
   =========================== */
type GameMode = 'offline'|'online';
function TavlaGameView(props:{
  mode: GameMode;
  playerName: string;
  playerId: string;
  roomId: string | null;
  onExit: ()=>void;
  toast: (m:string)=>void;
}){
  const { mode, playerName, playerId, roomId, onExit, toast } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<TavlaWorld|null>(null);

  const isOffline = mode==='offline';

  // state
  const [state, setState] = useState<TavlaState>(()=> initialTavlaState());
  const stateRef = useRef(state);
  useEffect(()=>{ stateRef.current = state; }, [state]);

  const [selected, setSelected] = useState<number|'barW'|'barB'|null>(null);
  const [legalTargets, setLegalTargets] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [botThinking, setBotThinking] = useState(false);

  // online mirror
  const [onlinePlayers, setOnlinePlayers] = useState<{id:string; name:string; color:string; side:PlayerColor}[]>([]);
  const [chat, setChat] = useState<{id:string; name:string; text:string}[]>([]);
  const [chatInput, setChatInput] = useState('');

  const turnColor:PlayerColor = state.turn;
  // For simplicity in online, both clients can move when it's their color. We'll map playerId to side later.
  const mySide:PlayerColor = isOffline ? 'w' : (onlinePlayers.find(p=>p.id===playerId)?.side || 'w');
  const canPlay = isOffline ? (turnColor=== 'w') : (turnColor===mySide);

  // mount world once
  useEffect(()=>{
    if(!canvasRef.current) return;
    try{ ac()?.resume(); }catch{}
    const w = new TavlaWorld(canvasRef.current);
    worldRef.current = w;
    w.canInteractRef.current = true;
    w.onPointClick = (pt)=>{
      if(pt===null){ setSelected(null); setLegalTargets([]); return; }
      // if selected already and pt is legal target -> move
      if(selected!==null && selected!==pt){
        attemptMove(selected, pt);
        return;
      }
      // select source
      setSelected(pt);
      // compute legal targets highlights
      const st = stateRef.current;
      const moves = getLegalMoves(st).filter(m=> m.from===pt);
      const tgs:number[] = moves.map(m=> typeof m.to==='number' ? m.to : -1).filter(n=>n>=0);
      setLegalTargets(tgs);
    };
    w.onCheckerDrop = (from, to)=>{
      if(to===null){
        // try bear off if legal
        const st = stateRef.current;
        const lm = getLegalMoves(st).find(m=>m.from===from && (m.to==='offW'||m.to==='offB'));
        if(lm){ attemptMove(from, lm.to); return; }
        toast('Geçersiz hamle');
        return;
      }
      if(typeof to==='number'){
        attemptMove(from, to);
      }
    };
    return ()=> w.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // render board when state changes
  useEffect(()=>{
    worldRef.current?.updateBoard(state, legalTargets);
    if(worldRef.current){
      worldRef.current.canInteractRef.current = canPlay && !isRolling && !botThinking && !state.winner;
    }
  }, [state, legalTargets, canPlay, isRolling, botThinking]);

  // online listeners
  useEffect(()=>{
    if(isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    const unsub = onValue(ref(db, `tavlaRooms/${roomId}/state`), snap=>{
      const v = snap.val();
      if(v && v.points){
        setState(v as TavlaState);
      }
    });
    const unsubPlayers = onValue(ref(db, `tavlaRooms/${roomId}/players`), snap=>{
      const v = snap.val()||{};
      const list = Object.entries(v).map(([id, x]:any)=> ({ id, ...x }));
      setOnlinePlayers(list);
    });
    const unsubChat = onValue(ref(db, `tavlaRooms/${roomId}/chat`), snap=>{
      const v = snap.val()||{};
      const list = Object.entries(v).map(([id,x]:any)=>({ id, ...x })).sort((a:any,b:any)=>a.ts-b.ts);
      setChat(list.slice(-50));
    });
    return ()=>{ unsub(); unsubPlayers(); unsubChat(); };
  }, [isOffline, roomId]);

  const syncOnline = useCallback((ns:TavlaState)=>{
    if(isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    fbSafe(()=> set(ref(db, `tavlaRooms/${roomId}/state`), ns));
  }, [isOffline, roomId]);

  const attemptMove = useCallback((from:number|'barW'|'barB', to:number|'barW'|'barB'|'offW'|'offB')=>{
    const st = stateRef.current;
    if(st.winner) return;
    if(!st.rolled){ toast('Önce zar at!'); return; }
    // find matching legal move (choose die automatically)
    const legal = getLegalMoves(st).filter(m=> m.from===from && (m.to===to as any));
    if(legal.length===0){ toast('Yasal hamle değil'); return; }
    // prefer larger die if multiple
    legal.sort((a,b)=>b.die-a.die);
    const mv = legal[0];
    const ns = applyMove(st, mv);
    if(!ns){ toast('Hamle uygulanamadı'); return; }
    playCheckerHit(0.52);
    setState(ns);
    setSelected(null);
    setLegalTargets([]);
    if(!isOffline) syncOnline(ns);
    if(ns.winner){
      playWinMelody();
      toast(ns.winner==='w' ? 'Beyaz kazandı!' : 'Siyah kazandı!');
    }
  }, [isOffline, syncOnline, toast]);

  const rollDice = useCallback(async ()=>{
    const st = stateRef.current;
    if(st.rolled || st.winner) return;
    if(!canPlay){ toast('Sıra sende değil'); return; }
    setIsRolling(true);
    const d1 = 1+Math.floor(Math.random()*6);
    const d2 = 1+Math.floor(Math.random()*6);
    await worldRef.current?.rollDiceVisual(d1,d2);
    worldRef.current?.hideDice();
    const moves = d1===d2 ? [d1,d1,d1,d1] : [d1,d2];
    const ns: TavlaState = { ...cloneState(st), dice:[d1,d2], moves, rolled:true };
    // if no legal moves -> pass turn
    const lm = getLegalMoves(ns);
    if(lm.length===0){
      ns.moves = [];
      ns.turn = ns.turn==='w' ? 'b':'w';
      ns.rolled = false;
      toast('Hamle yok – pas');
    }
    setState(ns);
    if(!isOffline) syncOnline(ns);
    setIsRolling(false);
  }, [canPlay, isOffline, syncOnline, toast]);

  // bot turn
  useEffect(()=>{
    if(!isOffline) return;
    const st = state;
    if(st.winner) return;
    if(st.turn==='b'){
      if(!st.rolled){
        // bot auto roll
        const timer = setTimeout(()=>{ rollDice(); }, 620);
        return ()=> clearTimeout(timer);
      } else if(st.moves.length>0 && !botThinking){
        setBotThinking(true);
        const t = setTimeout(()=>{
          const mv = botChooseMove(st);
          if(mv){
            const ns = applyMove(st, mv);
            if(ns){
              playCheckerHit(0.45);
              setState(ns);
            }
          } else {
            // pass
            const ns = cloneState(st);
            ns.moves = [];
            ns.turn = 'w';
            ns.rolled = false;
            setState(ns);
          }
          setBotThinking(false);
        }, 1450 + Math.random()*650);
        return ()=> clearTimeout(t);
      }
    }
  }, [isOffline, state, botThinking, rollDice]);

  const resetGame = ()=>{
    const ns = initialTavlaState();
    setState(ns);
    setSelected(null);
    setLegalTargets([]);
    if(!isOffline) syncOnline(ns);
    toast('Yeni oyun');
  };

  const sendChat = ()=>{
    if(isOffline || !roomId || !chatInput.trim()) return;
    const db = getDbSafe(); if(!db) return;
    const id = 'c_'+Math.random().toString(36).slice(2,8);
    fbSafe(()=> set(ref(db, `tavlaRooms/${roomId}/chat/${id}`), { name: playerName, text: chatInput.slice(0,160), ts: Date.now(), pid: playerId }));
    setChatInput('');
  };

  const legalMoves = useMemo(()=> getLegalMoves(state), [state]);

  return (
    <div className="h-[100dvh] bg-[#0a0e17] text-zinc-100 flex flex-col overflow-hidden">
      {/* top */}
      <header className="h-[56px] sm:h-[60px] border-b border-white/[0.08] bg-[#101827]/92 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-[#231201] font-black flex items-center justify-center">T</div>
          <div className="hidden sm:block">
            <div className="font-[760] text-[14.5px] leading-tight tracking-tight">GameXLabTR Tavla</div>
            <div className="text-[10.5px] text-zinc-400 -mt-0.5">{isOffline ? 'Offline Bot • 3D • WebAudio' : 'Firebase Realtime • 3D'}</div>
          </div>
        </div>
        <div className="hidden md:block h-6 w-px bg-white/[0.09] mx-1" />
        <div className="text-[12px] sm:text-[13px] text-zinc-300 truncate">
          Sıra: <b className={turnColor==='w' ? 'text-amber-200':'text-sky-200'}>{turnColor==='w' ? 'Beyaz' : 'Siyah'}</b>
          {state.rolled && <span className="ml-2 text-zinc-400">Zar: {state.dice[0]}–{state.dice[1]} • Hamle: {state.moves.join(',')||'—'}</span>}
          {botThinking && <span className="ml-2 text-sky-300">Bot düşünüyor…</span>}
        </div>
        <div className="flex-1" />
        <div className="text-[11.5px] text-zinc-400 hidden lg:block">
          Açık: {state.offW}/15 • {state.offB}/15
        </div>
        <button onClick={onExit}
          className="text-[11.5px] sm:text-[12.5px] px-3 py-[7px] rounded-lg bg-white/[0.055] hover:bg-white/[0.1] border border-white/[0.1] active:scale-95">
          Çık
        </button>
      </header>

      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_430px]">
        {/* 3D */}
        <div className="relative bg-[#0b111d] min-h-[440px] lg:min-h-0 overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />
          {/* HUD */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex flex-wrap gap-[7px] text-[11.5px] sm:text-[12px] pointer-events-none">
            <div className="px-3 py-[7px] rounded-full bg-[#121b2b]/90 border border-white/[0.11] backdrop-blur pointer-events-auto">
              {state.winner ? <b className="text-emerald-300">Oyun bitti – {state.winner==='w'?'Beyaz':'Siyah'} kazandı</b>
                : state.rolled ? <>Hamle hakkın: <b>{state.moves.join(' • ')||'—'}</b></>
                : <>Zar atmayı bekliyor</> }
            </div>
            {selected!==null && (
              <div className="px-3 py-[7px] rounded-full bg-sky-500/14 border border-sky-400/30 text-sky-200 backdrop-blur pointer-events-auto">
                Seçili: {selected==='barW'?'Beyaz Kırık':selected==='barB'?'Siyah Kırık':`Kapı ${ (selected as number)+1 }`}
              </div>
            )}
            <div className="px-3 py-[7px] rounded-full bg-[#121b2b]/90 border border-white/[0.11] backdrop-blur pointer-events-auto">
              Yasal hamle: {legalMoves.length}
            </div>
          </div>
          {/* bottom bar */}
          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
            <div className="bg-[#121b2b]/94 border border-white/[0.12] rounded-2xl backdrop-blur px-3 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                disabled={state.rolled || !!state.winner || isRolling || !canPlay || botThinking}
                onClick={rollDice}
                className="px-4 sm:px-5 py-[11px] sm:py-[12px] rounded-xl bg-amber-400 text-[#1f1302] font-[740] text-[14px] sm:text-[15px] shadow-lg shadow-amber-900/20 disabled:opacity-45 active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-amber-300 touch-manipulation"
              >
                {isRolling ? 'Atılıyor…' : '🎲 Zar At'}
              </button>
              <div className="text-[12.5px] sm:text-[13px] text-zinc-300">
                {state.rolled ? <>Zar: <b className="text-amber-200 text-[15px]">{state.dice[0]}</b> <span className="text-zinc-500">•</span> <b className="text-amber-200 text-[15px]">{state.dice[1]}</b></>
                  : 'Sıra sende ise zar at'}
              </div>
              <div className="flex-1" />
              <button onClick={resetGame}
                className="text-[12px] sm:text-[12.5px] px-3 py-[9px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1]">
                Yeni El
              </button>
            </div>
            <div className="mt-2 text-[11px] sm:text-[11.5px] text-zinc-400 px-1">
              Sürükle: kamera orbit • Pul’a tıkla → hedef kapıya tıkla • Mobil: dokun + dokun
            </div>
          </div>
        </div>

        {/* side panel */}
        <aside className="border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0f1524] flex flex-col min-h-[320px] lg:min-h-0 max-h-[46vh] lg:max-h-none">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b border-white/[0.07]">
            <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500">Durum</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px] sm:text-[13px]">
              <div className="bg-white/[0.035] border border-white/[0.07] rounded-xl px-3 py-[10px]">
                <div className="text-zinc-400 text-[11px]">Beyaz</div>
                <div className="font-[680] text-amber-200">Topladık: {state.offW}/15</div>
                <div className="text-[11px] text-zinc-400">Kırık: {state.barW}</div>
              </div>
              <div className="bg-white/[0.035] border border-white/[0.07] rounded-xl px-3 py-[10px]">
                <div className="text-zinc-400 text-[11px]">Siyah</div>
                <div className="font-[680] text-sky-200">Topladık: {state.offB}/15</div>
                <div className="text-[11px] text-zinc-400">Kırık: {state.barB}</div>
              </div>
            </div>
            <div className="mt-3 text-[11.5px] sm:text-[12px] text-zinc-300">
              Yasal hamleler:
              <div className="mt-1.5 max-h-[110px] overflow-auto pr-1 space-y-[4px] text-[11.5px]">
                {legalMoves.length ? legalMoves.slice(0,14).map((m,i)=>(
                  <div key={i} className="text-zinc-400">
                    • {typeof m.from==='number' ? (m.from+1) : (m.from==='barW'?'KırıkB':'KırıkS')} → {typeof m.to==='number' ? (m.to+1) : 'Topla'} [{m.die}]
                  </div>
                )) : <div className="text-zinc-500">Hamle yok.</div>}
              </div>
            </div>
          </div>

          {isOffline ? (
            <div className="flex-1 px-3 sm:px-4 py-3">
              <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Bot – GameXLabTR</div>
              <div className="bg-white/[0.032] border border-white/[0.07] rounded-xl p-3 text-[12.5px] sm:text-[13px] text-zinc-300 leading-relaxed">
                • Beyaz: Sen<br/>
                • Siyah: JengaBot Tavla AI<br/>
                • 2 sn düşünme • vurma öncelikli<br/>
                • Kırık pulu önce oyuna sokar<br/>
                • Toplama güvenli
              </div>
              <div className="mt-3 text-[11.5px] text-zinc-500">Telefon • Tablet • PC • Smart TV uyumlu. 3D tahta Three.js, sesler WebAudio.</div>
            </div>
          ) : (
            <div className="flex-1 min-h-[170px] flex flex-col">
              <div className="px-3 sm:px-4 py-2 text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 border-b border-white/[0.06]">
                Oyuncular • {roomId}
              </div>
              <div className="px-3 sm:px-4 py-2 space-y-2 text-[12.5px]">
                {onlinePlayers.map(p=>(
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background: p.side==='w' ? '#f8e8b8' : '#2c3347'}} />
                    <span className="text-zinc-200">{p.name}</span>
                    <span className="text-[11px] text-zinc-500">• {p.side==='w'?'Beyaz':'Siyah'}</span>
                    {p.id===playerId && <span className="text-[10px] text-amber-300 ml-1">SEN</span>}
                  </div>
                ))}
                {onlinePlayers.length===0 && <div className="text-zinc-500">Bağlanıyor…</div>}
              </div>
              <div className="flex-1 overflow-auto px-3 sm:px-4 py-2 border-t border-white/[0.06] space-y-1 text-[12.5px]">
                {chat.map(c=> <div key={c.id}><b className="text-zinc-300 mr-1">{c.name}:</b><span className="text-zinc-400">{c.text}</span></div>)}
                {chat.length===0 && <div className="text-zinc-500">Sohbet boş.</div>}
              </div>
              <div className="p-2.5 sm:p-3 border-t border-white/[0.07] flex gap-2">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=> e.key==='Enter' && sendChat()}
                  placeholder="Mesaj…"
                  className="flex-1 bg-[#0b111d] border border-white/[0.12] rounded-lg px-3 py-[9px] text-[13px] outline-none focus:border-sky-400/60" />
                <button onClick={sendChat} className="px-3 rounded-lg bg-sky-500 text-white text-[12.5px] font-[620]">Gönder</button>
              </div>
            </div>
          )}

          <div className="px-3 sm:px-4 py-[9px] border-t border-white/[0.07] text-[10px] sm:text-[10.5px] text-zinc-500">
            GameXLabTR Tavla Laboratuvarı • Three.js + Cannon-es • WebAudio • Firebase RTDB • v1.0
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ===========================
   HOW TO MODAL – TÜRKÇE EĞİTİM
   =========================== */
function HowToModal({ onClose }:{ onClose:()=>void }){
  return (
    <div className="fixed inset-0 z-[10020] bg-black/72 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[860px] max-h-[90dvh] overflow-auto rounded-[22px] sm:rounded-[28px] bg-[#111a2b]/98 border border-white/[0.11] shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-[#111a2b]/95 backdrop-blur border-b border-white/[0.07] px-5 sm:px-7 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest uppercase text-amber-300">GameXLabTR</div>
            <div className="text-[18px] sm:text-[22px] font-[760] tracking-tight">Tavla Nasıl Oynanır?</div>
          </div>
          <button onClick={onClose} className="px-3 py-[7px] rounded-lg bg-white/[0.06] hover:bg-white/[0.13] text-[13px]">Kapat ✕</button>
        </div>
        <div className="px-5 sm:px-7 py-5 sm:py-6 text-[13.5px] sm:text-[14px] leading-relaxed text-zinc-300 space-y-5">
          <section>
            <h3 className="text-[15px] sm:text-[16px] font-[700] text-zinc-100 mb-2">1) Tahta ve Dizilim</h3>
            <p>
              Tavla tahtasında 24 adet üçgen “kapı” vardır. Her oyuncunun 15 pulu bulunur.
              Beyaz pullar: 24. kapıda 2 adet, 13. kapıda 5 adet, 8. kapıda 3 adet, 6. kapıda 5 adet.
              Siyah pullar bunun simetriğidir: 1, 12, 17, 19. kapılar.
              Amaç tüm pulları kendi evine toplayıp dışarı çıkarmaktır.
            </p>
            <div className="mt-3 grid sm:grid-cols-3 gap-2 text-[11.5px] text-zinc-400">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">Beyaz yön: 24 → 1 azalır</div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">Siyah yön: 1 → 24 artar</div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">Ev: Beyaz 1-6 • Siyah 19-24</div>
            </div>
          </section>
          <section>
            <h3 className="text-[15px] sm:text-[16px] font-[700] text-zinc-100 mb-2">2) Zar Mantığı</h3>
            <p>
              Sıra sende ise <b>Zar At</b>’a bas. Gelen iki zar kadar pul ilerlersin.
              Örn. 3 ve 5 gelirse bir pulu 3, başka (veya aynı) pulu 5 ilerletebilirsin.
              <b> Çift (hekzat)</b> gelirse aynı zarı <b>4 kez</b> oynarsın.
              Kullanılabilen her zar oynanmak zorundadır.
            </p>
          </section>
          <section>
            <h3 className="text-[15px] sm:text-[16px] font-[700] text-zinc-100 mb-2">3) Kapı Alma • Kırma</h3>
            <p>
              Bir kapıda rakibin <b>tek pulu</b> varsa oraya gidebilirsin — pulu <b>kırılır</b> ve <b>bara</b> çıkar.
              2 veya daha fazla rakip pul olan kapı <b>kapalıdır</b>, giremezsin.
              Kırık pulun varken önce kırık pulu oyuna sokmak zorundasın.
            </p>
          </section>
          <section>
            <h3 className="text-[15px] sm:text-[16px] font-[700] text-zinc-100 mb-2">4) Toplama</h3>
            <p>
              Tüm 15 pulun kendi evinde ise pulları dışarı toplamaya başlayabilirsin.
              Zar tam denk gelirse o kapıdaki pul çıkar. Daha büyük zar gelirse, arkada pul yoksa en dıştaki pul toplanır.
              İlk 15 pulunu toplayan oyunu kazanır.
            </p>
          </section>
          <section className="bg-amber-400/7 border border-amber-400/20 rounded-2xl p-4 text-amber-100">
            <b>İpucu:</b> Oyunda bir pula tıkla → yasal hedef kapılar yeşil yanar. Hedefe tıkla veya pulu sürükle-bırak.
            Boş alana sürükle = kamera orbit. Tekerlek = zoom. Mobilde çift dokun = seç + hedef.
          </section>
          <div className="pt-2 flex justify-end">
            <button onClick={onClose} className="px-5 py-[11px] rounded-xl bg-amber-400 text-[#1d1303] font-[720]">Anladım, oyna!</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   ROOT – GARANTİ GEÇİŞLİ HİBRİT ROUTER
   =========================== */
export default function App(){
  // blogger css inject
  useEffect(()=>{
    const id='gx-tavla-blogger-override';
    if(!document.getElementById(id)){
      const s = document.createElement('style');
      s.id=id; s.textContent = BLOGGER_FORCE_CSS;
      document.head.appendChild(s);
    }
    // try audio unlock on first tap
    const unlock = ()=>{ try{ ac()?.resume(); }catch{}; window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once:true });
  },[]);

  const [screen, setScreen] = useState<'login'|'lobby'|'game'>('login');
  const [showHowTo, setShowHowTo] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode|null>(null);
  const [playerName, setPlayerName] = useState<string>(()=> localStorage.getItem('gx_tavla_name') || '');
  const [nameInput, setNameInput] = useState(playerName);
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<string|null>(null);
  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const playerId = useMemo(()=>{
    let p = localStorage.getItem('gx_tavla_pid');
    if(!p){ p='u_'+Math.random().toString(36).slice(2,9); localStorage.setItem('gx_tavla_pid', p); }
    return p!;
  },[]);

  const toast = useCallback((m:string)=>{ setToastMsg(m); setTimeout(()=> setToastMsg(null), 1850); },[]);

  // boot
  useEffect(()=>{
    const urlRoom = new URLSearchParams(location.search).get('room')?.toUpperCase() || '';
    if(playerName){ setScreen('lobby'); if(urlRoom) setRoomCode(urlRoom); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // garanti geçişler
  const enterOffline = useCallback(()=>{
    try{ ac()?.resume(); }catch{}
    setGameMode('offline');
    setRoomId(null);
    setScreen('game');
    toast('Çevrimdışı Tavla başlatıldı');
  },[toast]);

  const enterOnlineCreate = useCallback(async ()=>{
    const code = 'T' + Math.floor(1000+Math.random()*8999);
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Oda açılıyor… '+code);
    try{
      const db = getDbSafe();
      if(!db) throw new Error('no db');
      const init = initialTavlaState();
      await fbSafe(()=> set(ref(db, `tavlaRooms/${code}/state`), init));
      await fbSafe(()=> set(ref(db, `tavlaRooms/${code}/players/${playerId}`), { name: playerName || 'Misafir', side:'w', joinedAt: Date.now(), color:'#f6e6c8' }));
      try{ onDisconnect(ref(db, `tavlaRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Oda hazır: '+code);
    }catch(e){
      toast('Firebase bağlanamadı → offline');
      setTimeout(()=> enterOffline(), 1200);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const enterOnlineJoin = useCallback(async (codeRaw:string)=>{
    const code = codeRaw.trim().toUpperCase();
    if(!code){ toast('Oda kodu gir'); return; }
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Odaya bağlanılıyor…');
    try{
      const db = getDbSafe(); if(!db) throw new Error('no db');
      const snap:any = await fbSafe(()=> get(ref(db, `tavlaRooms/${code}/state`)));
      const side: PlayerColor = snap && snap.exists?.() ? 'b' : 'w';
      if(!snap || !snap.exists?.()){
        // create room as joiner = host
        await fbSafe(()=> set(ref(db, `tavlaRooms/${code}/state`), initialTavlaState()));
      }
      await fbSafe(()=> set(ref(db, `tavlaRooms/${code}/players/${playerId}`), { name: playerName||'Misafir', side, joinedAt: Date.now(), color: side==='w' ? '#f6e6c8' : '#334155' }));
      try{ onDisconnect(ref(db, `tavlaRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Katıldın: '+code+' • '+(side==='w'?'Beyaz':'Siyah'));
    }catch(e){
      toast('Katılım hatası → offline');
      setTimeout(()=> enterOffline(), 1100);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const exitToLobby = useCallback(()=>{
    if(gameMode==='online' && roomId){
      const db = getDbSafe(); if(db) fbSafe(()=> remove(ref(db, `tavlaRooms/${roomId}/players/${playerId}`)));
    }
    setGameMode(null);
    setRoomId(null);
    setScreen('lobby');
    history.replaceState(null,'',location.pathname);
  }, [gameMode, roomId, playerId]);

  /* ---------- RENDER ---------- */

  // LOGIN / LOBBY (birleşik modern ekran)
  if(screen!=='game'){
    return (
      <div className="tavla-root min-h-[100dvh] bg-[#0a0e17] text-zinc-100 relative overflow-hidden flex items-center justify-center px-4 sm:px-6">
        <style>{BLOGGER_FORCE_CSS}</style>
        {/* ambient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 right-[-60px] w-[420px] sm:w-[560px] h-[420px] sm:h-[560px] rounded-full blur-[130px] opacity-[0.16]"
            style={{background:'radial-gradient(circle,#ffcc7a 0%, #d45bff 45%, transparent 70%)'}}/>
          <div className="absolute -bottom-32 left-[-70px] w-[380px] sm:w-[520px] h-[380px] sm:h-[520px] rounded-full blur-[120px] opacity-[0.12]"
            style={{background:'radial-gradient(circle,#58c5ff 0%, #2bd4a6 45%, transparent 70%)'}}/>
        </div>

        <div className="relative z-10 w-full max-w-[1040px] grid lg:grid-cols-[1.12fr_.88fr] gap-7 sm:gap-10 items-center">
          {/* left hero */}
          <div className="px-1">
            <div className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] tracking-widest uppercase text-amber-300/95 bg-amber-400/10 border border-amber-400/22 rounded-full px-3 py-1.5 mb-4 sm:mb-5">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              GameXLabTR • Three.js • WebAudio • Firebase
            </div>
            <h1 className="text-[36px] sm:text-[50px] md:text-[58px] font-[820] tracking-[-0.028em] leading-[0.92] text-zinc-50">
              GameXLabTR<br/>
              <span className="text-[#ffcd7a]">Tavla</span> Laboratuvarı
            </h1>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15.5px] leading-relaxed text-zinc-400 max-w-[520px]">
              Profesyonel 3D tavla. Ahşap tahta, gerçek zar fiziği, pul sesleri (Web Audio API), 
              <b className="text-zinc-200"> çevrimdışı bot + Firebase multiplayer</b> hibrit.
              Telefon • Tablet • PC • Smart TV tam uyumlu.
            </p>
            <div className="mt-6 sm:mt-7 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-[560px] text-[11.5px] sm:text-[12.5px] text-zinc-300">
              {[
                ['24 Kapı','Gerçek dizilim'],
                ['WebAudio','.mp3 yok'],
                ['TV Uyumlu','Full HD+']
              ].map(([a,b])=>(
                <div key={a} className="rounded-2xl bg-white/[0.035] border border-white/[0.08] px-3 py-3 sm:py-[14px]">
                  <div className="font-[660] text-zinc-100">{a}</div>
                  <div className="text-zinc-500 text-[11px] sm:text-[12px]">{b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right card */}
          <div className="rounded-[24px] sm:rounded-[28px] bg-[#121c2d]/96 backdrop-blur-xl border border-white/[0.1] shadow-[0_22px_80px_rgba(0,0,0,0.55)] p-5 sm:p-[26px]">
            <div className="text-[11px] tracking-[0.18em] uppercase text-zinc-500">Oyuncu</div>
            <div className="text-[20px] sm:text-[22px] font-[730] mt-1 tracking-tight">GameXLabTR Tavla’ya Hoş Geldin</div>

            <div className="mt-4 sm:mt-5 space-y-3.5">
              <div>
                <label className="text-[12px] text-zinc-400">Takma adın</label>
                <input
                  value={screen==='login' ? nameInput : playerName}
                  onChange={e=> screen==='login' ? setNameInput(e.target.value) : null}
                  readOnly={screen!=='login'}
                  placeholder="ör. GMX / Usta"
                  maxLength={20}
                  className="mt-1.5 w-full bg-[#0d1422] border border-white/[0.13] rounded-xl px-4 py-[13px] sm:py-[14px] text-[15px] sm:text-[16px] outline-none focus:border-amber-400/70"
                />
              </div>

              {screen==='login' ? (
                <button
                  onClick={()=>{
                    const nn = nameInput.trim() || 'Misafir';
                    localStorage.setItem('gx_tavla_name', nn);
                    setPlayerName(nn);
                    setScreen('lobby');
                  }}
                  className="w-full py-[13px] sm:py-[14px] rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 text-[#1b1203] font-[750] text-[15px] sm:text-[16px] shadow-lg shadow-orange-900/25 active:scale-[0.985]"
                >
                  Devam Et →
                </button>
              ) : (
                <>
                  <button onClick={enterOffline}
                    className="w-full py-[13px] sm:py-[14px] rounded-xl bg-emerald-400 text-emerald-950 font-[750] text-[15px] sm:text-[16px] shadow-lg shadow-emerald-900/20 hover:brightness-105 active:scale-[0.985]">
                    🤖 Bota Karşı Oyna (Çevrimdışı)
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button onClick={enterOnlineCreate}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-sky-500 text-white font-[670] text-[13.5px] sm:text-[14px] hover:bg-sky-400 active:scale-[0.985]">
                      Multiplayer • Oda Kur
                    </button>
                    <button onClick={()=>setShowHowTo(true)}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-white/[0.065] hover:bg-white/[0.11] border border-white/[0.12] font-[600] text-[13.5px] sm:text-[14px] active:scale-[0.985]">
                      Nasıl Oynanır?
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={roomCode}
                      onChange={e=> setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Oda kodu: T4821"
                      maxLength={8}
                      className="flex-1 bg-[#0c121f] border border-white/[0.13] rounded-xl px-3 py-[11px] text-[14px] tracking-wider outline-none focus:border-sky-400/65 uppercase"
                    />
                    <button onClick={()=> enterOnlineJoin(roomCode)}
                      className="px-4 py-[11px] rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.12] text-[13px] font-[620] active:scale-95">
                      Katıl
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-[11.5px] text-zinc-500 leading-relaxed">
                    Firebase Realtime DB • Oda linki: <code className="text-zinc-300">?room=KOD</code> • Bağlantı koparsa otomatik offline bota düşer. 0 dosya, 0 404.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {showHowTo && <HowToModal onClose={()=>setShowHowTo(false)} />}
        {toastMsg && (
          <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10050] max-w-[92vw] text-center">
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  // GAME
  return (
    <div className="tavla-root">
      <style>{BLOGGER_FORCE_CSS}</style>
      <TavlaGameView
        key={(gameMode||'x')+'-'+(roomId||'local')}
        mode={(gameMode as GameMode) || 'offline'}
        playerName={playerName || 'Misafir'}
        playerId={playerId}
        roomId={roomId}
        onExit={exitToLobby}
        toast={toast}
      />
      {toastMsg && (
        <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10050] max-w-[92vw] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}