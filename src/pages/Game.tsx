import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { saveToCloud, loadFromCloud } from "@/lib/gameSave";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as THREE from "three";

const Game = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [gameState, setGameState] = useState<"menu" | "playing">("menu");
  const [cloudSaveInfo, setCloudSaveInfo] = useState<string>("Checking save...");
  const [cloudSaveAvailable, setCloudSaveAvailable] = useState(false);
  const [walletDisplay, setWalletDisplay] = useState("$500");
  const [incomeDisplay, setIncomeDisplay] = useState("$0");
  const [nextLabel, setNextLabel] = useState("—");
  const [nextCost, setNextCost] = useState("");
  const [showBuyPrompt, setShowBuyPrompt] = useState(false);
  const [showSaveFlash, setShowSaveFlash] = useState(false);
  const [roomLabel, setRoomLabel] = useState("");
  const [showRoom, setShowRoom] = useState(false);
  const [progress, setProgress] = useState(0);
  const [health] = useState(100);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadFromCloud(user.id).then(save => {
      if (save && save.buildings && save.buildings.length > 0) {
        setCloudSaveInfo(`Cloud Save — ${save.buildings.length} buildings`);
        setCloudSaveAvailable(true);
        if (gameRef.current) gameRef.current.pendingCloudSave = save;
      } else {
        setCloudSaveInfo("No cloud save found");
        setCloudSaveAvailable(false);
      }
    }).catch(() => {
      setCloudSaveInfo("No cloud save found");
      setCloudSaveAvailable(false);
    });
  }, [user]);

  const doCloudSave = useCallback(async () => {
    if (!user || !gameRef.current) return;
    const g = gameRef.current;
    const data = {
      wallet: Math.floor(g.wallet),
      income: Math.floor(g.income),
      buildings: g.STEPS.filter((s: any) => s.bought).map((s: any) => s.id),
      playerX: Math.round(g.player ? g.player.position.x : 0),
      playerZ: Math.round(g.player ? g.player.position.z : 0),
    };
    try {
      await saveToCloud(user.id, data);
      setShowSaveFlash(true);
      setTimeout(() => setShowSaveFlash(false), 1800);
    } catch {
      toast.error("Cloud save failed");
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  const startGame = useCallback(async (doLoad: boolean) => {
    if (!containerRef.current) return;
    let pendingSave: any = null;
    if (doLoad && user) {
      try { pendingSave = await loadFromCloud(user.id); } catch {}
    }
    setGameState("playing");
    requestAnimationFrame(() => {
      const engine = initGameEngine(containerRef.current!, pendingSave, doLoad, {
        setWalletDisplay, setIncomeDisplay, setNextLabel, setNextCost, setShowBuyPrompt,
        setRoomLabel: (label: string) => { setRoomLabel(label); setShowRoom(true); setTimeout(() => setShowRoom(false), 2500); },
        setProgress,
      });
      gameRef.current = engine;
    });
  }, [user]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => doCloudSave(), 60000);
    return () => clearInterval(interval);
  }, [gameState, doCloudSave]);

  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  // ===== ROBLOX-STYLE UI =====
  return (
    <div className="fixed inset-0" style={{ background: "#1b2a4a" }}>
      <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 1 }} />

      {/* Start Screen — Roblox style */}
      {gameState === "menu" && (
        <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ zIndex: 200, background: "linear-gradient(180deg, #1b2a4a 0%, #2c4a7c 50%, #1b2a4a 100%)" }}>
          {/* Roblox-like logo area */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ width: 80, height: 80, background: "#e2231a", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
              <div style={{ fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: 36, color: "#fff", fontWeight: 900, letterSpacing: -1 }}>GM</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: "clamp(32px,7vw,56px)", color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.5)", letterSpacing: 1, marginBottom: 4 }}>Grand Meridian</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28, letterSpacing: 1 }}>Luxury Resort Tycoon</div>

          <button onClick={() => startGame(false)} style={robloxBtnGreen}>▶ Play</button>
          <button onClick={() => startGame(true)} style={{ ...robloxBtnBlue, opacity: cloudSaveAvailable ? 1 : 0.35, pointerEvents: cloudSaveAvailable ? "auto" : "none", marginTop: 10 }}>
            ☁ Load Save
          </button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{cloudSaveInfo}</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
            {[["WASD", "Move"], ["Space", "Jump"], ["E", "Buy"], ["Mouse", "Camera"]].map(([k, label]) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <kbd style={{ background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "2px 7px", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{k}</kbd>
                {label}
              </div>
            ))}
          </div>

          <button onClick={handleLogout} style={{ marginTop: 20, padding: "6px 18px", fontSize: 12, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer" }}>Log Out</button>
        </div>
      )}

      {/* HUD — Roblox style */}
      {gameState === "playing" && (
        <>
          {/* Top bar */}
          <div style={robloxTopBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, background: "#e2231a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Arial Black', sans-serif", fontSize: 12, color: "#fff", fontWeight: 900 }}>GM</span>
              </div>
              <span style={{ fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: 15, color: "#fff", letterSpacing: 0.5 }}>Grand Meridian</span>
            </div>
          </div>

          {/* Health bar — Roblox style */}
          <div style={robloxHealthContainer}>
            <div style={robloxHealthBg}>
              <div style={{ ...robloxHealthFill, width: `${health}%` }} />
            </div>
          </div>

          {/* Money display — Roblox leaderboard style */}
          <div style={robloxLeaderboard}>
            <div style={robloxLbRow}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>💰 Cash</span>
              <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 14 }}>{walletDisplay}</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={robloxLbRow}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>📈 Income</span>
              <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14 }}>{incomeDisplay}</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={robloxLbRow}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>🏗️ Progress</span>
              <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Save button */}
          <button onClick={doCloudSave} style={robloxSaveBtn}>
            💾 Save {showSaveFlash && <span style={{ color: "#4ade80", marginLeft: 6 }}>✓</span>}
          </button>

          {/* Bottom toolbar — Roblox hotbar style */}
          <div style={robloxHotbar}>
            <div style={robloxHotbarSlot}>
              <div style={{ fontSize: 20 }}>🏗️</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Next</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{nextLabel}</div>
              <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>{nextCost}</div>
            </div>
          </div>

          {/* Buy prompt — Roblox interaction style */}
          {showBuyPrompt && (
            <div style={robloxBuyPrompt}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Press</div>
              <kbd style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 10px", fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>E</kbd>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>to Purchase</div>
            </div>
          )}

          {/* Room label */}
          {showRoom && roomLabel && (
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 50, fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: 24, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.7)", pointerEvents: "none", transition: "opacity .5s" }}>{roomLabel}</div>
          )}

          {/* Crosshair */}
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 40, pointerEvents: "none" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
          </div>
        </>
      )}
    </div>
  );
};

// ===== ROBLOX-STYLE CSS =====
const robloxBtnGreen: React.CSSProperties = { padding: "14px 64px", fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: 22, background: "linear-gradient(180deg, #00b06f 0%, #00a862 100%)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 4px 0 #007a4d, 0 6px 20px rgba(0,0,0,0.3)", letterSpacing: 1, transition: "transform 0.1s", textShadow: "0 1px 3px rgba(0,0,0,0.3)" };
const robloxBtnBlue: React.CSSProperties = { padding: "10px 40px", fontFamily: "'Fredoka One', 'Arial Black', sans-serif", fontSize: 16, background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 3px 0 #1d4ed8, 0 4px 14px rgba(0,0,0,0.3)", letterSpacing: 1, textShadow: "0 1px 2px rgba(0,0,0,0.3)" };
const robloxTopBar: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "linear-gradient(180deg, rgba(30,30,30,0.92) 0%, rgba(30,30,30,0.85) 100%)", height: 42, borderBottom: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" };
const robloxHealthContainer: React.CSSProperties = { position: "fixed", top: 48, left: "50%", transform: "translateX(-50%)", zIndex: 50, pointerEvents: "none" };
const robloxHealthBg: React.CSSProperties = { width: 200, height: 6, background: "rgba(0,0,0,0.5)", borderRadius: 3, overflow: "hidden" };
const robloxHealthFill: React.CSSProperties = { height: "100%", background: "linear-gradient(90deg, #22c55e, #4ade80)", borderRadius: 3, transition: "width 0.3s" };
const robloxLeaderboard: React.CSSProperties = { position: "fixed", top: 50, right: 10, zIndex: 50, background: "rgba(30,30,30,0.85)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", minWidth: 140, pointerEvents: "none" };
const robloxLbRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", gap: 12 };
const robloxSaveBtn: React.CSSProperties = { position: "fixed", top: 50, left: 10, zIndex: 60, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(30,30,30,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer" };
const robloxHotbar: React.CSSProperties = { position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(30,30,30,0.9)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", pointerEvents: "none", minWidth: 220 };
const robloxHotbarSlot: React.CSSProperties = { width: 44, height: 44, background: "rgba(255,255,255,0.08)", borderRadius: 8, border: "2px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
const robloxBuyPrompt: React.CSSProperties = { position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 20px", background: "rgba(30,30,30,0.9)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", pointerEvents: "none" };

// =================== GAME ENGINE ===================

interface UICallbacks {
  setWalletDisplay: (v: string) => void;
  setIncomeDisplay: (v: string) => void;
  setNextLabel: (v: string) => void;
  setNextCost: (v: string) => void;
  setShowBuyPrompt: (v: boolean) => void;
  setRoomLabel: (v: string) => void;
  setProgress: (v: number) => void;
}

function initGameEngine(container: HTMLDivElement, pendingSave: any, doLoad: boolean, ui: UICallbacks) {
  const KEYS: Record<string, boolean> = {};
  const placed: any[] = [];
  const padList: any[] = [];
  const colls: any[] = [];
  const PLAYER_R = 0.65, PLAYER_H = 3.2, PAD_FLOAT = 1.0;
  let camDist = 24, camHeight = 12, camTargetDist = 24, camTargetH = 12;
  let insideRoom = '';
  const ROOMS: any[] = [];
  let wallet = 500, income = 0;
  let vspeed = 0, hspeed = 0, jumping = false;
  let gameRunning = true, nearPad = false;
  let currentBaseY = 0;
  let activePad: any = null;
  let scene: THREE.Scene, cam: THREE.PerspectiveCamera, ren: THREE.WebGLRenderer, clock: THREE.Clock;
  let player: THREE.Group;
  let gpsGrp: THREE.Group;
  let M: Record<string, THREE.MeshStandardMaterial> = {};

  // Mouse orbit camera (Roblox-style: hold right OR left mouse to rotate)
  let camYaw = Math.PI; // horizontal angle
  let camPitch = 0.35; // vertical angle (radians, 0=level, positive=above)
  let isMouseDragging = false;
  let mouseInvertY = false; // Roblox default

  // Roblox-style plastic material
  const s = (c: number, r = 0.45, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

  function initMats() {
    M = {
      concrete: s(0xc4beb6, 0.7), concreteDk: s(0xa09a94, 0.7),
      stoneLight: s(0xbcb6b0, 0.6), stone: s(0x908880, 0.65), slate: s(0x586070, 0.55),
      marble: s(0xf0ede6, 0.1, 0.1), marbleGy: s(0xd0cbc4, 0.15, 0.1),
      plaster: s(0xeee8de, 0.6), plasterW: s(0xe8e0d4, 0.6),
      oakLt: s(0xc89850, 0.5), oakMd: s(0x9a6830, 0.5), oakDk: s(0x704020, 0.5),
      walnut: s(0x583418, 0.45), ebony: s(0x1a1816, 0.4),
      steel: s(0xa0b4c0, 0.2, 0.8), chrome: s(0xd4e0ea, 0.08, 0.9),
      brass: s(0xb8900e, 0.2, 0.7), darkMet: s(0x384450, 0.3, 0.65),
      cream: s(0xf0e8d0, 0.55), linen: s(0xdcd0b4, 0.6), ivory: s(0xf8f0de, 0.55),
      navyFab: s(0x1e2e48, 0.6), tealFab: s(0x104848, 0.6),
      charFab: s(0x282c34, 0.65), burg: s(0x7a1020, 0.6),
      sage: s(0x506050, 0.55), warmGy: s(0x6c685e, 0.6),
      glassBlue: s(0x80c0e0, 0.04, 0.15), glassCl: s(0xc0dce8, 0.03, 0.1),
      grass: s(0x4ca848, 0.55), palmGn: s(0x2e7830, 0.55), trunk: s(0x7a5820, 0.6),
      snow: s(0xf8f8f8, 0.35), snowDk: s(0xdce0e4, 0.4),
      rock: s(0x787068, 0.65), rockDk: s(0x585050, 0.7),
      poolBlue: s(0x0090c0, 0.04, 0.15), poolTile: s(0xa0c0d0, 0.35),
      gold: s(0xc09810, 0.15, 0.75), goldLt: s(0xdcb030, 0.18, 0.7),
      white: s(0xf8f8f8, 0.2, 0.05), black: s(0x141618, 0.3),
      charcoal: s(0x222630, 0.35), offWht: s(0xf4eee0, 0.55),
      path: s(0xc8bca8, 0.6), cobalt: s(0x1830b0, 0.55),
      terracotta: s(0xb84838, 0.55), water: s(0x1a88b0, 0.04, 0.15),
      // Roblox-specific colors
      robloxGreen: s(0x4ca848, 0.45),
      robloxBrick: s(0xc4281c, 0.5),
      robloxBlue: s(0x1e5ecc, 0.45),
      robloxYellow: s(0xf5cd30, 0.45),
    };
  }

  const ISLANDS = [
    { id: 'lobby', cx: 0, cz: 0, r: 120, h: 4, color: 0x4ca848, label: 'Main Island' },
    { id: 'pool', cx: 260, cz: 0, r: 100, h: 4, color: 0x4ca848, label: 'Pool Island' },
    { id: 'restaurant', cx: -260, cz: 0, r: 100, h: 4, color: 0x4ca848, label: 'Restaurant Island' },
    { id: 'mountain', cx: 0, cz: -380, r: 150, h: 4, color: 0x4c8040, label: 'Mountain Island' },
  ];

  // ... STEPS data is identical ...
  const STEPS: any[] = [
    {id:1,x:0,z:0,cost:0,label:'Lobby Foundation',type:'floor',mat:'concrete',inc:5,w:58,h:0.7,d:58,need:0,ox:0,oz:34},
    {id:2,x:0,z:0,cost:100,label:'Marble Lobby Floor',type:'floor',mat:'marble',inc:12,w:56,h:0.22,d:56,need:1,ox:0,oz:33},
    {id:3,x:0,z:27,cost:300,label:'Glass Entry Facade',type:'wall',mat:'glassBlue',inc:25,w:58,h:8,d:0.5,need:2,ox:0,oz:-10,dw:6,dh:6.5},
    {id:4,x:-28,z:0,cost:250,label:'Lobby Left Wall',type:'wall',mat:'plasterW',inc:20,w:0.5,h:8,d:56,need:3,ox:6,oz:0,dw:5,dh:6.5},
    {id:5,x:28,z:0,cost:250,label:'Lobby Right Wall',type:'wall',mat:'plasterW',inc:20,w:0.5,h:8,d:56,need:4,ox:-6,oz:0,dw:5,dh:6.5},
    {id:6,x:0,z:-27,cost:250,label:'Lobby Back Wall',type:'wall',mat:'plasterW',inc:20,w:58,h:8,d:0.5,need:5,ox:0,oz:8,dw:5,dh:6.5},
    {id:7,x:0,z:15,cost:500,label:'Reception Counter',type:'custom',mat:'walnut',inc:30,w:18,h:1.3,d:2.5,need:6,ox:13,oz:0,custom:'reception'},
    {id:8,x:0,z:15,cost:200,label:'Computer Terminals',type:'custom',mat:'charcoal',inc:15,w:6,h:0.8,d:0.4,need:7,ox:13,oz:0,custom:'monitors'},
    {id:9,x:-17,z:7,cost:400,label:'Lobby Sofa A',type:'custom',mat:'navyFab',inc:25,w:8,h:1,d:3,need:8,ox:-12,oz:0,custom:'sofa'},
    {id:10,x:-17,z:1,cost:400,label:'Lobby Sofa B',type:'custom',mat:'navyFab',inc:25,w:8,h:1,d:3,need:9,ox:-12,oz:0,custom:'sofa'},
    {id:11,x:-17,z:4,cost:250,label:'Coffee Table L',type:'custom',mat:'marbleGy',inc:18,w:3.5,h:0.45,d:1.6,need:10,ox:-12,oz:0,custom:'coffeetbl'},
    {id:12,x:17,z:7,cost:400,label:'Lobby Sofa C',type:'custom',mat:'tealFab',inc:25,w:8,h:1,d:3,need:11,ox:12,oz:0,custom:'sofa'},
    {id:13,x:17,z:1,cost:400,label:'Lobby Sofa D',type:'custom',mat:'tealFab',inc:25,w:8,h:1,d:3,need:12,ox:12,oz:0,custom:'sofa'},
    {id:14,x:17,z:4,cost:250,label:'Coffee Table R',type:'custom',mat:'marbleGy',inc:18,w:3.5,h:0.45,d:1.6,need:13,ox:12,oz:0,custom:'coffeetbl'},
    {id:15,x:0,z:-15,cost:600,label:'Grand Piano',type:'custom',mat:'ebony',inc:55,w:5,h:1.4,d:4.2,need:14,ox:8,oz:0,custom:'piano'},
    {id:16,x:-21,z:-19,cost:350,label:'Lobby Planter L',type:'palm',mat:'palmGn',inc:15,w:2,h:6,d:2,need:15,ox:-5,oz:0},
    {id:17,x:21,z:-19,cost:350,label:'Lobby Planter R',type:'palm',mat:'palmGn',inc:15,w:2,h:6,d:2,need:16,ox:5,oz:0},
    {id:18,x:0,z:0,cost:800,label:'Coffered Ceiling',type:'custom',mat:'plaster',inc:20,w:58,h:0.5,d:58,need:17,ox:0,oz:33,custom:'ceiling'},
    {id:19,x:0,z:0,cost:1200,label:'Chandelier Array',type:'custom',mat:'brass',inc:30,w:58,h:1,d:58,need:18,ox:0,oz:33,custom:'chandeliers'},
    {id:20,x:0,z:-68,cost:5000,label:'Suite Foundation',type:'floor',mat:'concrete',inc:100,w:36,h:0.7,d:36,need:19,ox:0,oz:-22},
    {id:21,x:0,z:-68,cost:800,label:'Suite Hardwood Floor',type:'floor',mat:'oakLt',inc:60,w:34,h:0.22,d:34,need:20,ox:0,oz:-21},
    {id:22,x:-17,z:-68,cost:600,label:'Suite Wall Left',type:'wall',mat:'plasterW',inc:25,w:0.5,h:7,d:36,need:21,ox:6,oz:0,dw:4,dh:6},
    {id:23,x:17,z:-68,cost:600,label:'Suite Wall Right',type:'wall',mat:'plasterW',inc:25,w:0.5,h:7,d:36,need:22,ox:-6,oz:0,dw:4,dh:6},
    {id:24,x:0,z:-50,cost:600,label:'Suite Entry Wall',type:'wall',mat:'plasterW',inc:25,w:36,h:7,d:0.5,need:23,ox:0,oz:-8,dw:4,dh:6},
    {id:25,x:0,z:-86,cost:600,label:'Suite Back Wall',type:'wall',mat:'plasterW',inc:25,w:36,h:7,d:0.5,need:24,ox:0,oz:8,dw:4,dh:6},
    {id:26,x:0,z:-74,cost:2500,label:'King Bed Frame',type:'custom',mat:'walnut',inc:80,w:14,h:1.2,d:16,need:25,ox:12,oz:0,custom:'bedframe'},
    {id:27,x:0,z:-74,cost:1200,label:'Premium Mattress',type:'custom',mat:'linen',inc:45,w:13,h:1.0,d:15,need:26,ox:12,oz:0,custom:'mattress'},
    {id:28,x:0,z:-80,cost:350,label:'Down Pillows',type:'custom',mat:'ivory',inc:18,w:10,h:0.5,d:2.8,need:27,ox:12,oz:0,custom:'pillows'},
    {id:29,x:-11,z:-78,cost:800,label:'Nightstand Left',type:'custom',mat:'walnut',inc:25,w:3.5,h:1.6,d:3.5,need:28,ox:-10,oz:0,custom:'nightstand'},
    {id:30,x:11,z:-78,cost:800,label:'Nightstand Right',type:'custom',mat:'walnut',inc:25,w:3.5,h:1.6,d:3.5,need:29,ox:10,oz:0,custom:'nightstand'},
    {id:31,x:-11,z:-78,cost:450,label:'Lamp Left',type:'custom',mat:'brass',inc:15,w:1,h:2.8,d:1,need:30,ox:-10,oz:0,custom:'lamp'},
    {id:32,x:11,z:-78,cost:450,label:'Lamp Right',type:'custom',mat:'brass',inc:15,w:1,h:2.8,d:1,need:31,ox:10,oz:0,custom:'lamp'},
    {id:33,x:0,z:-60,cost:1200,label:'Suite TV',type:'custom',mat:'black',inc:35,w:5,h:3,d:0.12,need:32,ox:12,oz:0,custom:'tv'},
    {id:34,x:-10,z:-59,cost:900,label:'Armchair Left',type:'custom',mat:'sage',inc:22,w:3.5,h:2.6,d:3.5,need:33,ox:-8,oz:0,custom:'armchair'},
    {id:35,x:10,z:-59,cost:900,label:'Armchair Right',type:'custom',mat:'sage',inc:22,w:3.5,h:2.6,d:3.5,need:34,ox:8,oz:0,custom:'armchair'},
    {id:36,x:0,z:-56,cost:700,label:'Writing Desk',type:'custom',mat:'oakMd',inc:28,w:4.5,h:2.4,d:2.2,need:35,ox:12,oz:0,custom:'desk'},
    {id:37,x:12,z:-80,cost:3500,label:'Luxury Bathtub',type:'custom',mat:'white',inc:65,w:5,h:1.5,d:3,need:36,ox:10,oz:0,custom:'bathtub'},
    {id:38,x:-12,z:-80,cost:2000,label:'Double Vanity',type:'custom',mat:'walnut',inc:45,w:5,h:2.5,d:2,need:37,ox:-10,oz:0,custom:'vanity'},
    {id:39,x:-12,z:-84,cost:800,label:'Suite Toilet',type:'custom',mat:'white',inc:15,w:1.8,h:1.5,d:2,need:38,ox:-10,oz:0,custom:'toilet'},
    {id:40,x:0,z:-68,cost:1500,label:'Suite Planter',type:'palm',mat:'palmGn',inc:12,w:2,h:5,d:2,need:39,ox:14,oz:0},
    {id:41,x:128,z:0,cost:8000,label:'East Bridge Deck',type:'floor',mat:'slate',inc:250,w:20,h:1.2,d:20,need:40,ox:12,oz:0},
    {id:42,x:155,z:0,cost:12000,label:'East Bridge Span',type:'floor',mat:'slate',inc:450,w:54,h:1.2,d:20,need:41,ox:12,oz:0},
    {id:43,x:155,z:-10,cost:3500,label:'East Bridge Rail L',type:'block',mat:'stoneLight',inc:80,w:74,h:2.5,d:0.8,need:42,ox:0,oz:0},
    {id:44,x:155,z:10,cost:3500,label:'East Bridge Rail R',type:'block',mat:'stoneLight',inc:80,w:74,h:2.5,d:0.8,need:43,ox:0,oz:0},
    {id:45,x:135,z:0,cost:10000,label:'East Bridge Tower L',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:44,ox:-9,oz:0,custom:'pylon'},
    {id:46,x:175,z:0,cost:10000,label:'East Bridge Tower R',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:45,ox:9,oz:0,custom:'pylon'},
    {id:47,x:155,z:0,cost:6000,label:'East Bridge Cross Beam',type:'block',mat:'stoneLight',inc:150,w:3,h:2,d:22,need:46,ox:0,oz:0},
    {id:48,x:260,z:0,cost:15000,label:'Pool Foundation',type:'floor',mat:'concrete',inc:500,w:60,h:0.7,d:60,need:47,ox:0,oz:36},
    {id:49,x:260,z:0,cost:3000,label:'Pool Terrace Floor',type:'floor',mat:'marble',inc:100,w:58,h:0.22,d:58,need:48,ox:0,oz:35},
    {id:50,x:260,z:8,cost:18000,label:'Infinity Pool',type:'custom',mat:'poolTile',inc:650,w:30,h:1.2,d:16,need:49,ox:0,oz:-12,custom:'pool'},
    {id:51,x:260,z:-14,cost:8000,label:'Jacuzzi',type:'custom',mat:'marble',inc:400,w:7,h:2,d:7,need:50,ox:0,oz:-10,custom:'jacuzzi'},
    {id:52,x:245,z:22,cost:2500,label:'Lounger 1',type:'custom',mat:'cobalt',inc:90,w:2.5,h:0.6,d:6.5,need:51,ox:-6,oz:0,custom:'lounger'},
    {id:53,x:250,z:22,cost:2500,label:'Lounger 2',type:'custom',mat:'cobalt',inc:90,w:2.5,h:0.6,d:6.5,need:52,ox:-3,oz:0,custom:'lounger'},
    {id:54,x:255,z:22,cost:2500,label:'Lounger 3',type:'custom',mat:'cobalt',inc:90,w:2.5,h:0.6,d:6.5,need:53,ox:3,oz:0,custom:'lounger'},
    {id:55,x:260,z:22,cost:2500,label:'Lounger 4',type:'custom',mat:'cobalt',inc:90,w:2.5,h:0.6,d:6.5,need:54,ox:6,oz:0,custom:'lounger'},
    {id:56,x:245,z:22,cost:1800,label:'Umbrella 1',type:'custom',mat:'terracotta',inc:60,w:1,h:5.5,d:1,need:55,ox:-6,oz:0,custom:'umbrella'},
    {id:57,x:260,z:22,cost:1800,label:'Umbrella 2',type:'custom',mat:'terracotta',inc:60,w:1,h:5.5,d:1,need:56,ox:6,oz:0,custom:'umbrella'},
    {id:58,x:275,z:-6,cost:6000,label:'Pool Bar',type:'custom',mat:'oakDk',inc:300,w:14,h:3.2,d:5,need:57,ox:10,oz:0,custom:'bar'},
    {id:59,x:275,z:-6,cost:2500,label:'Pool Bar Stools',type:'custom',mat:'steel',inc:120,w:12,h:2.2,d:2,need:58,ox:10,oz:0,custom:'barstools'},
    {id:60,x:247,z:-10,cost:2000,label:'Pool Palm A',type:'palm',mat:'palmGn',inc:30,w:2,h:7,d:2,need:59,ox:-6,oz:0},
    {id:61,x:273,z:-10,cost:2000,label:'Pool Palm B',type:'palm',mat:'palmGn',inc:30,w:2,h:7,d:2,need:60,ox:6,oz:0},
    {id:62,x:247,z:28,cost:2000,label:'Pool Palm C',type:'palm',mat:'palmGn',inc:30,w:2,h:7,d:2,need:61,ox:-6,oz:0},
    {id:63,x:273,z:28,cost:2000,label:'Pool Palm D',type:'palm',mat:'palmGn',inc:30,w:2,h:7,d:2,need:62,ox:6,oz:0},
    {id:64,x:-128,z:0,cost:8000,label:'West Bridge Deck',type:'floor',mat:'slate',inc:250,w:20,h:1.2,d:20,need:63,ox:-12,oz:0},
    {id:65,x:-155,z:0,cost:12000,label:'West Bridge Span',type:'floor',mat:'slate',inc:450,w:54,h:1.2,d:20,need:64,ox:-12,oz:0},
    {id:66,x:-155,z:-10,cost:3500,label:'West Bridge Rail L',type:'block',mat:'stoneLight',inc:80,w:74,h:2.5,d:0.8,need:65,ox:0,oz:0},
    {id:67,x:-155,z:10,cost:3500,label:'West Bridge Rail R',type:'block',mat:'stoneLight',inc:80,w:74,h:2.5,d:0.8,need:66,ox:0,oz:0},
    {id:68,x:-135,z:0,cost:10000,label:'West Bridge Tower L',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:67,ox:-9,oz:0,custom:'pylon'},
    {id:69,x:-175,z:0,cost:10000,label:'West Bridge Tower R',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:68,ox:9,oz:0,custom:'pylon'},
    {id:70,x:-155,z:0,cost:6000,label:'West Bridge Cross Beam',type:'block',mat:'stoneLight',inc:150,w:3,h:2,d:22,need:69,ox:0,oz:0},
    {id:71,x:-114,z:30,cost:5000,label:'Waterfall Rock',type:'custom',mat:'stone',inc:200,w:6,h:5,d:5,need:70,ox:-10,oz:0,custom:'fireplace'},
    {id:72,x:-114,z:-30,cost:5000,label:'Zen Garden Boulder',type:'custom',mat:'rock',inc:200,w:5,h:3,d:5,need:71,ox:10,oz:0,custom:'fireplace'},
    {id:73,x:60,z:50,cost:3000,label:'Resort Palm East A',type:'palm',mat:'palmGn',inc:40,w:3,h:8,d:3,need:72,ox:8,oz:0},
    {id:74,x:-60,z:50,cost:3000,label:'Resort Palm West A',type:'palm',mat:'palmGn',inc:40,w:3,h:8,d:3,need:73,ox:-8,oz:0},
    {id:75,x:-260,z:0,cost:22000,label:'Restaurant Foundation',type:'floor',mat:'concrete',inc:600,w:60,h:0.7,d:60,need:74,ox:0,oz:-36},
    {id:76,x:-260,z:0,cost:3000,label:'Herringbone Oak Floor',type:'floor',mat:'oakMd',inc:80,w:58,h:0.22,d:58,need:75,ox:0,oz:-35},
    {id:77,x:-232,z:0,cost:900,label:'Restaurant Wall Front',type:'wall',mat:'plasterW',inc:30,w:0.5,h:8,d:60,need:76,ox:6,oz:0,dw:5,dh:7},
    {id:78,x:-288,z:0,cost:900,label:'Restaurant Wall Back',type:'wall',mat:'plasterW',inc:30,w:0.5,h:8,d:60,need:77,ox:-6,oz:0,dw:5,dh:7},
    {id:79,x:-260,z:30,cost:900,label:'Restaurant Wall N',type:'wall',mat:'plasterW',inc:30,w:60,h:8,d:0.5,need:78,ox:0,oz:-8,dw:5,dh:7},
    {id:80,x:-260,z:-30,cost:900,label:'Restaurant Wall S',type:'wall',mat:'plasterW',inc:30,w:60,h:8,d:0.5,need:79,ox:0,oz:8,dw:5,dh:7},
    {id:81,x:-250,z:12,cost:2800,label:'Dining Table A',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:80,ox:9,oz:0,custom:'diningtable'},
    {id:82,x:-250,z:-2,cost:2800,label:'Dining Table B',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:81,ox:9,oz:0,custom:'diningtable'},
    {id:83,x:-262,z:12,cost:2800,label:'Dining Table C',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:82,ox:-9,oz:0,custom:'diningtable'},
    {id:84,x:-262,z:-2,cost:2800,label:'Dining Table D',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:83,ox:-9,oz:0,custom:'diningtable'},
    {id:85,x:-274,z:12,cost:2800,label:'Dining Table E',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:84,ox:-10,oz:0,custom:'diningtable'},
    {id:86,x:-274,z:-2,cost:2800,label:'Dining Table F',type:'custom',mat:'walnut',inc:90,w:5,h:1.8,d:5,need:85,ox:-10,oz:0,custom:'diningtable'},
    {id:87,x:-260,z:-24,cost:14000,label:'Open Kitchen',type:'custom',mat:'steel',inc:500,w:24,h:3.5,d:7,need:86,ox:0,oz:-10,custom:'kitchen'},
    {id:88,x:-260,z:-24,cost:4000,label:'Kitchen Counter',type:'custom',mat:'marble',inc:150,w:22,h:0.3,d:6.8,need:87,ox:0,oz:9,custom:'counter'},
    {id:89,x:-260,z:24,cost:8000,label:'Wine Bar',type:'custom',mat:'walnut',inc:400,w:20,h:3.2,d:5,need:88,ox:0,oz:-9,custom:'bar'},
    {id:90,x:-260,z:24,cost:3000,label:'Bar Stools',type:'custom',mat:'steel',inc:100,w:18,h:2.2,d:2,need:89,ox:0,oz:7,custom:'barstools'},
    {id:91,x:-244,z:0,cost:2000,label:'Restaurant Palm A',type:'palm',mat:'palmGn',inc:40,w:2,h:7,d:2,need:90,ox:6,oz:0},
    {id:92,x:-276,z:0,cost:2000,label:'Restaurant Palm B',type:'palm',mat:'palmGn',inc:40,w:2,h:7,d:2,need:91,ox:-6,oz:0},
    {id:93,x:0,z:-128,cost:50000,label:'South Bridge Deck',type:'floor',mat:'slate',inc:900,w:20,h:1.2,d:20,need:92,ox:12,oz:0},
    {id:94,x:0,z:-185,cost:90000,label:'South Bridge Span',type:'floor',mat:'slate',inc:1800,w:20,h:1.2,d:110,need:93,ox:12,oz:0},
    {id:95,x:-10,z:-180,cost:22000,label:'South Bridge Rail L',type:'block',mat:'stoneLight',inc:350,w:0.8,h:2.5,d:130,need:94,ox:0,oz:0},
    {id:96,x:10,z:-180,cost:22000,label:'South Bridge Rail R',type:'block',mat:'stoneLight',inc:350,w:0.8,h:2.5,d:130,need:95,ox:0,oz:0},
    {id:97,x:0,z:-165,cost:65000,label:'South Bridge Tower L',type:'custom',mat:'stoneLight',inc:1200,w:3.5,h:36,d:3.5,need:96,ox:-12,oz:0,custom:'pylon'},
    {id:98,x:0,z:-205,cost:65000,label:'South Bridge Tower R',type:'custom',mat:'stoneLight',inc:1200,w:3.5,h:36,d:3.5,need:97,ox:12,oz:0,custom:'pylon'},
    {id:99,x:0,z:-185,cost:35000,label:'South Bridge Cross Beam',type:'block',mat:'stoneLight',inc:700,w:22,h:2,d:2,need:98,ox:0,oz:0},
    {id:100,x:0,z:-380,cost:250000,label:'Mountain Lodge Base',type:'floor',mat:'concrete',inc:6000,w:100,h:1,d:100,need:99,ox:0,oz:-58},
    {id:101,x:0,z:-400,cost:100000,label:'Lodge Structure',type:'wall',mat:'oakDk',inc:3000,w:50,h:14,d:50,need:100,ox:30,oz:0,dw:7,dh:9},
    {id:102,x:0,z:-400,cost:55000,label:'Lodge Interior Floor',type:'floor',mat:'walnut',inc:1200,w:48,h:0.3,d:48,need:101,ox:0,oz:0},
    {id:103,x:0,z:-400,cost:70000,label:'A-Frame Roof',type:'custom',mat:'ebony',inc:2500,w:52,h:6,d:52,need:102,ox:30,oz:0,custom:'aroof'},
    {id:104,x:-16,z:-394,cost:15000,label:'Stone Fireplace',type:'custom',mat:'stone',inc:800,w:5,h:8,d:5,need:103,ox:-12,oz:0,custom:'fireplace'},
    {id:105,x:0,z:-394,cost:12000,label:'Lodge Sofa Set',type:'custom',mat:'burg',inc:700,w:12,h:1.8,d:5,need:104,ox:12,oz:0,custom:'sofa'},
    {id:106,x:0,z:-389,cost:5000,label:'Lodge Table',type:'custom',mat:'oakDk',inc:400,w:6,h:1.5,d:3,need:105,ox:12,oz:0,custom:'coffeetbl'},
    {id:107,x:16,z:-394,cost:9000,label:'Lodge Bar',type:'custom',mat:'walnut',inc:500,w:9,h:3,d:4,need:106,ox:13,oz:0,custom:'bar'},
    {id:108,x:-26,z:-384,cost:12000,label:'Ski Wall',type:'custom',mat:'darkMet',inc:450,w:8,h:5,d:1.5,need:107,ox:-14,oz:0,custom:'skiwall'},
    {id:109,x:-42,z:-430,cost:11000,label:'Alpine Pine A',type:'palm',mat:'palmGn',inc:280,w:4,h:18,d:4,need:108,ox:-9,oz:0},
    {id:110,x:42,z:-430,cost:11000,label:'Alpine Pine B',type:'palm',mat:'palmGn',inc:280,w:4,h:18,d:4,need:109,ox:9,oz:0},
    {id:111,x:-28,z:-446,cost:11000,label:'Alpine Pine C',type:'palm',mat:'palmGn',inc:280,w:4,h:18,d:4,need:110,ox:-9,oz:0},
    {id:112,x:28,z:-446,cost:11000,label:'Alpine Pine D',type:'palm',mat:'palmGn',inc:280,w:4,h:18,d:4,need:111,ox:9,oz:0},
    {id:113,x:0,z:-355,cost:800000,label:'Grand Meridian Arch',type:'custom',mat:'goldLt',inc:30000,w:22,h:9,d:3,need:112,ox:0,oz:9,custom:'arch'},
  ];

  function fmt(n: number) { n = Math.floor(n); if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'; return '$' + n; }
  function getMat(n: string) { return M[n] || M.plaster; }
  function adjColor(hex: number, f: number) { return (Math.min(255, Math.floor(((hex >> 16) & 0xff) * f)) << 16) | (Math.min(255, Math.floor(((hex >> 8) & 0xff) * f)) << 8) | Math.min(255, Math.floor((hex & 0xff) * f)); }

  function addColl(wx: number, wz: number, ww: number, wh: number, wd: number, wy = 0) {
    colls.push({ x0: wx - ww / 2, x1: wx + ww / 2, y0: currentBaseY + wy, y1: currentBaseY + wy + wh, z0: wz - wd / 2, z1: wz + wd / 2 });
  }
  function testAABB(px: number, py: number, pz: number) {
    for (const c of colls) { if (px + PLAYER_R > c.x0 && px - PLAYER_R < c.x1 && py + PLAYER_H > c.y0 && py < c.y1 && pz + PLAYER_R > c.z0 && pz - PLAYER_R < c.z1) return true; }
    return false;
  }
  function resolveMove(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number) {
    if (!testAABB(nx, ny, nz)) { player.position.set(nx, ny, nz); return; }
    if (!testAABB(nx, oy, oz)) { player.position.x = nx; return; }
    if (!testAABB(ox, oy, nz)) { player.position.z = nz; return; }
    if (!testAABB(ox, ny, oz)) { player.position.y = ny; return; }
    player.position.set(ox, oy, oz);
    if (ny !== oy) vspeed = 0;
  }

  function getRoomLabel(st: any) {
    if (st.label.includes('Lobby')) return 'Grand Lobby';
    if (st.label.includes('Suite')) return 'Penthouse Suite';
    if (st.label.includes('Restaurant')) return 'La Meridian Restaurant';
    if (st.label.includes('Lodge')) return 'Mountain Lodge';
    return 'Interior';
  }

  function checkRoom() {
    const px = player.position.x, pz = player.position.z;
    for (const r of ROOMS) {
      if (px > r.x0 && px < r.x1 && pz > r.z0 && pz < r.z1) {
        if (insideRoom !== r.label) { insideRoom = r.label; ui.setRoomLabel(r.label); }
        camTargetDist = 10; camTargetH = 5; return;
      }
    }
    if (insideRoom !== '') insideRoom = '';
    camTargetDist = 24; camTargetH = 12;
  }

  function getGroundY(x: number, z: number) {
    for (const st of STEPS) {
      if (!st.bought) continue;
      if (st.type === 'floor' && (st.label.includes('Bridge') || st.label.includes('Span') || st.label.includes('Deck'))) {
        if (x > st.x - st.w / 2 && x < st.x + st.w / 2 && z > st.z - st.d / 2 && z < st.z + st.d / 2) return 4;
      }
    }
    for (const isl of ISLANDS) {
      const dx = x - isl.cx, dz = z - isl.cz;
      if (Math.sqrt(dx * dx + dz * dz) < isl.r + 2) return isl.h;
    }
    return -2;
  }

  function getBaseY(st: any): number {
    if (st.type === 'floor' && (st.label.includes('Bridge') || st.label.includes('Span') || st.label.includes('Deck'))) return 4 - st.h;
    if (st.label.includes('Bridge')) return 4;
    for (const isl of ISLANDS) {
      const dx = st.x - isl.cx, dz = st.z - isl.cz;
      if (Math.sqrt(dx * dx + dz * dz) < isl.r + 20) return isl.h;
    }
    return 0;
  }

  // ===== ROBLOX R6 CHARACTER =====
  function buildPlayer() {
    const grp = new THREE.Group();
    const plasticMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.05 });
    const skinColor = 0xf5c89a;
    const shirtColor = 0x1e5ecc; // Roblox blue
    const pantsColor = 0x2a5e2a; // dark green
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const me = new THREE.Mesh(g, m);
      me.position.set(x, y, z); me.castShadow = true; grp.add(me); return me;
    };

    // Head (Roblox: 1.2 x 1.2 x 1.2 stud, cylindrical-ish but we do box)
    mk(new THREE.BoxGeometry(1.2, 1.2, 1.2), plasticMat(skinColor), 0, 3.6, 0);
    // Face - simple Roblox face: eyes and smile
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    // Left eye
    mk(new THREE.BoxGeometry(0.18, 0.12, 0.02), faceMat, -0.22, 3.68, 0.61);
    // Right eye
    mk(new THREE.BoxGeometry(0.18, 0.12, 0.02), faceMat, 0.22, 3.68, 0.61);
    // Smile
    mk(new THREE.BoxGeometry(0.4, 0.06, 0.02), faceMat, 0, 3.38, 0.61);
    mk(new THREE.BoxGeometry(0.06, 0.1, 0.02), faceMat, -0.2, 3.42, 0.61);
    mk(new THREE.BoxGeometry(0.06, 0.1, 0.02), faceMat, 0.2, 3.42, 0.61);

    // Torso (Roblox: 2 x 2 x 1 stud)
    mk(new THREE.BoxGeometry(1.6, 1.6, 0.8), plasticMat(shirtColor), 0, 2.4, 0);

    // Left Arm
    mk(new THREE.BoxGeometry(0.5, 1.6, 0.5), plasticMat(shirtColor), -1.05, 2.4, 0);
    // Left Hand
    mk(new THREE.BoxGeometry(0.5, 0.3, 0.5), plasticMat(skinColor), -1.05, 1.45, 0);

    // Right Arm
    mk(new THREE.BoxGeometry(0.5, 1.6, 0.5), plasticMat(shirtColor), 1.05, 2.4, 0);
    // Right Hand
    mk(new THREE.BoxGeometry(0.5, 0.3, 0.5), plasticMat(skinColor), 1.05, 1.45, 0);

    // Left Leg
    mk(new THREE.BoxGeometry(0.6, 1.3, 0.6), plasticMat(pantsColor), -0.4, 0.95, 0);
    // Left Foot
    mk(new THREE.BoxGeometry(0.6, 0.3, 0.7), plasticMat(0x333333), -0.4, 0.15, 0.05);

    // Right Leg
    mk(new THREE.BoxGeometry(0.6, 1.3, 0.6), plasticMat(pantsColor), 0.4, 0.95, 0);
    // Right Foot
    mk(new THREE.BoxGeometry(0.6, 0.3, 0.7), plasticMat(0x333333), 0.4, 0.15, 0.05);

    return grp;
  }

  const gpsMat = new THREE.MeshBasicMaterial({ color: 0xffe040, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });

  function rebuildGPS() {
    while (gpsGrp.children.length) gpsGrp.remove(gpsGrp.children[0]);
    if (!activePad) return;
    const fx = player.position.x, fz = player.position.z;
    const tx = activePad.position.x, tz = activePad.position.z;
    const dx = tx - fx, dz = tz - fz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1) return;
    const nx = dx / dist, nz = dz / dist, ang = Math.atan2(nx, nz);
    const geo = new THREE.BoxGeometry(0.42, 0.22, 2.0);
    const STEP = 3.2, n = Math.floor((dist - 3) / STEP);
    for (let i = 0; i < n; i++) {
      const t = 3 + (i + 0.5) * STEP;
      if (t >= dist - 2) break;
      const seg = new THREE.Mesh(geo, gpsMat);
      seg.position.set(fx + nx * t, 4.9, fz + nz * t);
      seg.rotation.y = ang; seg.renderOrder = 999;
      gpsGrp.add(seg);
    }
  }

  function buildIslands() {
    ISLANDS.forEach(isl => {
      // Roblox-style: flat green terrain with visible edges
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.r, isl.r + 4, isl.h, 48),
        new THREE.MeshStandardMaterial({ color: 0x7c5c38, roughness: 0.7 }) // brown earth sides
      );
      body.position.set(isl.cx, isl.h / 2, isl.cz); body.receiveShadow = true; body.castShadow = true; scene.add(body);

      // Grass top — Roblox bright green
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.r, isl.r, 0.5, 48),
        new THREE.MeshStandardMaterial({ color: isl.color, roughness: 0.5, metalness: 0.02 })
      );
      cap.position.set(isl.cx, isl.h - 0.25, isl.cz); cap.receiveShadow = true; scene.add(cap);

      // Sand ring
      const beach = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.r + 8, isl.r + 14, 1, 48),
        new THREE.MeshStandardMaterial({ color: 0xd4c090, roughness: 0.75 })
      );
      beach.position.set(isl.cx, -0.5, isl.cz); beach.receiveShadow = true; scene.add(beach);

      if (isl.id === 'mountain') buildMountain(isl.cx, isl.cz);
      scatterTrees(isl);
    });
  }

  function buildMountain(cx: number, cz: number) {
    // Roblox-style blocky mountain
    const layers = [
      { r: 60, h: 18, y: 4, c: 0x6a8a4a },
      { r: 42, h: 14, y: 22, c: 0x788850 },
      { r: 28, h: 12, y: 36, c: 0x909080 },
      { r: 16, h: 10, y: 48, c: 0xb0a8a0 },
      { r: 8, h: 8, y: 58, c: 0xf0ece8 },
    ];
    layers.forEach(l => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(l.r * 0.85, l.r, l.h, 8), // octagonal = more Roblox
        new THREE.MeshStandardMaterial({ color: l.c, roughness: 0.6, metalness: 0.02 })
      );
      m.position.set(cx, l.y + l.h / 2, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    });
  }

  function scatterTrees(isl: any) {
    const count = Math.floor(isl.r * 0.25);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * (isl.r - 20);
      const tx = isl.cx + Math.cos(ang) * dist;
      const tz = isl.cz + Math.sin(ang) * dist;
      const treeGrp = new THREE.Group();

      // Roblox-style tree: brown cylinder trunk + green sphere/cone top
      const trunkH = 3 + Math.random() * 4;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.6 })
      );
      trunk.position.y = trunkH / 2; trunk.castShadow = true; treeGrp.add(trunk);

      // Roblox trees have spherical foliage
      const foliageR = 1.5 + Math.random() * 2;
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(foliageR, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a9a3a, roughness: 0.5, metalness: 0.02 })
      );
      foliage.position.y = trunkH + foliageR * 0.6;
      foliage.castShadow = true; treeGrp.add(foliage);

      treeGrp.position.set(tx, isl.h, tz);
      scene.add(treeGrp);
    }
  }

  function buildPaths() {
    // Roblox-style flat path blocks
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xc8bca8, roughness: 0.6 });
    const makePathSeg = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), pathMat);
      m.position.set(x, 4.08, z); m.receiveShadow = true; scene.add(m);
    };
    makePathSeg(0, 35, 8, 16);
    makePathSeg(0, -35, 8, 16);
    makePathSeg(35, 0, 16, 8);
    makePathSeg(-35, 0, 16, 8);
  }

  function buildEnvironment() {
    // Roblox-style: some flowers, lanterns, simple decorations
    const flowerColors = [0xff4060, 0xff80a0, 0xffff60, 0xc060ff, 0xff6030, 0x60c0ff];
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 55 + Math.sin(i * 2.7) * 8;
      const fx = Math.cos(ang) * dist, fz = Math.sin(ang) * dist;
      // Blocky Roblox flowers
      const flower = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.5 })
      );
      flower.position.set(fx, 4.25, fz); scene.add(flower);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), M.palmGn);
      stem.position.set(fx, 4.0, fz); scene.add(stem);
    }

    // Lanterns — Roblox style (simple cylinders with glow)
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      [-6, 6].forEach(ox => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6), M.darkMet);
        pole.position.set(ox, 5.75, i * 10); scene.add(pole);
        const lantern = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffe080, emissiveIntensity: 0.7, roughness: 0.3 })
        );
        lantern.position.set(ox, 7.6, i * 10); scene.add(lantern);
      });
    }

    // Stepping stones on pool island — blocky
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 55;
      const rx = 260 + Math.cos(ang) * dist, rz = Math.sin(ang) * dist;
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 + Math.random() * 2, 0.6, 1.5 + Math.random() * 2),
        new THREE.MeshStandardMaterial({ color: 0x908880, roughness: 0.6 })
      );
      rock.position.set(rx, 3.9, rz);
      rock.rotation.y = Math.random() * Math.PI; scene.add(rock);
    }

    // Seagulls — simple cross shapes
    for (let i = 0; i < 8; i++) {
      const bird = new THREE.Group();
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.5 });
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3), wingMat);
      wing1.rotation.z = 0.15; bird.add(wing1);
      const wing2 = wing1.clone(); wing2.position.x = 1.1; wing2.rotation.z = -0.15; bird.add(wing2);
      const wing3 = wing1.clone(); wing3.position.x = -1.1; wing3.rotation.z = -0.15; bird.add(wing3);
      bird.position.set(-200 + Math.random() * 400, 60 + Math.random() * 40, -200 + Math.random() * 400);
      bird.rotation.y = Math.random() * Math.PI * 2;
      scene.add(bird);
    }

    // Benches — blocky Roblox style
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.5;
      const bx = Math.cos(ang) * 100, bz = Math.sin(ang) * 100;
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1), M.oakMd);
      seat.position.y = 0.7; bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), M.oakMd);
      back.position.set(0, 1.1, -0.4); bench.add(back);
      [[-1.2, 0.35], [1.2, 0.35]].forEach(([lx, ly]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.8), M.darkMet);
        leg.position.set(lx, ly, 0); bench.add(leg);
      });
      bench.position.set(bx, 4, bz);
      bench.rotation.y = ang + Math.PI / 2;
      scene.add(bench);
    }
  }

  // ===== BUILD FUNCTIONS (same as before, just materials have Roblox plastic feel) =====
  function buildWall(grp: THREE.Group, st: any) {
    const mat = getMat(st.mat); const isZ = st.w > st.d;
    const len = isZ ? st.w : st.d, thk = isZ ? st.d : st.w;
    const H = st.h, dw = st.dw || 4, dh = st.dh || 6;
    const leftLen = len / 2 - dw / 2, rightLen = len / 2 - dw / 2, aboveH = H - dh;
    function seg(lx: number, _lz: number, sw: number, sh: number, sd: number, yoff = 0) {
      if (sw < 0.05 || sd < 0.05 || sh < 0.05) return;
      const m = new THREE.Mesh(isZ ? new THREE.BoxGeometry(sw, sh, sd) : new THREE.BoxGeometry(sd, sh, sw), mat);
      m.position.set(isZ ? lx : 0, yoff + sh / 2, isZ ? 0 : lx); m.castShadow = true; m.receiveShadow = true; grp.add(m);
    }
    if (leftLen > 0.05) { seg(-len / 2 + leftLen / 2, 0, leftLen, H, thk); if (isZ) addColl(st.x - len / 2 + leftLen / 2, st.z, leftLen, H, thk); else addColl(st.x, st.z - len / 2 + leftLen / 2, thk, H, leftLen); }
    if (rightLen > 0.05) { seg(len / 2 - rightLen / 2, 0, rightLen, H, thk); if (isZ) addColl(st.x + len / 2 - rightLen / 2, st.z, rightLen, H, thk); else addColl(st.x, st.z + len / 2 - rightLen / 2, thk, H, rightLen); }
    if (aboveH > 0.05) {
      const lm = new THREE.Mesh(isZ ? new THREE.BoxGeometry(dw, aboveH, thk) : new THREE.BoxGeometry(thk, aboveH, dw), mat);
      lm.position.set(0, dh + aboveH / 2, 0); lm.castShadow = true; lm.receiveShadow = true; grp.add(lm);
      if (isZ) colls.push({ x0: st.x - dw / 2, x1: st.x + dw / 2, y0: currentBaseY + dh, y1: currentBaseY + H, z0: st.z - thk / 2, z1: st.z + thk / 2 });
      else colls.push({ x0: st.x - thk / 2, x1: st.x + thk / 2, y0: currentBaseY + dh, y1: currentBaseY + H, z0: st.z - dw / 2, z1: st.z + dw / 2 });
    }
    const fm = M.brass;
    const mkf = (x: number, y: number, z: number, fw: number, fh: number, fd: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), fm); m.position.set(x, y, z); grp.add(m); };
    const ft = 0.16;
    if (isZ) { mkf(0, dh, 0, dw + ft * 2, ft, thk + 0.1); mkf(-dw / 2 - ft / 2, dh / 2, 0, ft, dh, thk + 0.1); mkf(dw / 2 + ft / 2, dh / 2, 0, ft, dh, thk + 0.1); }
    else { mkf(0, dh, 0, thk + 0.1, ft, dw + ft * 2); mkf(0, dh / 2, -dw / 2 - ft / 2, thk + 0.1, dh, ft); mkf(0, dh / 2, dw / 2 + ft / 2, thk + 0.1, dh, ft); }
  }

  function buildPalm(grp: THREE.Group, st: any, mat: THREE.Material) {
    const th = st.h * 0.7;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, th, 6), M.trunk);
    tr.position.y = th / 2; tr.castShadow = true; grp.add(tr);
    if (st.h > 10) {
      [0, 1.8, 3.4, 5.0, 6.4].forEach((yo, i) => { const r = (st.w * 0.32) * (1 - i * 0.15); const c = new THREE.Mesh(new THREE.ConeGeometry(r, st.h * 0.2, 6), mat); c.position.y = th * 0.44 + yo * (st.h * 0.09); c.castShadow = true; grp.add(c); });
    } else {
      // Roblox-style: sphere foliage instead of cones for smaller trees
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(st.w * 0.9, 8, 6),
        mat as THREE.MeshStandardMaterial
      );
      foliage.position.y = th + st.w * 0.5;
      foliage.castShadow = true; grp.add(foliage);
    }
  }

  function buildCustom(grp: THREE.Group, st: any, mat: THREE.MeshStandardMaterial) {
    const add = (geo: THREE.BufferGeometry, m: THREE.Material | null, x: number, y: number, z: number, ry = 0) => { const me = new THREE.Mesh(geo, m || mat); me.position.set(x, y, z); me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; grp.add(me); return me; };
    const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const C = (r: number, h: number, sg = 8) => new THREE.CylinderGeometry(r, r, h, sg);
    const S = (r: number, sg = 8) => new THREE.SphereGeometry(r, sg, sg);
    switch (st.custom) {
      case 'reception': add(B(st.w, st.h, st.d), M.walnut, 0, st.h / 2, 0); add(B(st.w + 0.1, 0.1, st.d + 0.1), M.marble, 0, st.h + 0.05, 0); add(B(st.w - 0.5, st.h - 0.4, 0.06), M.oakLt, 0, st.h / 2 - 0.1, st.d / 2 + 0.04); add(B(3.5, 0.7, 0.04), M.gold, 0, st.h * 0.78, st.d / 2 + 0.07); addColl(st.x, st.z, st.w, st.h + 0.1, st.d); break;
      case 'monitors': [-1.5, 0, 1.5].forEach(ox => { add(B(1.6, 1.1, 0.06), M.charcoal, ox, st.h, 0); add(B(0.14, 0.4, 0.12), M.darkMet, ox, st.h - 0.65, 0); }); break;
      case 'sofa': { add(B(st.w, 0.55, st.d), mat, 0, 0.28, 0); add(B(st.w, 0.95, 0.32), mat, 0, 0.95, -st.d / 2 + 0.18); const lc = new THREE.MeshStandardMaterial({ color: adjColor(mat.color.getHex(), 1.18), roughness: 0.5 }); const nc2 = Math.round(st.w / 2); const cw = (st.w - 0.28) / nc2; for (let i = 0; i < nc2; i++) add(B(cw - 0.1, 0.24, st.d - 0.5), lc, -st.w / 2 + 0.14 + cw / 2 + i * cw, 0.69, 0.08); [-st.w / 2 + 0.14, st.w / 2 - 0.14].forEach(ox => add(B(0.26, 0.78, st.d), mat, ox, 0.55, 0)); [[-st.w / 2 + 0.27, st.d / 2 - 0.27], [st.w / 2 - 0.27, st.d / 2 - 0.27], [-st.w / 2 + 0.27, -st.d / 2 + 0.27], [st.w / 2 - 0.27, -st.d / 2 + 0.27]].forEach(([lx, lz]) => add(C(0.055, 0.22), M.brass, lx, 0.11, lz)); addColl(st.x, st.z, st.w, 1.5, st.d); break; }
      case 'coffeetbl': add(B(st.w, 0.08, st.d), mat, 0, st.h, 0); add(B(st.w + 0.04, 0.04, st.d + 0.04), M.brass, 0, st.h + 0.06, 0); [[st.w / 2 - 0.14, st.d / 2 - 0.14], [-(st.w / 2 - 0.14), st.d / 2 - 0.14], [st.w / 2 - 0.14, -(st.d / 2 - 0.14)], [-(st.w / 2 - 0.14), -(st.d / 2 - 0.14)]].forEach(([lx, lz]) => add(B(0.08, st.h, 0.08), mat, lx, st.h / 2, lz)); addColl(st.x, st.z, st.w, st.h + 0.12, st.d); break;
      case 'piano': add(B(st.w, st.h, st.d), mat, 0, st.h / 2, 0); add(B(st.w - 0.08, 0.05, st.d / 2), mat, 0, st.h + 0.025, -st.d / 4); add(B(st.w - 0.7, 0.04, 0.48), M.white, 0, st.h + 0.02, st.d / 2 - 0.38); [-0.2, 0, 0.2].forEach(px => add(C(0.03, 0.22), M.chrome, px, 0.04, st.d / 2 + 0.08)); [[-st.w / 2 + 0.18, st.d / 2 - 0.28], [st.w / 2 - 0.18, st.d / 2 - 0.28], [0, -st.d / 2 + 0.28]].forEach(([lx, lz]) => add(C(0.07, st.h * 0.68), mat, lx, st.h * 0.34, lz)); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'ceiling': add(B(st.w, st.h, st.d), M.plaster, 0, 7.4, 0); for (let xi = -2; xi <= 2; xi++) add(B(0.18, 0.22, st.d - 2.5), M.plasterW, xi * 10, 7.0, 0); for (let zi = -2; zi <= 2; zi++) add(B(st.w - 2.5, 0.22, 0.18), M.plasterW, 0, 7.0, zi * 10); break;
      case 'chandeliers': [-18, 0, 18].forEach(cx => [-18, 0, 18].forEach(cz => { add(C(0.03, 1.4), M.brass, cx, 6.6, cz); add(new THREE.CylinderGeometry(0.55, 0.55, 0.28, 8), M.brass, cx, 5.8, cz); add(S(0.7, 8), M.goldLt, cx, 5.6, cz); for (let a = 0; a < 6; a++) { const ang2 = a * Math.PI / 3; const arm = add(B(0.85, 0.03, 0.06), M.brass, cx + Math.cos(ang2) * 0.44, 5.6, cz + Math.sin(ang2) * 0.44); arm.rotation.y = ang2; } })); break;
      case 'bedframe': add(B(st.w, 0.28, st.d), mat, 0, 0.14, 0); add(B(st.w, st.h * 2.8, 0.22), mat, 0, st.h * 1.4, -st.d / 2 + 0.13); add(B(st.w - 0.5, st.h * 2.2, 0.1), M.navyFab, 0, st.h * 1.22, -st.d / 2 + 0.27); add(B(st.w, st.h * 0.9, 0.18), mat, 0, st.h * 0.45, st.d / 2 - 0.09); [-st.w / 2 + 0.1, st.w / 2 - 0.1].forEach(ox => add(B(0.2, 0.18, st.d), mat, ox, 0.32, 0)); [[-st.w / 2 + 0.17, -st.d / 2 + 0.17], [st.w / 2 - 0.17, -st.d / 2 + 0.17], [-st.w / 2 + 0.17, st.d / 2 - 0.17], [st.w / 2 - 0.17, st.d / 2 - 0.17]].forEach(([lx, lz]) => add(B(0.18, 0.32, 0.18), mat, lx, 0.16, lz)); addColl(st.x, st.z, st.w, st.h * 3, st.d); break;
      case 'mattress': add(B(st.w, st.h, st.d), M.linen, 0, 0.4 + st.h / 2, 0); add(B(st.w + 0.04, 0.04, st.d + 0.04), M.cream, 0, 0.4 + st.h + 0.02, 0); addColl(st.x, st.z, st.w, 0.4 + st.h * 1.5, st.d); break;
      case 'pillows': [-2.8, -0.95, 0.95, 2.8].forEach(ox => { add(B(1.7, 0.42, 1.12), M.ivory, ox, 1.52, 0); add(B(1.5, 0.04, 0.04), M.cream, ox, 1.74, 0); }); break;
      case 'nightstand': add(B(st.w, st.h, st.d), mat, 0, st.h / 2, 0); add(B(st.w + 0.06, 0.06, st.d + 0.06), M.marble, 0, st.h + 0.03, 0); add(B(st.w - 0.3, 0.32, 0.06), M.oakLt, 0, st.h / 2, st.d / 2 + 0.04); add(S(0.05, 6), M.brass, 0, st.h / 2, st.d / 2 + 0.1); addColl(st.x, st.z, st.w, st.h + 0.06, st.d); break;
      case 'lamp': add(C(0.05, st.h * 0.64), M.brass, 0, st.h * 0.32, 0); add(S(0.1, 6), M.brass, 0, 0.08, 0); add(new THREE.ConeGeometry(0.36, 0.42, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.5, side: THREE.DoubleSide }), 0, st.h * 0.76, 0); addColl(st.x, st.z, 0.4, st.h, 0.4); break;
      case 'tv': add(B(st.w, st.h, 0.1), M.black, 0, st.h / 2, 0); add(B(st.w - 0.28, st.h - 0.28, 0.02), M.charcoal, 0, st.h / 2, 0.06); add(B(1.4, 0.28, 0.28), M.darkMet, 0, st.h / 2, 0.18); addColl(st.x, st.z, st.w, st.h, 0.18); break;
      case 'armchair': { add(B(st.w, 0.52, st.d), mat, 0, 0.26, 0); add(B(st.w, st.h, 0.28), mat, 0, st.h / 2, -st.d / 2 + 0.18); [-st.w / 2 + 0.16, st.w / 2 - 0.16].forEach(ox => add(B(0.28, st.h * 0.48, st.d), mat, ox, st.h * 0.24, 0)); const cm = new THREE.MeshStandardMaterial({ color: adjColor(mat.color.getHex(), 1.14), roughness: 0.5 }); add(B(st.w - 0.62, 0.22, st.d - 0.48), cm, 0, 0.64, 0.08); [[-st.w / 2 + 0.22, st.d / 2 - 0.22], [st.w / 2 - 0.22, st.d / 2 - 0.22], [-st.w / 2 + 0.22, -st.d / 2 + 0.22], [st.w / 2 - 0.22, -st.d / 2 + 0.22]].forEach(([lx, lz]) => add(B(0.09, 0.18, 0.09), M.darkMet, lx, 0.09, lz)); addColl(st.x, st.z, st.w, st.h, st.d); break; }
      case 'desk': add(B(st.w, 0.07, st.d), mat, 0, st.h, 0); add(B(st.w + 0.04, 0.04, st.d + 0.04), M.chrome, 0, st.h + 0.055, 0); [[-st.w / 2 + 0.11, st.d / 2 - 0.11], [st.w / 2 - 0.11, st.d / 2 - 0.11]].forEach(([lx, lz]) => add(B(0.14, st.h, 0.14), mat, lx, st.h / 2, lz)); add(B(st.w - 0.25, st.h, 0.14), mat, 0, st.h / 2, -st.d / 2 + 0.1); add(B(2.1, 1.35, 0.06), M.black, 0, st.h + 0.76, -st.d / 2 + 0.52); addColl(st.x, st.z, st.w, st.h + 0.07, st.d); break;
      case 'bathtub': add(B(st.w, st.h, st.d), M.white, 0, st.h / 2, 0); add(B(st.w - 0.28, st.h - 0.22, st.d - 0.28), new THREE.MeshStandardMaterial({ color: 0xd4ecf4, roughness: 0.04, metalness: 0.04 }), 0, st.h / 2 + 0.1, 0); add(B(st.w + 0.1, 0.06, st.d + 0.1), M.chrome, 0, st.h + 0.03, 0); [[-st.w / 2 + 0.26, st.d / 2 - 0.26], [st.w / 2 - 0.26, st.d / 2 - 0.26], [-st.w / 2 + 0.26, -st.d / 2 + 0.26], [st.w / 2 - 0.26, -st.d / 2 + 0.26]].forEach(([lx, lz]) => add(S(0.14, 6), M.chrome, lx, 0.1, lz)); add(C(0.038, 0.48), M.chrome, -st.w / 2 + 0.46, st.h + 0.28, 0); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'vanity': add(B(st.w, st.h - 0.48, st.d), M.walnut, 0, (st.h - 0.48) / 2, 0); add(B(st.w, 0.06, st.d), M.marble, 0, st.h - 0.48, 0); [-0.7, 0.7].forEach(ox => { add(B(0.76, 0.07, 0.56), M.white, ox, st.h - 0.41, 0); add(C(0.028, 0.22), M.chrome, ox, st.h + 0.02, 0); }); add(B(st.w - 0.08, 1.72, 0.04), M.glassCl, 0, st.h + 0.92, -st.d / 2 - 0.02); add(B(st.w + 0.05, 1.77, 0.06), M.chrome, 0, st.h + 0.92, -st.d / 2 - 0.05); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'toilet': add(B(st.w, 0.44, st.d * 0.68), M.white, 0, 0.22, -0.1); add(B(st.w - 0.08, 0.1, st.d), M.white, 0, 0.5, 0.08); add(B(st.w - 0.14, 0.38, st.d * 0.44), M.white, 0, 0.68, st.d / 2 - 0.14); addColl(st.x, st.z, st.w, 1.1, st.d); break;
      case 'pool': add(B(st.w, 0.55, st.d), M.poolTile, 0, 0.28, 0); add(B(st.w - 0.55, 0.06, st.d - 0.55), M.poolBlue, 0, 0.52, 0); for (let li = -1; li <= 1; li++) add(B(0.05, 0.04, st.d - 0.8), M.white, li * (st.w / 3.1), 0.54, 0); add(B(st.w - 1, 0.3, 1.2), M.marble, 0, 0.15, st.d / 2 + 0.6); addColl(st.x - st.w / 2, st.z, 0.3, 0.55, st.d); addColl(st.x + st.w / 2, st.z, 0.3, 0.55, st.d); break;
      case 'lounger': { add(B(st.w, 0.12, st.d), M.oakDk, 0, 0.32, 0); for (let i = 0; i < 10; i++) add(B(st.w - 0.1, 0.07, 0.15), M.oakLt, 0, 0.39, (-st.d / 2 + 0.26) + i * (st.d - 0.52) / 9); add(B(st.w - 0.12, 0.18, st.d - 0.2), mat, 0, 0.48, 0); add(B(st.w - 0.24, 0.14, 0.7), M.ivory, 0, 0.48, -st.d / 2 + 0.5); [0.9 * st.d / 2, -0.9 * st.d / 2].forEach(oz => [-st.w / 2 + 0.1, st.w / 2 - 0.1].forEach(ox => add(C(0.05, 0.3), M.steel, ox, 0.15, oz))); addColl(st.x, st.z, st.w, 0.66, st.d); break; }
      case 'umbrella': { add(C(0.05, st.h), M.steel, 0, st.h / 2, 0); add(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 8), mat, 0, st.h - 0.14, 0); for (let i = 0; i < 8; i++) { const ang3 = i * Math.PI / 4; const rib = add(B(2.5, 0.05, 0.08), mat, Math.cos(ang3) * 1.1, st.h - 0.12, Math.sin(ang3) * 1.1); rib.rotation.y = ang3; } addColl(st.x, st.z, 0.2, st.h, 0.2); break; }
      case 'bar': add(B(st.w, st.h, st.d), mat, 0, st.h / 2, 0); add(B(st.w + 0.14, 0.08, st.d + 0.14), M.marble, 0, st.h + 0.04, 0); add(B(st.w - 0.42, st.h - 0.38, 0.07), M.oakLt, 0, st.h / 2 - 0.1, st.d / 2 + 0.04); add(B(st.w - 1, 0.06, 0.22), M.oakMd, 0, st.h * 0.72, -st.d / 2 + 0.14); addColl(st.x, st.z, st.w, st.h + 0.08, st.d); break;
      case 'barstools': { const n = Math.round(st.w / 1.75), sw = st.w / n; for (let i = 0; i < n; i++) { const ox = -st.w / 2 + sw / 2 + i * sw; add(C(0.038, 1.82), M.steel, ox, 0.91, 0); add(new THREE.CylinderGeometry(0.3, 0.26, 0.13, 8), M.warmGy, ox, 1.87, 0); } addColl(st.x, st.z, st.w, 2.0, st.d); break; }
      case 'diningtable': { add(B(st.w, 0.1, st.d), mat, 0, st.h, 0); add(B(st.w + 0.05, 0.04, st.d + 0.05), M.brass, 0, st.h + 0.07, 0); add(B(st.w - 0.3, 0.02, st.d - 0.3), M.offWht, 0, st.h + 0.12, 0); add(C(0.16, st.h), mat, 0, st.h / 2, 0); add(B(st.w - 1.5, 0.1, 0.16), mat, 0, 0.08, 0); add(B(0.16, 0.1, st.d - 1.5), mat, 0, 0.08, 0); [[0, st.d / 2 + 0.52], [0, -st.d / 2 - 0.52], [st.w / 2 + 0.52, 0], [-st.w / 2 - 0.52, 0]].forEach(([cx2, cz2], idx) => { add(B(1.15, 0.07, 1.15), M.ivory, cx2, st.h - 0.07, cz2); const bk = add(B(1.15, 0.95, 0.1), M.charFab, cx2, st.h + 0.4, cz2 + (cz2 > 0 ? -0.52 : cz2 < 0 ? 0.52 : 0)); bk.rotation.y = idx >= 2 ? Math.PI / 2 : 0; [[-0.44, 0.44], [0.44, 0.44], [-0.44, -0.44], [0.44, -0.44]].forEach(([lx, lz2]) => add(B(0.07, st.h - 0.07, 0.07), M.darkMet, cx2 + lx, (st.h - 0.07) / 2, cz2 + lz2)); }); addColl(st.x, st.z, st.w, st.h + 0.12, st.d); break; }
      case 'kitchen': add(B(st.w, st.h, st.d), M.steel, 0, st.h / 2, 0); add(B(st.w - 0.45, 0.06, st.d - 0.38), M.chrome, 0, st.h + 0.03, 0); [-6, -2, 2, 6].forEach(ox => add(new THREE.CylinderGeometry(0.17, 0.18, 0.07, 8), M.steel, ox, st.h + 0.07, 0)); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'counter': add(B(st.w, 0.07, st.d), M.marble, 0, 0.04, 0); add(B(st.w + 0.06, 0.04, st.d + 0.06), M.chrome, 0, 0.09, 0); break;
      case 'jacuzzi': add(B(st.w, st.h, st.d), M.marble, 0, st.h / 2, 0); add(B(st.w - 0.45, 0.08, st.d - 0.45), M.poolBlue, 0, st.h - 0.04, 0); for (let a = 0; a < 6; a++) { const ang4 = a * Math.PI / 3; add(C(0.055, 0.13), M.chrome, (st.w / 2 - 0.32) * Math.cos(ang4), st.h * 0.68, (st.d / 2 - 0.32) * Math.sin(ang4)); } add(B(st.w + 0.9, 0.32, 0.75), M.marbleGy, 0, 0.16, st.d / 2 + 0.38); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'pylon': add(B(st.w, st.h, st.d), M.stoneLight, 0, st.h / 2, 0); add(B(st.w + 1.8, 1.4, st.d + 1.8), M.stoneLight, 0, st.h + 0.7, 0); for (let i = 0; i < 4; i++) add(B(0.18, 0.18, 0.18), M.darkMet, st.w / 2 + 0.1, st.h - i * 8, 0); addColl(st.x, st.z, st.w, st.h + 1.4, st.d); break;
      case 'fireplace': add(B(st.w, st.h, st.d), M.stone, 0, st.h / 2, 0); add(B(st.w - 0.55, st.h * 0.44, 0.18), M.black, 0, st.h * 0.22, st.d / 2 + 0.1); add(B(st.w + 0.38, 0.18, st.d + 0.28), M.oakDk, 0, st.h * 0.68, 0); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'skiwall': add(B(st.w, st.h, st.d), mat, 0, st.h / 2, 0); for (let i = 0; i < 3; i++) add(B(0.07, st.h - 0.75, 0.11), M.burg, (i - 1) * 2, st.h / 2 + 0.08, st.d / 2 + 0.07); for (let i = 0; i < 4; i++) add(C(0.032, st.h - 1.1), M.steel, (i - 1.5) * 1.25, st.h / 2, st.d / 2 + 0.1); addColl(st.x, st.z, st.w, st.h, st.d); break;
      case 'aroof': add(B(st.w, 0.45, st.d), mat, 0, st.h, 0); add(B(0.38, 0.55, st.d), mat, 0, st.h + 0.5, 0); add(B(st.w + 0.55, 0.22, 0.22), M.oakLt, 0, st.h + 0.08, st.d / 2); add(B(st.w + 0.55, 0.22, 0.22), M.oakLt, 0, st.h + 0.08, -st.d / 2); break;
      case 'arch': [-st.w / 2 + 0.7, st.w / 2 - 0.7].forEach(ox => add(B(1.4, st.h, 1.4), mat, ox, st.h / 2, 0)); add(B(st.w, 1.1, 1.4), mat, 0, st.h - 0.55, 0); add(B(st.w - 3.2, 1.65, 0.14), M.gold, 0, st.h - 1.45, 0.75); add(S(0.55, 8), mat, 0, st.h + 0.55, 0); addColl(st.x - st.w / 2, st.z, 1.4, st.h, 1.4); addColl(st.x + st.w / 2, st.z, 1.4, st.h, 1.4); break;
      default: add(B(st.w, st.h, st.d), mat, 0, st.h / 2, 0); addColl(st.x, st.z, st.w, st.h, st.d);
    }
  }

  function placeObj(st: any) {
    const grp = new THREE.Group();
    const mat = getMat(st.mat);
    const baseY = getBaseY(st);
    currentBaseY = baseY;
    if (st.type === 'wall') { buildWall(grp, st); }
    else if (st.type === 'palm') { buildPalm(grp, st, mat); addColl(st.x, st.z, st.w * 0.55, st.h, st.d * 0.55); }
    else if (st.type === 'custom') { buildCustom(grp, st, mat); }
    else {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(st.w, st.h, st.d), mat);
      mesh.position.y = st.h / 2; mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
      if (st.type !== 'floor') addColl(st.x, st.z, st.w, st.h, st.d);
      if (st.type === 'floor' && st.h < 0.5) mesh.position.y = st.h / 2 + 0.05;
    }
    grp.position.set(st.x, baseY, st.z); grp.scale.setScalar(0.01);
    scene.add(grp); st.grp = grp; placed.push({ grp, step: st });
    if (st.type === 'wall' && (st.label.includes('Lobby Back') || st.label.includes('Suite Back') || st.label.includes('Restaurant Wall S') || st.label.includes('Lodge Structure'))) {
      const halfW = st.w > st.d ? st.w / 2 - 1 : 30, halfD = st.w > st.d ? 30 : st.d / 2 - 1;
      ROOMS.push({ label: getRoomLabel(st), x0: st.x - halfW, x1: st.x + halfW, z0: st.z - halfD, z1: st.z + halfD });
    }
  }

  function doBuy(st: any) {
    wallet -= st.cost; st.bought = true; income += st.inc; placeObj(st);
    toast.success('✅  ' + st.label);
    spawnPad(); upProg();
  }

  function upProg() {
    const done = STEPS.filter((s: any) => s.bought).length;
    ui.setProgress((done / STEPS.length) * 100);
  }

  function spawnPad() {
    padList.forEach(p => scene.remove(p)); padList.length = 0; activePad = null;
    const next = STEPS.find((s: any) => !s.bought && (s.need === 0 || STEPS.find((x: any) => x.id === s.need)?.bought));
    if (next) {
      const parent = STEPS.find((x: any) => x.id === next.need);
      const px = parent ? parent.x + (next.ox || 0) : next.x + (next.ox || 0);
      const pz = parent ? parent.z + (next.oz || 0) : next.z + (next.oz || 0);
      const baseY = getBaseY(next);
      const py = baseY + (parent && parent.type !== 'floor' && parent.h > 0.5 ? parent.h : 0) + PAD_FLOAT;
      // Roblox-style sparkle pad
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.5, transparent: true, opacity: 0.9, roughness: 0.2, metalness: 0.3 })
      );
      pad.position.set(px, py, pz); (pad as any).stepData = next;
      scene.add(pad); padList.push(pad); activePad = pad;
      ui.setNextLabel(next.label);
      ui.setNextCost(next.cost === 0 ? 'FREE' : fmt(next.cost));
    } else {
      ui.setNextLabel('GRAND MERIDIAN COMPLETE');
      ui.setNextCost('');
      toast.success('🎉 The Grand Meridian is open!');
    }
  }

  // Init Three.js — Roblox sky color
  initMats();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x78b9e8); // Roblox default sky blue
  scene.fog = new THREE.FogExp2(0x90c8e8, 0.0006);

  const vw = container.clientWidth || window.innerWidth || 320;
  const vh = container.clientHeight || window.innerHeight || 240;

  cam = new THREE.PerspectiveCamera(60, vw / vh, 0.5, 4000);
  cam.position.set(0, 22, 50); cam.lookAt(0, 0, 0);

  ren = new THREE.WebGLRenderer({ antialias: true });
  ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ren.setSize(vw, vh);
  ren.shadowMap.enabled = true;
  ren.shadowMap.type = THREE.PCFSoftShadowMap;
  ren.toneMapping = THREE.ACESFilmicToneMapping;
  ren.toneMappingExposure = 1.2; // Brighter, more Roblox-like
  container.appendChild(ren.domElement);
  ren.domElement.style.cssText = "position:fixed;top:0;left:0;width:100%!important;height:100%!important;z-index:1;display:block;";

  clock = new THREE.Clock();

  // Roblox-style bright lighting
  scene.add(new THREE.HemisphereLight(0xb0d8f0, 0x80a860, 0.7));
  const sun = new THREE.DirectionalLight(0xfff8e8, 1.5);
  sun.position.set(150, 300, 120); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -600; sun.shadow.camera.right = 600;
  sun.shadow.camera.top = 600; sun.shadow.camera.bottom = -600;
  sun.shadow.camera.far = 1500; sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88b8e0, 0.35);
  fill.position.set(-120, 90, -80); scene.add(fill);
  // Ambient for that bright Roblox feel
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(40000, 40000),
    new THREE.MeshStandardMaterial({ color: 0x2890c8, roughness: 0.1, metalness: 0.15 })
  );
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -1.5; scene.add(ocean);

  // Roblox-style baseplate studs (just a visual grid on the base) - skip for ocean

  buildIslands();
  buildPaths();
  buildEnvironment();
  gpsGrp = new THREE.Group(); gpsGrp.renderOrder = 999; scene.add(gpsGrp);
  player = buildPlayer(); player.position.set(0, 4, 30); scene.add(player);

  if (doLoad && pendingSave) {
    wallet = pendingSave.wallet; income = pendingSave.income;
    player.position.set(pendingSave.playerX || 0, 4, pendingSave.playerZ || 0);
    STEPS.forEach((s: any) => {
      if (pendingSave.buildings.includes(s.id)) {
        s.bought = true; placeObj(s);
        if (s.grp) s.grp.scale.setScalar(1);
      }
    });
    toast.success('Cloud save loaded — ' + pendingSave.buildings.length + ' buildings');
  } else {
    STEPS[0].bought = true; placeObj(STEPS[0]);
    if (STEPS[0].grp) STEPS[0].grp.scale.setScalar(1);
  }
  spawnPad(); upProg();

  const incomeInterval = setInterval(() => { if (gameRunning) wallet += income; }, 1000);

  // Input — Roblox style: WASD camera-relative, mouse orbit
  const onKeyDown = (e: KeyboardEvent) => { if (e.key === ' ') e.preventDefault(); KEYS[e.key.toLowerCase()] = true; };
  const onKeyUp = (e: KeyboardEvent) => { KEYS[e.key.toLowerCase()] = false; };

  const onMouseDown = (e: MouseEvent) => {
    // Roblox: right-click OR middle-click to rotate camera
    if (e.button === 2 || e.button === 1 || e.button === 0) {
      // Only start drag if click is on the game canvas (not UI overlays)
      const target = e.target as HTMLElement;
      if (target === ren.domElement) {
        isMouseDragging = true;
        if (e.button === 2) e.preventDefault();
      }
    }
  };
  const onMouseUp = (_e: MouseEvent) => {
    isMouseDragging = false;
  };
  const onMouseMove = (e: MouseEvent) => {
    if (isMouseDragging) {
      camYaw -= e.movementX * 0.005;
      const dy = mouseInvertY ? -e.movementY : e.movementY;
      camPitch = Math.max(-0.3, Math.min(1.3, camPitch + dy * 0.005));
    }
  };
  // Touch support for mobile (drag to rotate)
  let touchStartX = 0, touchStartY = 0;
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
      isMouseDragging = true;
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (isMouseDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      camYaw -= dx * 0.008;
      camPitch = Math.max(-0.3, Math.min(1.3, camPitch + dy * 0.008));
      touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    }
  };
  const onTouchEnd = () => { isMouseDragging = false; };
  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    cam.aspect = w / h; cam.updateProjectionMatrix(); ren.setSize(w, h);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);
  ren.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
  ren.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
  ren.domElement.addEventListener('touchend', onTouchEnd);
  container.addEventListener('contextmenu', onContextMenu);

  // Animate — Roblox-style camera-relative movement
  let animId: number;
  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const ox = player.position.x, oy = player.position.y, oz = player.position.z;

    // Camera-relative movement (Roblox style)
    const moveSpeed = 20;
    let moveX = 0, moveZ = 0;
    if (KEYS['w']) moveZ -= 1;
    if (KEYS['s']) moveZ += 1;
    if (KEYS['a']) moveX -= 1;
    if (KEYS['d']) moveX += 1;

    // Normalize diagonal movement
    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0) { moveX /= moveLen; moveZ /= moveLen; }

    // Transform movement relative to camera yaw
    const sinYaw = Math.sin(camYaw), cosYaw = Math.cos(camYaw);
    const worldMoveX = moveX * cosYaw + moveZ * sinYaw;
    const worldMoveZ = -moveX * sinYaw + moveZ * cosYaw;

    let nx = ox + worldMoveX * moveSpeed * dt;
    let nz = oz + worldMoveZ * moveSpeed * dt;

    // Rotate player to face movement direction
    if (moveLen > 0) {
      const targetAngle = Math.atan2(worldMoveX, worldMoveZ);
      let diff = targetAngle - player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation.y += diff * 0.15; // Smooth rotation like Roblox
    }

    const groundY = getGroundY(nx, nz);

    // Roblox jump: higher, more floaty
    if (KEYS[' '] && !jumping) { vspeed = 14; jumping = true; }
    let ny = oy;
    if (jumping) {
      ny = oy + vspeed * dt;
      vspeed -= 32 * dt;
      if (ny <= groundY) { ny = groundY; jumping = false; vspeed = 0; }
    } else {
      if (oy > groundY + 0.1) { ny = Math.max(groundY, oy - 0.5); }
      else { ny = groundY; }
    }
    resolveMove(ox, oy, oz, nx, ny, nz);
    if (jumping && player.position.y < ny - 0.01) vspeed = -1;
    if (jumping && player.position.y <= groundY) { player.position.y = groundY; jumping = false; vspeed = 0; }

    checkRoom();

    // Mouse orbit camera
    camDist += (camTargetDist - camDist) * 0.08;
    camHeight += (camTargetH - camHeight) * 0.08;

    const camOffsetX = Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const camOffsetZ = Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    const camOffsetY = Math.sin(camPitch) * camDist;

    cam.position.x = player.position.x + camOffsetX;
    cam.position.y = player.position.y + camOffsetY + 3;
    cam.position.z = player.position.z + camOffsetZ;
    cam.lookAt(player.position.x, player.position.y + 2.5, player.position.z);

    // Animate building pop-in
    for (const p of placed) { if (p.grp.scale.x < 1) { p.grp.scale.setScalar(Math.min(p.grp.scale.x + 0.055, 1)); } }

    // Rotate purchase pad
    if (activePad) { activePad.rotation.y += dt * 2; }

    rebuildGPS();
    if (activePad) {
      const d = player.position.distanceTo(activePad.position);
      const afford = wallet >= (activePad as any).stepData.cost;
      nearPad = d < 7;
      ui.setShowBuyPrompt(nearPad && afford);
      if (nearPad && afford && KEYS['e']) { KEYS['e'] = false; doBuy((activePad as any).stepData); }
    } else { ui.setShowBuyPrompt(false); }
    ren.render(scene, cam);
    ui.setWalletDisplay(fmt(wallet));
    ui.setIncomeDisplay(fmt(income) + '/s');
  }
  animate();

  return {
    player, STEPS,
    get wallet() { return wallet; },
    get income() { return income; },
    destroy() {
      gameRunning = false;
      cancelAnimationFrame(animId);
      clearInterval(incomeInterval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('contextmenu', onContextMenu);
      ren.dispose();
      if (container.contains(ren.domElement)) container.removeChild(ren.domElement);
    }
  };
}

export default Game;
