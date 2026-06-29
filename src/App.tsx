import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/* ============================================================
   GameXLabTR – PİŞTİ LABORATUVARI
   Vite + React 19 + TypeScript + Tailwind 4
   Hibrit: Offline Bot + Firebase Realtime Database
   WebAudio – 0 dosya
   Blogger Fullscreen – z-index:10000
   ============================================================ */

const BLOGGER_PISTI_CSS = `
/* GameXLabTR Pişti – Blogger force fullscreen */
#navbar-iframe, .navbar, #Attribution1, .attribution,
#sidebar-wrapper, .sidebar, #sidebar, .sidebar-container,
#header-wrapper, .header, #footer-wrapper, footer, .footer,
.post-footer, .blog-pager, .post-feeds, .feed-links,
#blog-pager, .widget, .PopularPosts, .FollowByEmail,
#comments, .comments, .bg-ads, .ads, iframe[src*="blogger"],
header, nav, aside, .tabs, .tab-wrapper, .cap-top, .cap-bottom,
#main-wrapper, .main, .main-wrapper, .column-left-outer, .column-right-outer,
.post, .post-outer, .date-outer, .blog-posts, .widget-content,
#outer-wrapper, #content-wrapper {
  display: none !important; visibility: hidden !important; height:0 !important; overflow:hidden !important;
}
html, body {
  margin:0 !important; padding:0 !important; overflow:hidden !important;
  background:#07141c !important; height:100% !important; width:100% !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif !important;
  color-scheme: dark;
}
#root, #app, .pisti-root {
  position: fixed !important; inset:0 !important; z-index:10000 !important;
  width:100vw !important; height:100dvh !important; background:#07141c !important;
  overflow:hidden !important;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button, input { font-family: inherit; }
@media (min-width:1920px){ html{ font-size:18px; } }
@media (pointer:coarse){ button{ min-height:46px; } }
::-webkit-scrollbar{ width:8px; height:8px; }
::-webkit-scrollbar-thumb{ background:#254653; border-radius:6px; }
`;

/* ============================================================
   Firebase – korumalı
   ============================================================ */
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
    console.warn('[PİŞTİ] Firebase offline', e);
    return null;
  }
}
async function fbSafe<T=any>(fn:()=>any, fallback:T|null=null):Promise<T|null>{
  try{ const r = fn(); return r && typeof r.then==='function' ? await r : r; }catch(e){ console.warn('[PİŞTİ fb]',e); return fallback; }
}

/* ============================================================
   WebAudio – dosyasız
   ============================================================ */
let audioCtx: AudioContext | null = null;
function ac(): AudioContext | null {
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }catch{ return null; }
}
// kart dağıt – hışırtı
function playCardDeal(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate*0.095, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  for(let i=0;i<d.length;i++){ const tt=i/ctx.sampleRate; d[i]=(Math.random()*2-1)*Math.exp(-tt*16)*0.6; }
  const src = ctx.createBufferSource(); src.buffer=buffer;
  const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1200;
  const g = ctx.createGain(); g.gain.value=0.30;
  src.connect(hp); hp.connect(g); g.connect(ctx.destination);
  src.start(t0);
  const o = ctx.createOscillator(); const og = ctx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(820, t0+0.012);
  o.frequency.exponentialRampToValueAtTime(410, t0+0.07);
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.linearRampToValueAtTime(0.12, t0+0.01);
  og.gain.exponentialRampToValueAtTime(0.001, t0+0.078);
  o.connect(og); og.connect(ctx.destination);
  o.start(t0); o.stop(t0+0.09);
}
// kart atma – tok
function playCardThrow(vol=0.55){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type='square';
  o.frequency.setValueAtTime(230, t0);
  o.frequency.exponentialRampToValueAtTime(88, t0+0.062);
  g.gain.setValueAtTime(vol*0.19, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0+0.072);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0+0.082);
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.type='sawtooth';
  o2.frequency.setValueAtTime(1180, t0);
  o2.frequency.exponentialRampToValueAtTime(500, t0+0.034);
  g2.gain.setValueAtTime(vol*0.072, t0);
  g2.gain.exponentialRampToValueAtTime(0.001, t0+0.038);
  o2.connect(g2); g2.connect(ctx.destination);
  o2.start(t0); o2.stop(t0+0.045);
}
// pişti zafer
function playPisti(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const notes = [659,784,988,1319, 784,988,1319];
  notes.forEach((f,i)=>{
    const tt = t0 + i*0.128;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = i%2 ? 'sine':'triangle';
    o.frequency.setValueAtTime(f, tt);
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.linearRampToValueAtTime(0.26, tt+0.014);
    g.gain.exponentialRampToValueAtTime(0.001, tt+0.14);
    o.connect(g); g.connect(ctx.destination);
    o.start(tt); o.stop(tt+0.155);
  });
}
// toplama swoosh
function playCollect(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(320, t0);
  o.frequency.exponentialRampToValueAtTime(170, t0+0.21);
  g.gain.setValueAtTime(0.22, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0+0.23);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0+0.25);
}

/* ============================================================
   PİŞTİ OYUN ÇEKİRDEĞİ
   ============================================================ */
type Suit = '♠'|'♣'|'♥'|'♦';
type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';
type Card = { suit: Suit; rank: Rank; id: string };

const SUITS: Suit[] = ['♠','♣','♥','♦'];
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function createDeck(): Card[] {
  const d: Card[] = [];
  let n=0;
  for(const s of SUITS){
    for(const r of RANKS){
      d.push({ suit:s, rank:r, id:`${r}${s}_${n++}` });
    }
  }
  // Fisher-Yates
  for(let i=d.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [d[i],d[j]]=[d[j],d[i]];
  }
  return d;
}

type PistiState = {
  deck: Card[];
  floor: Card[];
  hands: [Card[], Card[]];
  collected: [Card[], Card[]];
  turn: 0|1;
  lastTaker: 0|1 | null;
  pisti: [number, number];
  pistiDouble: [number, number];
  scores: [number, number];
  gameOver: boolean;
  message: string;
  version: number; // for force re-render / sync
};

function newPistiState(): PistiState {
  const deck = createDeck();
  const floor = deck.splice(0,4);
  const h0 = deck.splice(0,4);
  const h1 = deck.splice(0,4);
  return {
    deck,
    floor,
    hands: [h0, h1],
    collected: [[], []],
    turn: 0,
    lastTaker: null,
    pisti: [0,0],
    pistiDouble: [0,0],
    scores: [0,0],
    gameOver: false,
    message: 'Oyun başladı – sıra sende!',
    version: 1
  };
}

function cardPointValue(c: Card): number {
  if(c.rank==='A') return 1;
  if(c.rank==='J') return 1;
  if(c.rank==='2' && c.suit==='♣') return 2;
  if(c.rank==='10' && c.suit==='♦') return 3;
  return 0;
}

function tallyCollected(cards: Card[]) {
  let points = 0;
  for(const c of cards) points += cardPointValue(c);
  return { count: cards.length, points };
}

function clonePisti(s: PistiState): PistiState {
  return {
    deck: [...s.deck],
    floor: [...s.floor],
    hands: [ [...s.hands[0]], [...s.hands[1]] ],
    collected: [ [...s.collected[0]], [...s.collected[1]] ],
    turn: s.turn,
    lastTaker: s.lastTaker,
    pisti: [...s.pisti] as [number,number],
    pistiDouble: [...s.pistiDouble] as [number,number],
    scores: [...s.scores] as [number,number],
    gameOver: s.gameOver,
    message: s.message,
    version: s.version + 1
  };
}

function dealIfEmpty(state: PistiState): PistiState {
  if(state.hands[0].length===0 && state.hands[1].length===0 && state.deck.length >= 8){
    const ns = clonePisti(state);
    ns.hands[0] = ns.deck.splice(0,4);
    ns.hands[1] = ns.deck.splice(0,4);
    ns.message = 'Yeni 4’er kart dağıtıldı.';
    return ns;
  }
  return state;
}

function finalizeGame(state: PistiState): PistiState {
  const ns = clonePisti(state);
  // floor remaining -> last taker
  if(ns.floor.length > 0 && ns.lastTaker !== null){
    ns.collected[ns.lastTaker].push(...ns.floor);
    ns.floor = [];
  }
  const t0 = tallyCollected(ns.collected[0]);
  const t1 = tallyCollected(ns.collected[1]);
  let p0 = t0.points;
  let p1 = t1.points;
  // most cards +3
  if(t0.count > t1.count) p0 += 3;
  else if(t1.count > t0.count) p1 += 3;
  // pişti
  p0 += ns.pisti[0]*10 + ns.pistiDouble[0]*20;
  p1 += ns.pisti[1]*10 + ns.pistiDouble[1]*20;
  ns.scores = [p0, p1];
  ns.gameOver = true;
  ns.message = p0>p1 ? `Kazandın! ${p0} – ${p1}` : p1>p0 ? `Bot kazandı ${p1} – ${p0}` : `Berabere ${p0}–${p1}`;
  return ns;
}

// Saf hamle uygulayıcı – hiç UI engeli yok
function applyPistiMove(state: PistiState, player:0|1, handIndex:number): PistiState {
  if(state.gameOver) return state;
  if(state.turn !== player) return state;
  const hand = [...state.hands[player]];
  if(handIndex < 0 || handIndex >= hand.length) return state;
  const card = hand.splice(handIndex,1)[0];

  const ns = clonePisti(state);
  ns.hands[player] = hand;

  const top = ns.floor.length ? ns.floor[ns.floor.length-1] : null;
  let took = false;
  let isPisti = false;
  let isDouble = false;

  if(!top){
    ns.floor.push(card);
    ns.message = '';
  } else if(card.rank === 'J' || card.rank === top.rank){
    took = true;
    const taken = [...ns.floor, card];
    ns.collected[player].push(...taken);
    ns.lastTaker = player;
    if(ns.floor.length === 1){
      isPisti = true;
      if(card.rank === 'J'){
        isDouble = true;
        ns.pistiDouble[player] ++;
        ns.message = 'ÇİFTE PİŞTİ! +20';
      } else {
        ns.pisti[player] ++;
        ns.message = 'PİŞTİ! +10';
      }
    } else {
      ns.message = player===0 ? 'Aldın!' : 'Bot aldı.';
    }
    ns.floor = [];
  } else {
    ns.floor.push(card);
    ns.message = '';
  }

  // turn switch
  ns.turn = player===0 ? 1 : 0;

  // deal if needed
  let out = dealIfEmpty(ns);

  // end check
  if(out.hands[0].length===0 && out.hands[1].length===0 && out.deck.length===0){
    out = finalizeGame(out);
  }

  // @ts-ignore – transient UI flags
  out._fx = { took, isPisti, isDouble, card };
  return out;
}

/* ============================================================
   UI – Kart bileşeni
   ============================================================ */
function CardFace({card, selected, small, faceDown, fly, disabled, onClick}:{card?:Card; selected?:boolean; small?:boolean; faceDown?:boolean; fly?:boolean; disabled?:boolean; onClick?:()=>void}){
  if(faceDown){
    return (
      <button
        disabled
        aria-hidden
        className={`relative select-none rounded-[14px] sm:rounded-[16px] border-[1.5px] border-sky-900/45 shadow-[0_8px_24px_rgba(0,0,0,0.36)] transition
        ${small ? 'w-[54px] h-[78px] sm:w-[62px] sm:h-[90px]' : 'w-[74px] h-[106px] sm:w-[88px] sm:h-[126px] md:w-[98px] md:h-[140px]'}
        bg-[radial-gradient(circle_at_30%_28%,#1d6d97_0%,#0e3a52_55%,#0a2434_100%)]
        `}
      >
        <div className="absolute inset-[6px] rounded-[10px] border border-sky-200/15" />
        <div className="absolute inset-0 flex items-center justify-center text-sky-200/80 text-[10px] sm:text-[12px] font-[750] tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">PİŞTİ</div>
      </button>
    );
  }
  if(!card) return null;
  const red = card.suit==='♥' || card.suit==='♦';
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative text-left select-none rounded-[14px] sm:rounded-[16px] border-[1.5px] transition-all duration-160
      ${small ? 'w-[60px] h-[86px] sm:w-[68px] sm:h-[98px]' : 'w-[78px] h-[112px] sm:w-[92px] sm:h-[132px] md:w-[106px] md:h-[150px]'}
      ${selected
        ? ' -translate-y-3 sm:-translate-y-4 scale-[1.035] shadow-[0_18px_42px_rgba(255,195,80,0.22)] border-amber-300/95 ring-2 ring-amber-300/45'
        : 'hover:-translate-y-[7px] hover:shadow-[0_14px_34px_rgba(0,0,0,0.34)] border-white/[0.14] hover:border-white/[0.30]'}
      ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      ${fly ? 'animate-[cardFly_380ms_cubic-bezier(.22,1,.36,1)]' : ''}
      bg-[linear-gradient(160deg,#fffefc_0%,#f5f0e6_100%)] shadow-[0_9px_28px_rgba(0,0,0,0.34)]`}
      style={{ color: red ? '#e12e4f' : '#182235' }}
    >
      <div className="absolute top-[7px] left-[8px] sm:top-[9px] sm:left-[10px] leading-[1.05]">
        <div className="text-[16px] sm:text-[19px] md:text-[22px] font-[800] tracking-tight">{card.rank}</div>
        <div className="text-[14px] sm:text-[16px] -mt-[1px]">{card.suit}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${small ? 'text-[26px] sm:text-[30px]' : 'text-[34px] sm:text-[40px] md:text-[46px]'} font-[800] opacity-[0.98]`}>
          {card.suit}
        </div>
      </div>
      <div className="absolute bottom-[7px] right-[8px] sm:bottom-[9px] sm:right-[10px] rotate-180 leading-[1.05] opacity-90">
        <div className="text-[15px] sm:text-[18px] md:text-[20px] font-[800]">{card.rank}</div>
        <div className="text-[13px] sm:text-[15px] -mt-[1px]">{card.suit}</div>
      </div>
      <div className="pointer-events-none absolute inset-[1px] rounded-[13px] sm:rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),transparent_34%,transparent_100%)]" />
    </button>
  );
}

/* ============================================================
   Game View
   ============================================================ */
type GameMode = 'offline'|'online';

function PistiGameView(props:{
  mode: GameMode;
  playerName: string;
  playerId: string;
  roomId: string | null;
  onExit: ()=>void;
  toast: (m:string)=>void;
}){
  const { mode, playerName, playerId, roomId, onExit, toast } = props;
  const isOffline = mode==='offline';

  const [state, setState] = useState<PistiState>(()=> newPistiState());
  const stateRef = useRef(state);
  useEffect(()=>{ stateRef.current = state; }, [state]);

  const [selectedIdx, setSelectedIdx] = useState<number|null>(null);
  const [flyCard, setFlyCard] = useState<Card|null>(null);
  const [pistiFlash, setPistiFlash] = useState<null | {text:string; sub:string}>(null);

  // online players / chat
  const [onlinePlayers, setOnlinePlayers] = useState<{id:string; name:string; side:0|1}[]>([]);
  const [chat, setChat] = useState<{id:string; name:string; text:string}[]>([]);
  const [chatInput, setChatInput] = useState('');

  const mySide:0|1 = useMemo(()=>{
    if(isOffline) return 0;
    const me = onlinePlayers.find(p=>p.id===playerId);
    return (me?.side ?? 0) as 0|1;
  }, [isOffline, onlinePlayers, playerId]);

  const oppSide:0|1 = mySide===0 ? 1 : 0;
  const myHand = state.hands[mySide] ?? [];
  const oppHandCount = state.hands[oppSide]?.length ?? 0;
  const myCollected = state.collected[mySide] ?? [];
  const oppCollected = state.collected[oppSide] ?? [];
  const isMyTurn = state.turn === mySide && !state.gameOver;

  // online sync in
  useEffect(()=>{
    if(isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    const unsub = onValue(ref(db, `pistiRooms/${roomId}/state`), snap=>{
      const v = snap.val();
      if(v && v.deck){ setState(v as PistiState); }
    });
    const unsubP = onValue(ref(db, `pistiRooms/${roomId}/players`), snap=>{
      const v = snap.val() || {};
      const list = Object.entries(v).map(([id,x]:any)=>({ id, ...x }));
      setOnlinePlayers(list);
    });
    const unsubC = onValue(ref(db, `pistiRooms/${roomId}/chat`), snap=>{
      const v = snap.val()||{};
      const list = Object.entries(v).map(([id,x]:any)=>({ id, ...x })).sort((a:any,b:any)=>(a.ts||0)-(b.ts||0));
      setChat(list.slice(-50));
    });
    return ()=>{ unsub(); unsubP(); unsubC(); };
  }, [isOffline, roomId]);

  const syncOnline = useCallback((ns:PistiState)=>{
    if(isOffline || !roomId) return;
    const db = getDbSafe(); if(!db) return;
    fbSafe(()=> set(ref(db, `pistiRooms/${roomId}/state`), ns));
  }, [isOffline, roomId]);

  // play a card (universal)
  const doPlay = useCallback(async (player:0|1, handIdx:number)=>{
    const st = stateRef.current;
    if(st.gameOver) return;
    if(st.turn !== player) return;
    const card = st.hands[player]?.[handIdx];
    if(!card) return;

    setFlyCard(card);
    playCardThrow();
    await new Promise(r=>setTimeout(r, 150));
    setFlyCard(null);

    const ns = applyPistiMove(st, player, handIdx);
    // @ts-ignore
    const fx = ns._lastPlay;
    // @ts-ignore
    delete ns._lastPlay;

    if(fx?.took){
      playCollect();
      if(fx.isPisti || fx.isDouble){
        playPisti();
        setPistiFlash({
          text: fx.isDouble ? 'ÇİFTE PİŞTİ!' : 'PİŞTİ!',
          sub: fx.isDouble ? '+20 PUAN' : '+10 PUAN'
        });
        setTimeout(()=> setPistiFlash(null), 1350);
      }
    }

    setSelectedIdx(null);
    setState(ns);
    if(!isOffline) syncOnline(ns);
  }, [isOffline, syncOnline]);

  // human click
  const onHumanCardClick = (idx:number)=>{
    if(!isMyTurn || state.gameOver) return;
    if(selectedIdx === idx){
      // second tap -> play
      doPlay(mySide, idx);
    } else {
      setSelectedIdx(idx);
    }
  };

  /* ---------- BOT – GARANTİLİ ---------- */
  const botThinkingRef = useRef(false);

  useEffect(()=>{
    if(!isOffline) return;
    if(state.gameOver) return;
    if(state.turn !== 1) return; // bot is player 1
    if(botThinkingRef.current) return;

    botThinkingRef.current = true;
    const timer = setTimeout(()=>{
      const s = stateRef.current;
      // double-check turn still bot
      if(s.turn !== 1 || s.gameOver){
        botThinkingRef.current = false;
        return;
      }
      const hand = s.hands[1];
      if(!hand || hand.length===0){
        botThinkingRef.current = false;
        return;
      }
      const top = s.floor.length ? s.floor[s.floor.length-1] : null;
      let choice = -1;
      // 1) take if possible
      if(top){
        choice = hand.findIndex(c=> c.rank === top.rank);
        if(choice===-1) choice = hand.findIndex(c=> c.rank==='J');
      }
      // 2) safe discard – lowest point value
      if(choice===-1){
        let bestScore = 99;
        hand.forEach((c,i)=>{
          const pts = cardPointValue(c);
          // avoid giving pişti chance – if floor has 1 card, avoid matching rank in hand? actually we already tried take
          const score = pts + Math.random()*0.18;
          if(score < bestScore){ bestScore = score; choice = i; }
        });
      }
      if(choice < 0) choice = 0;
      if(choice >= hand.length) choice = 0;

      // play
      doPlay(1, choice).finally(()=>{
        botThinkingRef.current = false;
      });
    }, 1380 + Math.floor(Math.random()*520)); // 1.38–1.9 sn “düşünme”

    return ()=> clearTimeout(timer);
  }, [state.turn, state.gameOver, isOffline, doPlay]);

  // initial deal sound
  useEffect(()=>{
    let c=0;
    const id = setInterval(()=>{ playCardDeal(); c++; if(c>2) clearInterval(id); }, 125);
    return ()=> clearInterval(id);
  }, []);

  const topCard = state.floor.length ? state.floor[state.floor.length-1] : null;
  const myScore = state.scores[mySide] ?? 0;
  const oppScore = state.scores[oppSide] ?? 0;
  const myPistiTotal = (state.pisti[mySide]||0) + (state.pistiDouble[mySide]||0);
  const oppPistiTotal = (state.pisti[oppSide]||0) + (state.pistiDouble[oppSide]||0);

  return (
    <div className="h-[100dvh] bg-[#06141b] text-zinc-100 flex flex-col overflow-hidden">
      {/* top bar */}
      <header className="h-[54px] sm:h-[60px] border-b border-white/[0.07] bg-[#0b1f29]/92 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-[10px] sm:rounded-[12px] bg-gradient-to-br from-amber-300 to-orange-500 text-[#1c1202] font-black flex items-center justify-center text-[14px]">P</div>
          <div className="hidden sm:block min-w-0">
            <div className="font-[750] text-[14px] sm:text-[15px] leading-tight tracking-tight">GameXLabTR Pişti</div>
            <div className="text-[10.5px] text-zinc-400 -mt-0.5 truncate">{isOffline ? 'Offline Bot • WebAudio' : 'Firebase Realtime • Multiplayer'}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11.5px] text-zinc-400">
          <span>•</span>
          <span>Tur: <b className={isMyTurn ? 'text-emerald-300' : 'text-sky-200'}>{isMyTurn ? 'Sen' : state.gameOver ? 'Bitti' : (isOffline ? 'Bot' : 'Rakip')}</b></span>
          <span>•</span>
          <span>Destede {state.deck.length}</span>
        </div>
        <div className="flex-1" />
        <div className="text-right mr-1 sm:mr-3">
          <div className="text-[10.5px] text-zinc-400 leading-tight">Skor</div>
          <div className="text-[14px] sm:text-[15px] font-[720] tracking-tight">
            <span className="text-amber-200">{myScore}</span>
            <span className="text-zinc-500 mx-[5px]">:</span>
            <span className="text-sky-200">{oppScore}</span>
          </div>
        </div>
        <button onClick={onExit}
          className="text-[11px] sm:text-[12px] px-[11px] sm:px-3 py-[7px] rounded-lg bg-white/[0.055] hover:bg-white/[0.11] border border-white/[0.1] active:scale-[0.97]">Çık</button>
      </header>

      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
        {/* table */}
        <div className="relative bg-[#06141b] overflow-hidden min-h-[460px] lg:min-h-0">
          {/* felt */}
          <div className="absolute inset-[14px] sm:inset-[22px] rounded-[26px] sm:rounded-[34px] border border-emerald-900/45 shadow-[inset_0_0_90px_rgba(0,0,0,0.5),0_18px_70px_rgba(0,0,0,0.45)]"
               style={{ background: 'radial-gradient(1100px 620px at 50% 42%, #106a3e 0%, #0b5a34 38%, #09482b 68%, #07361f 100%)' }}>
            <div className="absolute inset-[13px] sm:inset-[20px] rounded-[18px] sm:rounded-[26px] border border-emerald-200/[0.075] pointer-events-none" />
            <div className="absolute inset-0 rounded-[26px] sm:rounded-[34px] pointer-events-none"
                 style={{background:'radial-gradient(820px 480px at 50% 36%, transparent 38%, rgba(0,0,0,0.16) 100%)'}} />
            {/* center emblem */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.065] pointer-events-none select-none text-[56px] sm:text-[84px] font-[900] tracking-[-0.02em] text-emerald-50">
              ♠ ♥
            </div>
          </div>

          {/* opponent top */}
          <div className="absolute top-[18px] sm:top-[26px] left-0 right-0 flex justify-center z-[6]">
            <div className="text-center">
              <div className="text-[11px] sm:text-[12px] text-emerald-100/90">
                {isOffline ? 'JokerBot TR' : (onlinePlayers.find(p=>p.side===oppSide)?.name || 'Rakip')}
                {state.turn===oppSide && !state.gameOver && (
                  <span className="ml-2 text-[10px] px-[7px] py-[2px] rounded-full bg-sky-400/13 text-sky-200 border border-sky-400/25">
                    {isOffline ? 'düşünüyor…' : 'oynuyor…'}
                  </span>
                )}
              </div>
              <div className="mt-[8px] flex justify-center gap-[6px] sm:gap-[9px]">
                {Array.from({length: oppHandCount}).map((_,i)=>(
                  <div key={i} style={{ transform:`rotate(${(i-(oppHandCount-1)/2)*4.5}deg)` }}>
                    <CardFace faceDown small />
                  </div>
                ))}
                {oppHandCount===0 && !state.gameOver && <div className="text-[11px] text-emerald-100/60">el boş</div>}
              </div>
              <div className="text-[10.5px] text-emerald-100/70 mt-1">
                topladık: {oppCollected.length} • pişti {oppPistiTotal}
              </div>
            </div>
          </div>

          {/* center pile */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[8] flex items-center gap-5 sm:gap-10">
            {/* deck */}
            <div className="text-center">
              <div className="relative w-[70px] h-[100px] sm:w-[86px] sm:h-[124px]">
                {Array.from({length: Math.min(6, Math.ceil(state.deck.length/7))}).map((_,i)=>(
                  <div key={i} className="absolute inset-0"
                       style={{ transform:`translate(${i*1.05}px, ${-i*1.15}px) rotate(${(i-2.5)*1.3}deg)` }}>
                    <CardFace faceDown />
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-emerald-100/85 mt-[6px]">{state.deck.length} kart</div>
            </div>

            {/* floor */}
            <div className="text-center min-w-[120px] sm:min-w-[150px]">
              <div className="relative mx-auto w-[88px] h-[126px] sm:w-[100px] sm:h-[144px]">
                {/* under cards */}
                {state.floor.slice(Math.max(0, state.floor.length-3), Math.max(0, state.floor.length-1)).map((c, i, arr)=>(
                  <div key={c.id} className="absolute inset-0"
                       style={{ transform:`translate(${i*1.6}px, ${-i*1}px) rotate(${(i-arr.length/2)*2}deg)`, opacity: 0.92 - i*0.14 }}>
                    <CardFace card={c} />
                  </div>
                ))}
                {/* top */}
                <div className={`absolute inset-0 transition-transform duration-200 ${flyCard ? 'scale-[1.025]' : ''}`}>
                  {topCard ? <CardFace card={topCard} /> : (
                    <div className="w-full h-full rounded-[14px] sm:rounded-[16px] border-[1.7px] border-dashed border-emerald-300/28 bg-emerald-950/[0.12] flex items-center justify-center text-emerald-100/60 text-[11.5px]">Boş</div>
                  )}
                </div>
                {flyCard && (
                  <div className="absolute inset-0 z-20 animate-[pistiFlyIn_360ms_cubic-bezier(.22,1,.36,1)]">
                    <CardFace card={flyCard} />
                  </div>
                )}
              </div>
              <div className="text-[11px] text-emerald-100/85 mt-[6px]">
                Yerde: <b>{state.floor.length}</b>
                {topCard && <> • <span className="text-amber-200">{topCard.rank}{topCard.suit}</span></>}
              </div>
              {state.message && (
                <div className="mt-[5px] inline-block text-[11.5px] text-zinc-100 bg-black/25 px-[10px] py-[4px] rounded-full border border-white/[0.1] backdrop-blur">
                  {state.message}
                </div>
              )}
            </div>
          </div>

          {/* pişti flash */}
          {pistiFlash && (
            <div className="absolute inset-0 z-[35] flex items-center justify-center pointer-events-none">
              <div className="text-center animate-[pistiPop_1280ms_ease-out]">
                <div className="text-[34px] sm:text-[52px] font-[900] tracking-[-0.018em] text-amber-300 drop-shadow-[0_6px_30px_rgba(255,170,40,0.38)]">
                  {pistiFlash.text}
                </div>
                <div className="text-[15px] sm:text-[18px] font-[720] text-amber-100 mt-1">{pistiFlash.sub}</div>
              </div>
            </div>
          )}

          {/* player hand */}
          <div className="absolute left-0 right-0 bottom-[12px] sm:bottom-[18px] z-[14]">
            <div className="text-center text-[11px] sm:text-[12px] text-emerald-100/88 mb-[8px]">
              {state.gameOver ? 'Oyun bitti' : isMyTurn ? <b className="text-emerald-200">Sıra sende – kart seç</b> : 'Rakip oynuyor…'}
              <span className="ml-3 text-zinc-300/80">Topladık: {myCollected.length} • Pişti: {myPistiTotal}</span>
            </div>
            <div className="flex justify-center gap-[8px] sm:gap-[13px] px-3 flex-wrap">
              {myHand.map((card, idx)=>(
                <div key={card.id}
                  onClick={()=> onHumanCardClick(idx)}
                  className="transition-transform duration-150"
                  style={{ transform: selectedIdx===idx ? 'translateY(-10px)' : 'translateY(0)' }}
                >
                  <CardFace
                    card={card}
                    selected={selectedIdx===idx}
                    disabled={!isMyTurn || state.gameOver}
                  />
                </div>
              ))}
              {myHand.length===0 && !state.gameOver && (
                <div className="text-[12.5px] text-emerald-100/70 py-5">Kart bekleniyor…</div>
              )}
            </div>
            <div className="text-center mt-[7px] text-[11px] sm:text-[11.5px] text-emerald-100/70">
              1. dokun = seç • 2. dokun = at • Seçiliyken boşluğa dokunarak iptal
            </div>
          </div>

          {/* game over */}
          {state.gameOver && (
            <div className="absolute inset-0 z-[45] bg-[#06141b]/80 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-[#0f2230]/97 border border-amber-300/25 rounded-[22px] px-6 sm:px-9 py-6 sm:py-8 text-center shadow-2xl max-w-[430px] w-full">
                <div className="text-[32px]">🏆</div>
                <div className="text-[20px] sm:text-[22px] font-[800] mt-2 text-amber-200">
                  {myScore > oppScore ? 'Kazandın!' : oppScore > myScore ? (isOffline ? 'Bot kazandı' : 'Kaybettin') : 'Berabere!'}
                </div>
                <div className="mt-3 text-[14px] sm:text-[15px] text-zinc-200 leading-relaxed">
                  Sen: <b className="text-amber-200">{myScore}</b><br/>
                  {isOffline ? 'Bot' : 'Rakip'}: <b className="text-sky-200">{oppScore}</b>
                  <div className="text-[12px] text-zinc-400 mt-2">
                    Kartlar: {myCollected.length} / {oppCollected.length}<br/>
                    Pişti: {state.pisti[mySide]} • Çifte: {state.pistiDouble[mySide]}
                  </div>
                </div>
                <button
                  onClick={()=>{
                    const ns = newPistiState();
                    setState(ns);
                    setSelectedIdx(null);
                    if(!isOffline && roomId){
                      const db = getDbSafe();
                      if(db) fbSafe(()=> set(ref(db, `pistiRooms/${roomId}/state`), ns));
                    }
                    toast('Yeni el!');
                    setTimeout(()=>playCardDeal(),120);
                    setTimeout(()=>playCardDeal(),300);
                  }}
                  className="mt-5 w-full py-[12px] rounded-xl bg-amber-400 text-[#1b1202] font-[730] text-[14.5px] active:scale-[0.985]"
                >
                  Yeniden Oyna
                </button>
                <button onClick={onExit}
                  className="mt-[10px] w-full py-[10px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[13px]">
                  Lobiye Dön
                </button>
              </div>
            </div>
          )}
        </div>

        {/* right panel */}
        <aside className="border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0d1b26] flex flex-col min-h-[300px] lg:min-h-0 max-h-[46vh] lg:max-h-none">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b border-white/[0.07]">
            <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500">Skor</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px] sm:text-[13px]">
              <div className="bg-white/[0.035] border border-white/[0.08] rounded-xl px-3 py-[10px]">
                <div className="text-zinc-400 text-[11px]">Sen</div>
                <div className="text-[18px] sm:text-[20px] font-[750] text-amber-200">{myScore}</div>
                <div className="text-[11px] text-zinc-400">{myCollected.length} kart</div>
              </div>
              <div className="bg-white/[0.035] border border-white/[0.08] rounded-xl px-3 py-[10px]">
                <div className="text-zinc-400 text-[11px]">{isOffline ? 'Bot' : 'Rakip'}</div>
                <div className="text-[18px] sm:text-[20px] font-[750] text-sky-200">{oppScore}</div>
                <div className="text-[11px] text-zinc-400">{oppCollected.length} kart</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>{
                const ns = newPistiState();
                setState(ns);
                setSelectedIdx(null);
                if(!isOffline && roomId){
                  const db=getDbSafe(); if(db) fbSafe(()=> set(ref(db, `pistiRooms/${roomId}/state`), ns));
                }
                toast('Yeni el');
              }}
                className="flex-1 py-[10px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[12.5px]">Yeni El</button>
              <button onClick={()=> toast('Kartına 2 kez dokun = at')}
                className="px-3 py-[10px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[12.5px]">Yardım</button>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-3 border-b border-white/[0.07]">
            <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Toplananlar</div>
            <div className="text-[12px] sm:text-[12.5px] text-zinc-300 leading-relaxed">
              <div>Sen: {myCollected.slice(-12).map(c=>c.rank+c.suit).join(' ') || '—'} {myCollected.length>12 ? ` …+${myCollected.length-12}`:''}</div>
              <div className="mt-1 text-zinc-400">{isOffline?'Bot':'Rakip'}: {oppCollected.slice(-10).map(c=>c.rank+c.suit).join(' ') || '—'} {oppCollected.length>10 ? ` …+${oppCollected.length-10}`:''}</div>
            </div>
          </div>

          <div className="flex-1 min-h-[150px] flex flex-col">
            {isOffline ? (
              <div className="px-3 sm:px-4 py-3 flex-1">
                <div className="text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Bot – GameXLabTR</div>
                <div className="text-[12.5px] sm:text-[13px] text-zinc-300 leading-relaxed bg-white/[0.032] border border-white/[0.07] rounded-xl p-3">
                  JokerBot Pişti AI<br/>
                  • Aynı kartı / Vale’yi kaçırmaz<br/>
                  • 1.4 – 1.9 sn düşünme<br/>
                  • Puanlı kartları sona saklar<br/>
                  • Pişti fırsatını öncelikler
                </div>
                <div className="mt-3 text-[11.5px] text-zinc-500">
                  Telefon • Tablet • PC • Smart TV uyumlu.<br/>
                  Sesler: WebAudio API – 0 dosya.
                </div>
              </div>
            ) : (
              <>
                <div className="px-3 sm:px-4 py-2 text-[10.5px] sm:text-[11px] uppercase tracking-widest text-zinc-500 border-b border-white/[0.06]">
                  Oyuncular • {roomId}
                </div>
                <div className="px-3 sm:px-4 py-2 text-[12.5px] space-y-1">
                  {onlinePlayers.map(p=>(
                    <div key={p.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.side===0 ? 'bg-amber-300':'bg-sky-400'}`} />
                      <span className="text-zinc-200">{p.name}</span>
                      <span className="text-[11px] text-zinc-500">• {p.side===0?'1. oyuncu':'2. oyuncu'}</span>
                      {p.id===playerId && <span className="text-[10px] text-amber-300">SEN</span>}
                    </div>
                  ))}
                  {onlinePlayers.length===0 && <div className="text-zinc-500">Bağlanıyor…</div>}
                </div>
                <div className="flex-1 overflow-auto px-3 sm:px-4 py-2 border-t border-white/[0.06] space-y-1 text-[12.5px] sm:text-[13px]">
                  {chat.map(c=> <div key={c.id}><b className="text-amber-200 mr-1">{c.name}:</b><span className="text-zinc-300">{c.text}</span></div>)}
                  {chat.length===0 && <div className="text-zinc-500">Sohbet boş.</div>}
                </div>
                <div className="p-2.5 sm:p-3 border-t border-white/[0.07] flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'){
                      if(!chatInput.trim()||!roomId) return;
                      const db=getDbSafe(); if(!db) return;
                      const id='m_'+Math.random().toString(36).slice(2,8);
                      fbSafe(()=> set(ref(db, `pistiRooms/${roomId}/chat/${id}`), { name: playerName, text: chatInput.trim().slice(0,160), ts: Date.now(), pid: playerId }));
                      setChatInput('');
                    }}}
                    placeholder="Mesaj yaz…"
                    className="flex-1 bg-[#0a1620] border border-white/[0.12] rounded-lg px-3 py-[9px] text-[13px] outline-none focus:border-sky-400/60"
                  />
                  <button
                    onClick={()=>{
                      if(!chatInput.trim()||!roomId) return;
                      const db=getDbSafe(); if(!db) return;
                      const id='m_'+Math.random().toString(36).slice(2,8);
                      fbSafe(()=> set(ref(db, `pistiRooms/${roomId}/chat/${id}`), { name: playerName, text: chatInput.trim().slice(0,160), ts: Date.now(), pid: playerId }));
                      setChatInput('');
                    }}
                    className="px-3 rounded-lg bg-sky-500 text-white text-[12.5px] font-[620]"
                  >Gönder</button>
                </div>
              </>
            )}
          </div>

          <div className="px-3 sm:px-4 py-[9px] border-t border-white/[0.07] text-[10px] sm:text-[10.5px] text-zinc-500 leading-relaxed">
            GameXLabTR Pişti Laboratuvarı • v1.2 • WebAudio • Firebase RTDB<br/>
            52 kart • Vale=joker • Pişti 10 • Çifte Pişti 20
          </div>
        </aside>
      </div>

      <style>{`
      @keyframes cardFly {
        0% { transform: translateY(26px) scale(.9) rotate(-5deg); opacity:.45; }
        100% { transform: translateY(0) scale(1) rotate(0deg); opacity:1; }
      }
      @keyframes pistiFlyIn {
        0% { transform: translateY(38px) scale(.82) rotate(-7deg); opacity:.25; }
        100% { transform: translateY(0) scale(1) rotate(0deg); opacity:1; }
      }
      @keyframes pistiPop {
        0% { transform: scale(.55); opacity:0; }
        16% { transform: scale(1.18); opacity:1; }
        55% { transform: scale(1.0); opacity:1; }
        100% { transform: scale(1.0); opacity:0; }
      }
      `}</style>
    </div>
  );
}

/* ============================================================
   HOW TO MODAL
   ============================================================ */
function HowToModal({onClose}:{onClose:()=>void}){
  return (
    <div className="fixed inset-0 z-[10060] bg-black/74 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-[860px] max-h-[90dvh] overflow-auto rounded-[22px] sm:rounded-[28px] bg-[#0f1e2b]/[0.985] border border-white/[0.12] shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-[#0f1e2b]/95 backdrop-blur border-b border-white/[0.08] px-5 sm:px-7 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-widest uppercase text-amber-300">GameXLabTR</div>
            <div className="text-[18px] sm:text-[22px] font-[760] tracking-tight text-zinc-100">Pişti Nasıl Oynanır?</div>
          </div>
          <button onClick={onClose} className="px-3 py-[7px] rounded-lg bg-white/[0.06] hover:bg-white/[0.13] text-[13px] text-zinc-200">Kapat ✕</button>
        </div>
        <div className="px-5 sm:px-7 py-5 sm:py-6 text-[13.5px] sm:text-[14.5px] leading-relaxed text-zinc-300 space-y-5">
          <p className="text-zinc-200">Türk klasik kart oyunu <b>Pişti</b> – 52 kart, 2 oyuncu, 4’er kart dağıtılır.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.032] border border-white/[0.07] rounded-2xl p-4">
              <div className="font-[700] text-zinc-100 mb-1">Temel Akış</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li>Yere 4 kart açılır.</li>
                <li>Her oyuncuya 4’er kart.</li>
                <li>Sırayla 1 kart atılır.</li>
                <li>Eller bitince tekrar 4’er dağıtılır.</li>
                <li>Deste bitince oyun biter.</li>
              </ul>
            </div>
            <div className="bg-white/[0.032] border border-white/[0.07] rounded-2xl p-4">
              <div className="font-[700] text-zinc-100 mb-1">Toplama</div>
              <ul className="list-disc pl-[18px] space-y-1">
                <li>Attığın kart yerdeki <b>üst kartla aynı rank</b> ise → tüm yeri alırsın.</li>
                <li><b>Vale (J)</b> her zaman toplar – jokerdir.</li>
                <li>Son alan oyuncu, kalan yer kartlarını da alır.</li>
              </ul>
            </div>
            <div className="bg-amber-400/[0.07] border border-amber-400/[0.22] rounded-2xl p-4">
              <div className="font-[700] text-amber-200 mb-1">Pişti • +10</div>
              <p>Yerde <b>tek kart</b> varken aynı rankı atarsan → <b>PİŞTİ!</b></p>
              <p className="text-[12.5px] text-amber-100/80 mt-1">Ekranda büyük efekt belirir.</p>
            </div>
            <div className="bg-rose-500/[0.07] border border-rose-400/[0.22] rounded-2xl p-4">
              <div className="font-[700] text-rose-200 mb-1">Çifte Pişti • +20</div>
              <p>Tek kartı <b>Vale (J)</b> ile alırsan → <b>Çifte Pişti</b></p>
              <p className="text-[12.5px] text-rose-100/80 mt-1">Nadir, çok değerli!</p>
            </div>
          </div>
          <div className="bg-emerald-500/[0.06] border border-emerald-400/[0.22] rounded-2xl p-4">
            <div className="font-[700] text-emerald-200 mb-1">Oyun Sonu Puanlama</div>
            <ul className="grid sm:grid-cols-2 gap-x-6 list-disc pl-[18px] text-[13.5px]">
              <li>As = <b>1 puan</b></li>
              <li>Vale (J) = <b>1 puan</b></li>
              <li>Sinek 2 = <b>2 puan</b></li>
              <li>Karo 10 = <b>3 puan</b></li>
              <li>En çok kart toplayan = <b>+3 puan</b></li>
              <li>Pişti = <b>+10</b> • Çifte = <b>+20</b></li>
            </ul>
          </div>
          <div className="bg-sky-500/[0.06] border border-sky-400/[0.2] rounded-2xl p-[14px] text-[12.5px] sm:text-[13px] text-sky-100">
            İpucu: Yerdeki kartı unutma. Vale’yi pişti için sakla. Bot orta seviye – aynı kartı ve Vale’yi asla kaçırmaz.
          </div>
          <div className="flex justify-end pt-1">
            <button onClick={onClose} className="px-5 py-[11px] rounded-xl bg-amber-400 text-[#1b1202] font-[720] text-[14px]">Anladım, oyna!</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT – GARANTİ GEÇİŞ
   ============================================================ */
export default function App(){
  // blogger css inject
  useEffect(()=>{
    const id='gx-pisti-blogger-final';
    if(!document.getElementById(id)){
      const s=document.createElement('style');
      s.id=id; s.textContent=BLOGGER_PISTI_CSS;
      document.head.appendChild(s);
    }
    const unlock = ()=>{ try{ ac()?.resume(); }catch{}; window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); };
    window.addEventListener('pointerdown', unlock, { once:true });
    window.addEventListener('touchstart', unlock, { once:true });
  },[]);

  const [screen, setScreen] = useState<'login'|'lobby'|'game'>('login');
  const [showHowTo, setShowHowTo] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode|null>(null);
  const [playerName, setPlayerName] = useState<string>(()=> localStorage.getItem('gx_pisti_name') || '');
  const [nameInput, setNameInput] = useState(playerName);
  const [roomId, setRoomId] = useState<string|null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string|null>(null);

  const playerId = useMemo(()=>{
    let p = localStorage.getItem('gx_pisti_pid');
    if(!p){ p='u_'+Math.random().toString(36).slice(2,9); localStorage.setItem('gx_pisti_pid', p); }
    return p;
  },[]);

  const toast = useCallback((m:string)=>{ setToastMsg(m); setTimeout(()=>setToastMsg(null), 1750); },[]);

  // boot
  useEffect(()=>{
    const saved = localStorage.getItem('gx_pisti_name');
    const urlRoom = new URLSearchParams(location.search).get('room')?.toUpperCase() || '';
    if(saved){
      setPlayerName(saved);
      setScreen('lobby');
      if(urlRoom) setRoomCodeInput(urlRoom);
    }
  },[]);

  // --- GARANTİ GEÇİŞLER ---
  const enterOffline = useCallback(()=>{
    try{ ac()?.resume(); }catch{}
    setGameMode('offline');
    setRoomId(null);
    setScreen('game');
    toast('Çevrimdışı Pişti başlatıldı');
  },[toast]);

  const enterOnlineCreate = useCallback(async ()=>{
    const code = 'P' + Math.floor(1000 + Math.random()*8999);
    // ÖNCE EKRAN GEÇİŞİ
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Oda açılıyor… '+code);
    try{
      const db = getDbSafe();
      if(!db) throw new Error('no db');
      const init = newPistiState();
      await fbSafe(()=> set(ref(db, `pistiRooms/${code}/state`), init));
      await fbSafe(()=> set(ref(db, `pistiRooms/${code}/players/${playerId}`), {
        name: playerName || 'Misafir',
        side: 0,
        joinedAt: Date.now()
      }));
      try{ onDisconnect(ref(db, `pistiRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Oda hazır: '+code);
    }catch(e){
      toast('Firebase bağlanamadı → offline');
      setTimeout(()=> enterOffline(), 1050);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const enterOnlineJoin = useCallback(async (codeRaw:string)=>{
    const code = codeRaw.trim().toUpperCase();
    if(!code){ toast('Oda kodu gir'); return; }
    // ÖNCE EKRAN
    setGameMode('online');
    setRoomId(code);
    setScreen('game');
    toast('Odaya bağlanılıyor…');
    try{
      const db = getDbSafe(); if(!db) throw new Error('no db');
      const snap:any = await fbSafe(()=> get(ref(db, `pistiRooms/${code}/state`)));
      const exists = !!(snap && snap.exists && snap.exists());
      if(!exists){
        await fbSafe(()=> set(ref(db, `pistiRooms/${code}/state`), newPistiState()));
      }
      // side belirle
      const pSnap:any = await fbSafe(()=> get(ref(db, `pistiRooms/${code}/players`)));
      const playersObj = pSnap?.val?.() || {};
      const usedSides:number[] = Object.values(playersObj).map((x:any)=> x.side ?? 0);
      const side:0|1 = usedSides.includes(0) ? 1 : 0;
      await fbSafe(()=> set(ref(db, `pistiRooms/${code}/players/${playerId}`), {
        name: playerName || 'Misafir',
        side,
        joinedAt: Date.now()
      }));
      try{ onDisconnect(ref(db, `pistiRooms/${code}/players/${playerId}`)).remove(); }catch{}
      history.replaceState(null,'',`?room=${code}`);
      toast('Katıldın: '+code+' • '+(side===0?'1. oyuncu':'2. oyuncu'));
    }catch(e){
      toast('Katılım hatası → offline');
      setTimeout(()=> enterOffline(), 1000);
    }
  }, [playerId, playerName, toast, enterOffline]);

  const exitToLobby = useCallback(()=>{
    if(gameMode==='online' && roomId){
      const db = getDbSafe();
      if(db) fbSafe(()=> remove(ref(db, `pistiRooms/${roomId}/players/${playerId}`)));
    }
    setGameMode(null);
    setRoomId(null);
    setScreen('lobby');
    history.replaceState(null,'',location.pathname);
  }, [gameMode, roomId, playerId]);

  /* ---------- RENDER ---------- */

  if(screen !== 'game'){
    const isLogin = screen==='login';
    return (
      <div className="pisti-root min-h-[100dvh] bg-[#07141c] text-zinc-100 relative overflow-hidden flex items-center justify-center px-4 sm:px-6">
        <style>{BLOGGER_PISTI_CSS}</style>
        {/* ambient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-[-60px] w-[380px] sm:w-[560px] h-[380px] sm:h-[560px] rounded-full blur-[120px] sm:blur-[140px] opacity-[0.16]"
            style={{background:'radial-gradient(circle,#ffd37a 0%, #ff5a8e 46%, transparent 70%)'}}/>
          <div className="absolute -bottom-28 left-[-60px] w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full blur-[110px] sm:blur-[130px] opacity-[0.12]"
            style={{background:'radial-gradient(circle,#34d39b 0%, #2aa8ff 46%, transparent 70%)'}}/>
        </div>

        <div className="relative z-10 w-full max-w-[1020px] grid lg:grid-cols-[1.13fr_.87fr] gap-7 sm:gap-10 items-center">
          {/* hero */}
          <div className="px-1">
            <div className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] tracking-widest uppercase text-amber-300/95 bg-amber-400/10 border border-amber-400/22 rounded-full px-3 py-[7px] mb-4 sm:mb-5">
              <span className="w-[7px] h-[7px] rounded-full bg-amber-400 animate-pulse" />
              GameXLabTR • Pişti • WebAudio • Firebase
            </div>
            <h1 className="text-[36px] sm:text-[52px] md:text-[60px] font-[830] tracking-[-0.028em] leading-[0.92] text-zinc-50">
              GameXLabTR<br/>
              <span className="text-[#ffcf7a]">Pişti</span> Laboratuvarı
            </h1>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15.5px] leading-relaxed text-zinc-400 max-w-[520px]">
              Profesyonel Türk Pişti kart oyunu. Yeşil kumar masası, 3D kart animasyonları, Web Audio API ses efektleri.
              <b className="text-zinc-200"> Çevrimdışı Bot + Firebase Realtime Multiplayer</b> hibrit.
              Telefon • Tablet • PC • Smart TV tam uyumlu.
            </p>
            <div className="mt-6 sm:mt-7 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-[10px] sm:gap-3 max-w-[560px] text-[11.5px] sm:text-[12.5px] text-zinc-300">
              {[
                ['52 Kart','Gerçek deste'],
                ['WebAudio','0 .mp3'],
                ['TV Uyumlu','Full HD+']
              ].map(([a,b])=>(
                <div key={a} className="rounded-2xl bg-white/[0.032] border border-white/[0.075] px-3 py-3 sm:py-[14px]">
                  <div className="font-[650] text-zinc-100">{a}</div>
                  <div className="text-zinc-500 text-[11px] sm:text-[12px]">{b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right card */}
          <div className="rounded-[24px] sm:rounded-[28px] bg-[#0f1e2b]/[0.97] backdrop-blur-xl border border-white/[0.1] shadow-[0_22px_80px_rgba(0,0,0,0.55)] p-5 sm:p-[26px]">
            <div className="text-[11px] tracking-[0.18em] uppercase text-zinc-500">
              {isLogin ? 'Oyuncu Girişi' : 'Oyun Modu'}
            </div>
            <div className="text-[20px] sm:text-[22px] font-[730] mt-1 tracking-tight text-zinc-100">
              {isLogin ? 'Pişti Masasına katıl' : `Hoş geldin, ${playerName || 'Misafir'}`}
            </div>

            <div className="mt-4 sm:mt-5 space-y-[14px]">
              {isLogin ? (
                <>
                  <div>
                    <label className="text-[12px] text-zinc-400">Takma adın</label>
                    <input
                      value={nameInput}
                      onChange={e=>setNameInput(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'){ const nn=nameInput.trim()||'Misafir'; localStorage.setItem('gx_pisti_name', nn); setPlayerName(nn); setScreen('lobby'); }}}
                      placeholder="ör. Usta / GMX"
                      maxLength={20}
                      autoFocus
                      className="mt-[7px] w-full bg-[#0b1622] border border-white/[0.13] rounded-xl px-4 py-[13px] sm:py-[14px] text-[15px] sm:text-[16px] outline-none focus:border-amber-400/70"
                    />
                  </div>
                  <button
                    onClick={()=>{
                      const nn = nameInput.trim() || 'Misafir';
                      localStorage.setItem('gx_pisti_name', nn);
                      setPlayerName(nn);
                      setScreen('lobby');
                    }}
                    className="w-full py-[13px] sm:py-[14px] rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 text-[#1b1202] font-[740] text-[15px] sm:text-[16px] shadow-lg shadow-orange-900/25 active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    Devam Et →
                  </button>
                  <p className="text-[11px] sm:text-[11.5px] text-zinc-500 leading-relaxed">
                    Offline mod internet gerektirmez. TV kumandası / dokunmatik / mouse hepsi desteklenir.
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={enterOffline}
                    className="w-full py-[13px] sm:py-[14px] rounded-xl bg-emerald-400 text-emerald-950 font-[750] text-[15px] sm:text-[16px] shadow-lg shadow-emerald-900/20 hover:brightness-[1.04] active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    🤖 Bota Karşı Oyna (Çevrimdışı)
                  </button>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={enterOnlineCreate}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-sky-500 text-white font-[670] text-[13.5px] sm:text-[14px] hover:bg-sky-400 active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      Multiplayer (Oda Kodu ile)
                    </button>
                    <button
                      onClick={()=>setShowHowTo(true)}
                      className="py-[11px] sm:py-[12px] rounded-xl bg-white/[0.065] hover:bg-white/[0.12] border border-white/[0.12] font-[600] text-[13.5px] sm:text-[14px] active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-white/25"
                    >
                      Nasıl Oynanır?
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={roomCodeInput}
                      onChange={e=> setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Oda kodu: P4821"
                      maxLength={8}
                      className="flex-1 bg-[#0b1622] border border-white/[0.13] rounded-xl px-3 py-[11px] text-[14px] tracking-wider outline-none focus:border-sky-400/65 uppercase"
                    />
                    <button
                      onClick={()=> enterOnlineJoin(roomCodeInput)}
                      className="px-[15px] py-[11px] rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.12] text-[13px] font-[620] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/25"
                    >
                      Katıl
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-[11.5px] text-zinc-500 leading-relaxed">
                    Firebase Realtime DB • Oda linki: <code className="text-zinc-300">?room=KOD</code> • Bağlantı koparsa otomatik offline bota düşer. 0 dosya, 0 404.
                  </p>
                  <button
                    onClick={()=>{ localStorage.removeItem('gx_pisti_name'); setPlayerName(''); setNameInput(''); setScreen('login'); }}
                    className="text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
                  >
                    İsim değiştir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showHowTo && <HowToModal onClose={()=>setShowHowTo(false)} />}
        {toastMsg && (
          <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10070] max-w-[92vw] text-center">
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  // GAME
  return (
    <div className="pisti-root">
      <style>{BLOGGER_PISTI_CSS}</style>
      <PistiGameView
        key={(gameMode||'x')+'-'+(roomId||'local')}
        mode={(gameMode as GameMode) || 'offline'}
        playerName={playerName || 'Misafir'}
        playerId={playerId}
        roomId={roomId}
        onExit={exitToLobby}
        toast={toast}
      />
      {toastMsg && (
        <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 bg-[#142030] border border-white/[0.14] shadow-2xl px-4 py-[11px] rounded-xl text-[13px] text-zinc-100 z-[10070] max-w-[92vw] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}