import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { saveToCloud, loadFromCloud } from "@/lib/gameSave";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Game = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const handleCloudSave = useCallback(async (data: any) => {
    if (!user) return;
    try {
      await saveToCloud(user.id, data);
      toast.success("Saved to cloud!");
    } catch {
      toast.error("Cloud save failed");
    }
  }, [user]);

  const handleCloudLoad = useCallback(async (): Promise<any> => {
    if (!user) return null;
    try {
      return await loadFromCloud(user.id);
    } catch {
      toast.error("Cloud load failed");
      return null;
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === "CLOUD_SAVE") {
        await handleCloudSave(e.data.payload);
      } else if (e.data?.type === "CLOUD_LOAD") {
        const save = await handleCloudLoad();
        iframeRef.current?.contentWindow?.postMessage({ type: "CLOUD_LOAD_RESULT", payload: save }, "*");
      } else if (e.data?.type === "LOGOUT") {
        await handleLogout();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [handleCloudSave, handleCloudLoad, handleLogout]);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white">Loading...</div>;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={getGameHTML()}
      className="fixed inset-0 w-full h-full border-0"
      allow="autoplay"
      title="Grand Meridian Resort Tycoon"
    />
  );
};

function getGameHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Grand Meridian Resort</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#0a0a0a;font-family:'DM Sans',sans-serif;}
canvas{position:fixed;top:0;left:0;width:100%!important;height:100%!important;z-index:1;display:block;}
#startScreen{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:linear-gradient(170deg,#0a1628 0%,#0d2440 40%,#1a3a5c 70%,#0d2440 100%);}
.s-logo{font-family:'Bebas Neue',sans-serif;font-size:clamp(14px,2.5vw,20px);color:rgba(212,168,68,0.85);letter-spacing:8px;}
.s-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,10vw,100px);color:#fff;letter-spacing:5px;line-height:0.9;text-align:center;text-shadow:0 2px 40px rgba(0,0,0,0.6);}
.s-div{width:60px;height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,68,0.8),transparent);margin:2px 0;}
.s-sub{font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:5px;text-transform:uppercase;margin-bottom:16px;}
.s-btn{padding:14px 48px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:4px;background:transparent;border:1px solid rgba(212,168,68,0.5);border-radius:2px;cursor:pointer;transition:all .2s;color:#d4a844;}
.s-btn:hover{background:rgba(212,168,68,0.1);border-color:#d4a844;}
.s-btn.secondary{color:rgba(255,255,255,0.45);font-size:16px;padding:10px 32px;}
.s-btn.secondary:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.8);}
.s-btn.logout{color:rgba(255,100,100,0.6);font-size:12px;padding:6px 20px;border-color:rgba(255,100,100,0.25);}
.s-btn.logout:hover{background:rgba(255,100,100,0.08);color:rgba(255,100,100,0.9);}
#saveStatus{font-size:10px;color:rgba(212,168,68,0.55);letter-spacing:2px;min-height:13px;}
.s-keys{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px;}
.s-key{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:5px 10px;color:rgba(255,255,255,0.55);font-size:11px;display:flex;align-items:center;gap:4px;}
.s-key kbd{background:rgba(255,255,255,0.08);border-radius:2px;padding:1px 5px;font-family:monospace;font-size:10px;}
#hud{position:fixed;top:0;left:0;right:0;z-index:50;display:none;align-items:center;padding:0 24px;background:rgba(4,8,18,0.94);backdrop-filter:blur(20px);border-bottom:1px solid rgba(212,168,68,0.18);pointer-events:none;height:50px;}
.hud-brand{font-family:'Bebas Neue',sans-serif;font-size:16px;color:rgba(212,168,68,0.85);letter-spacing:4px;margin-right:auto;}
.hud-dv{width:1px;height:24px;background:rgba(255,255,255,0.07);margin:0 18px;}
.hud-bl{display:flex;flex-direction:column;align-items:flex-end;line-height:1;}
.hud-lb{font-size:7px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.28);margin-bottom:2px;}
.hud-vl{font-family:'Bebas Neue',sans-serif;font-size:22px;}
#vm{color:#d4a844;}#vi{color:#4ecb71;}
#sbtn{pointer-events:all;padding:4px 12px;font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:2px;background:rgba(212,168,68,0.1);color:rgba(212,168,68,0.75);border:1px solid rgba(212,168,68,0.28);border-radius:2px;cursor:pointer;margin-left:14px;transition:all .2s;}
#sbtn:hover{background:rgba(212,168,68,0.2);color:#d4a844;}
#sfl{font-size:9px;color:#4ecb71;letter-spacing:2px;opacity:0;transition:opacity .3s;margin-left:7px;}
#progress{position:fixed;top:50px;left:0;right:0;z-index:50;height:2px;background:rgba(255,255,255,0.05);pointer-events:none;}
#pbar{height:100%;background:linear-gradient(90deg,#d4a844,#e8c96a);width:0%;transition:width .5s;}
#nextCard{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:50;display:none;flex-direction:column;align-items:center;padding:11px 24px 9px;background:rgba(4,8,18,0.93);backdrop-filter:blur(16px);border:1px solid rgba(212,168,68,0.18);border-top:2px solid rgba(212,168,68,0.65);border-radius:2px;color:#fff;pointer-events:none;white-space:nowrap;text-align:center;}
.nc-lb{font-size:7px;text-transform:uppercase;letter-spacing:3px;color:rgba(212,168,68,0.65);margin-bottom:2px;}
.nc-nm{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;}
.nc-co{font-size:10px;color:rgba(212,168,68,0.75);margin-top:2px;letter-spacing:1px;}
#buyPrompt{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:50;display:none;padding:9px 24px;background:rgba(212,168,68,0.95);color:#0a0a0a;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:3px;border-radius:2px;pointer-events:none;animation:bpulse 1s ease-in-out infinite;}
@keyframes bpulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.04)}}
#toast{position:fixed;top:64px;left:50%;transform:translateX(-50%) translateY(-10px);z-index:50;padding:7px 20px;background:rgba(78,203,113,0.95);color:#fff;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:2px;border-radius:2px;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;}
#toast.on{opacity:1;transform:translateX(-50%) translateY(0);}
#roomLabel{position:fixed;bottom:100px;right:24px;z-index:50;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:3px;color:rgba(212,168,68,0.7);opacity:0;transition:opacity .5s;pointer-events:none;}
.cloud-badge{position:fixed;top:54px;right:10px;z-index:60;font-size:8px;color:rgba(78,203,113,0.7);letter-spacing:2px;font-family:'Bebas Neue',sans-serif;pointer-events:none;}
</style>
</head>
<body>
<div id="startScreen">
    <div class="s-logo">The</div>
    <div class="s-title">GRAND<br>MERIDIAN</div>
    <div class="s-div"></div>
    <div class="s-sub">Luxury Resort & Spa</div>
    <button class="s-btn" id="playBtn" onclick="startGame(false)">NEW GAME</button>
    <button class="s-btn secondary" id="loadBtn" onclick="requestCloudLoad()">LOAD CLOUD SAVE</button>
    <div id="saveStatus">CHECKING CLOUD SAVE...</div>
    <div class="s-keys">
        <div class="s-key"><kbd>W</kbd><kbd>S</kbd> Move</div>
        <div class="s-key"><kbd>A</kbd><kbd>D</kbd> Turn</div>
        <div class="s-key"><kbd>Space</kbd> Jump</div>
        <div class="s-key"><kbd>E</kbd> Buy</div>
    </div>
    <button class="s-btn logout" onclick="parent.postMessage({type:'LOGOUT'},'*')">LOG OUT</button>
</div>
<div id="hud">
    <div class="hud-brand">Grand Meridian</div>
    <div class="hud-dv"></div>
    <div class="hud-bl"><div class="hud-lb">Balance</div><div class="hud-vl" id="vm">$500</div></div>
    <div class="hud-dv"></div>
    <div class="hud-bl"><div class="hud-lb">Revenue/sec</div><div class="hud-vl" id="vi">$0</div></div>
    <button id="sbtn" onclick="cloudSave()">SAVE</button>
    <span id="sfl">SAVED</span>
</div>
<div id="progress"><div id="pbar"></div></div>
<div class="cloud-badge">☁ CLOUD SYNC</div>
<div id="nextCard">
    <div class="nc-lb">Next Construction</div>
    <div class="nc-nm" id="ncn">—</div>
    <div class="nc-co" id="ncc"></div>
</div>
<div id="buyPrompt">[ E ] Purchase</div>
<div id="toast"></div>
<div id="roomLabel"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r140/three.min.js"><\/script>
<script>
'use strict';
let scene,cam,ren,clock,player;
let gpsGrp,activePad=null;
let wallet=500,income=0;
let vspeed=0,hspeed=0,jumping=false;
let gameRunning=false,nearPad=false;
const KEYS={},placed=[],padList=[],colls=[];
const PLAYER_R=0.65,PLAYER_H=3.2,PAD_FLOAT=1.0;
let camDist=30,camHeight=17,camTargetDist=30,camTargetH=17;
let insideRoom='';
const ROOMS=[];
let pendingCloudSave=null;

// Cloud save/load via postMessage
function cloudSave(){
    const data={
        wallet:Math.floor(wallet),
        income:Math.floor(income),
        buildings:STEPS.filter(s=>s.bought).map(s=>s.id),
        playerX:Math.round(player?player.position.x:0),
        playerZ:Math.round(player?player.position.z:0)
    };
    parent.postMessage({type:'CLOUD_SAVE',payload:data},'*');
    const f=document.getElementById('sfl');
    f.style.opacity='1'; setTimeout(()=>f.style.opacity='0',1800);
}
function requestCloudLoad(){
    parent.postMessage({type:'CLOUD_LOAD'},'*');
    document.getElementById('saveStatus').textContent='LOADING CLOUD SAVE...';
}
window.addEventListener('message',function(e){
    if(e.data&&e.data.type==='CLOUD_LOAD_RESULT'){
        const sv=e.data.payload;
        if(sv&&sv.buildings&&sv.buildings.length>0){
            pendingCloudSave=sv;
            startGame(true);
        } else {
            document.getElementById('saveStatus').textContent='NO CLOUD SAVE FOUND';
        }
    }
});
// Check for existing cloud save on load
parent.postMessage({type:'CLOUD_LOAD'},'*');
window.addEventListener('message',function check(e){
    if(e.data&&e.data.type==='CLOUD_LOAD_RESULT'){
        const sv=e.data.payload;
        if(sv&&sv.buildings&&sv.buildings.length>0){
            pendingCloudSave=sv;
            document.getElementById('saveStatus').textContent='CLOUD SAVE — '+sv.buildings.length+' BUILDINGS';
            document.getElementById('loadBtn').style.color='rgba(212,168,68,0.9)';
            document.getElementById('loadBtn').style.borderColor='rgba(212,168,68,0.4)';
        } else {
            document.getElementById('loadBtn').style.opacity='0.28';
            document.getElementById('loadBtn').style.pointerEvents='none';
            document.getElementById('saveStatus').textContent='NO CLOUD SAVE';
        }
        window.removeEventListener('message',check);
    }
});
setInterval(()=>{if(gameRunning)cloudSave();},60000);

// Materials
let M={};
function initMats(){
    const s=(c,r=0.75,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
    M={
        concrete:s(0xbeb8b0,0.88),concreteDk:s(0x98928c,0.85),
        stoneLight:s(0xb2acA8,0.84),stone:s(0x888078,0.86),slate:s(0x484e5c,0.82),
        marble:s(0xf0ede6,0.12,0.04),marbleGy:s(0xcec9c2,0.18,0.04),
        plaster:s(0xeae6dc,0.94),plasterW:s(0xe4ddd0,0.92),
        oakLt:s(0xbc9050,0.78),oakMd:s(0x8e5e28,0.75),oakDk:s(0x663818,0.72),
        walnut:s(0x4c2c12,0.68),ebony:s(0x141210,0.62),
        steel:s(0x98aeb8,0.3,0.85),chrome:s(0xcedae6,0.12,0.96),
        brass:s(0xac8620,0.28,0.75),darkMet:s(0x2c3640,0.4,0.72),
        cream:s(0xeee6ce,0.95),linen:s(0xd8ccb0,0.97),ivory:s(0xf4ecda,0.93),
        navyFab:s(0x16243c,0.96),tealFab:s(0x0c3c3c,0.95),
        charFab:s(0x20242c,0.97),burg:s(0x620a16,0.94),
        sage:s(0x465646,0.9),warmGy:s(0x646058,0.92),
        glassBlue:s(0x6caecc,0.06,0.08),glassCl:s(0xb8d4e4,0.04,0.05),
        grass:s(0x489040,0.95),palmGn:s(0x246c26,0.9),trunk:s(0x6a4c1c,0.85),
        snow:s(0xf8f8f8,0.6),snowDk:s(0xd8dce0,0.65),
        rock:s(0x706860,0.9),rockDk:s(0x504840,0.92),
        poolBlue:s(0x007aaa,0.04,0.08),poolTile:s(0x96b6c6,0.45),
        gold:s(0xb08a0e,0.2,0.82),goldLt:s(0xcca026,0.22,0.78),
        white:s(0xf8f8f6,0.28,0.02),black:s(0x0c0e10,0.42),
        charcoal:s(0x1a1e26,0.44),offWht:s(0xf0eade,0.88),
        path:s(0xc0b6a2,0.88),cobalt:s(0x1226a0,0.88),
        terracotta:s(0xae3e30,0.85),water:s(0x065878,0.04,0.08),
    };
}

const ISLANDS=[
    {id:'lobby',cx:0,cz:0,r:120,h:4,color:0x5a9040,label:'Main Island'},
    {id:'pool',cx:260,cz:0,r:100,h:4,color:0x5a9040,label:'Pool Island'},
    {id:'restaurant',cx:-260,cz:0,r:100,h:4,color:0x5a9040,label:'Restaurant Island'},
    {id:'mountain',cx:0,cz:-380,r:150,h:4,color:0x5a7040,label:'Mountain Island'},
];

const STEPS=[
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
{id:28,x:0,z:-64,cost:350,label:'Down Pillows',type:'custom',mat:'ivory',inc:18,w:10,h:0.5,d:2.8,need:27,ox:12,oz:0,custom:'pillows'},
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
// BRIDGE 1
{id:41,x:130,z:0,cost:8000,label:'East Bridge Deck',type:'floor',mat:'slate',inc:250,w:20,h:1.2,d:20,need:40,ox:12,oz:0},
{id:42,x:175,z:0,cost:12000,label:'East Bridge Span',type:'floor',mat:'slate',inc:450,w:20,h:1.2,d:70,need:41,ox:12,oz:0},
{id:43,x:160,z:0,cost:3500,label:'East Bridge Rail L',type:'block',mat:'stoneLight',inc:80,w:0.8,h:2.5,d:110,need:42,ox:-12,oz:0},
{id:44,x:160,z:0,cost:3500,label:'East Bridge Rail R',type:'block',mat:'stoneLight',inc:80,w:0.8,h:2.5,d:110,need:43,ox:12,oz:0},
{id:45,x:142,z:0,cost:10000,label:'East Bridge Tower L',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:44,ox:-9,oz:0,custom:'pylon'},
{id:46,x:178,z:0,cost:10000,label:'East Bridge Tower R',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:45,ox:9,oz:0,custom:'pylon'},
{id:47,x:160,z:0,cost:6000,label:'East Bridge Cross Beam',type:'block',mat:'stoneLight',inc:150,w:22,h:2,d:2,need:46,ox:-10,oz:0},
// POOL ISLAND
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
// BRIDGE 2
{id:64,x:-130,z:0,cost:8000,label:'West Bridge Deck',type:'floor',mat:'slate',inc:250,w:20,h:1.2,d:20,need:63,ox:-12,oz:0},
{id:65,x:-175,z:0,cost:12000,label:'West Bridge Span',type:'floor',mat:'slate',inc:450,w:20,h:1.2,d:70,need:64,ox:-12,oz:0},
{id:66,x:-160,z:0,cost:3500,label:'West Bridge Rail L',type:'block',mat:'stoneLight',inc:80,w:0.8,h:2.5,d:110,need:65,ox:-12,oz:0},
{id:67,x:-160,z:0,cost:3500,label:'West Bridge Rail R',type:'block',mat:'stoneLight',inc:80,w:0.8,h:2.5,d:110,need:66,ox:12,oz:0},
{id:68,x:-142,z:0,cost:10000,label:'West Bridge Tower L',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:67,ox:-9,oz:0,custom:'pylon'},
{id:69,x:-178,z:0,cost:10000,label:'West Bridge Tower R',type:'custom',mat:'stoneLight',inc:250,w:3.5,h:28,d:3.5,need:68,ox:9,oz:0,custom:'pylon'},
{id:70,x:-160,z:0,cost:6000,label:'West Bridge Cross Beam',type:'block',mat:'stoneLight',inc:150,w:22,h:2,d:2,need:69,ox:-10,oz:0},
// Waterfall
{id:71,x:-114,z:30,cost:5000,label:'Waterfall Rock',type:'custom',mat:'stone',inc:200,w:6,h:5,d:5,need:70,ox:-10,oz:0,custom:'fireplace'},
{id:72,x:-114,z:-30,cost:5000,label:'Zen Garden Boulder',type:'custom',mat:'rock',inc:200,w:5,h:3,d:5,need:71,ox:10,oz:0,custom:'fireplace'},
{id:73,x:60,z:50,cost:3000,label:'Resort Palm East A',type:'palm',mat:'palmGn',inc:40,w:3,h:8,d:3,need:72,ox:8,oz:0},
{id:74,x:-60,z:50,cost:3000,label:'Resort Palm West A',type:'palm',mat:'palmGn',inc:40,w:3,h:8,d:3,need:73,ox:-8,oz:0},
// RESTAURANT
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
// BRIDGE 3
{id:93,x:0,z:-130,cost:50000,label:'South Bridge Deck',type:'floor',mat:'slate',inc:900,w:20,h:1.2,d:20,need:92,ox:12,oz:0},
{id:94,x:0,z:-205,cost:90000,label:'South Bridge Span',type:'floor',mat:'slate',inc:1800,w:20,h:1.2,d:130,need:93,ox:12,oz:0},
{id:95,x:0,z:-130,cost:22000,label:'South Bridge Rail L',type:'block',mat:'stoneLight',inc:350,w:0.8,h:2.5,d:150,need:94,ox:-12,oz:0},
{id:96,x:0,z:-130,cost:22000,label:'South Bridge Rail R',type:'block',mat:'stoneLight',inc:350,w:0.8,h:2.5,d:150,need:95,ox:12,oz:0},
{id:97,x:-8,z:-190,cost:65000,label:'South Bridge Tower L',type:'custom',mat:'stoneLight',inc:1200,w:3.5,h:36,d:3.5,need:96,ox:-9,oz:0,custom:'pylon'},
{id:98,x:8,z:-190,cost:65000,label:'South Bridge Tower R',type:'custom',mat:'stoneLight',inc:1200,w:3.5,h:36,d:3.5,need:97,ox:9,oz:0,custom:'pylon'},
{id:99,x:0,z:-190,cost:35000,label:'South Bridge Cross Beam',type:'block',mat:'stoneLight',inc:700,w:22,h:2,d:2,need:98,ox:-10,oz:0},
// MOUNTAIN
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

function fmt(n){n=Math.floor(n);if(n>=1e9)return'$'+(n/1e9).toFixed(1)+'B';if(n>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(n>=1e3)return'$'+(n/1e3).toFixed(1)+'K';return'$'+n;}
let toastT=null;
function showToast(msg){
    const el=document.getElementById('toast');
    el.textContent=msg;el.classList.add('on');
    clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2600);
}
function upProg(){
    const done=STEPS.filter(s=>s.bought).length;
    document.getElementById('pbar').style.width=((done/STEPS.length)*100)+'%';
}
function startGame(doLoad){
    document.getElementById('startScreen').style.display='none';
    document.getElementById('hud').style.display='flex';
    document.getElementById('nextCard').style.display='flex';
    gameRunning=true;
    initThree(doLoad);
}

function initThree(doLoad){
    initMats();
    scene=new THREE.Scene();
    scene.background=new THREE.Color(0x5ea4c0);
    scene.fog=new THREE.FogExp2(0x84b4cc,0.0008);
    cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,4000);
    cam.position.set(0,22,50);cam.lookAt(0,0,0);
    ren=new THREE.WebGLRenderer({antialias:true});
    ren.setPixelRatio(Math.min(devicePixelRatio,2));
    ren.setSize(innerWidth,innerHeight);
    ren.shadowMap.enabled=true;
    ren.shadowMap.type=THREE.PCFSoftShadowMap;
    ren.toneMapping=THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure=1.05;
    document.body.appendChild(ren.domElement);
    clock=new THREE.Clock();
    scene.add(new THREE.HemisphereLight(0xacd4ec,0x78905c,0.55));
    const sun=new THREE.DirectionalLight(0xfff0d8,1.3);
    sun.position.set(150,250,120);sun.castShadow=true;
    sun.shadow.mapSize.set(4096,4096);
    sun.shadow.camera.left=-600;sun.shadow.camera.right=600;
    sun.shadow.camera.top=600;sun.shadow.camera.bottom=-600;
    sun.shadow.camera.far=1500;sun.shadow.bias=-0.0002;
    scene.add(sun);
    const fill=new THREE.DirectionalLight(0x88aed4,0.28);
    fill.position.set(-120,90,-80);scene.add(fill);
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000),M.water);
    ocean.rotation.x=-Math.PI/2;ocean.position.y=-1.5;scene.add(ocean);
    buildIslands();
    buildPaths();
    gpsGrp=new THREE.Group();gpsGrp.renderOrder=999;scene.add(gpsGrp);
    player=buildPlayer();player.position.set(0,4,30);scene.add(player);

    if(doLoad&&pendingCloudSave){
        const sv=pendingCloudSave;
        wallet=sv.wallet;income=sv.income;
        player.position.set(sv.playerX||0,4,sv.playerZ||0);
        STEPS.forEach(s=>{
            if(sv.buildings.includes(s.id)){
                s.bought=true;placeObj(s);
                if(s.grp)s.grp.scale.setScalar(1);
            }
        });
        showToast('Cloud save loaded — '+sv.buildings.length+' buildings');
    } else {
        STEPS[0].bought=true;placeObj(STEPS[0]);
        if(STEPS[0].grp)STEPS[0].grp.scale.setScalar(1);
    }
    spawnPad();upProg();
    ren.render(scene,cam);
    animate();
}

function buildIslands(){
    ISLANDS.forEach(isl=>{
        const body=new THREE.Mesh(new THREE.CylinderGeometry(isl.r,isl.r+8,isl.h,64),new THREE.MeshStandardMaterial({color:isl.color,roughness:0.92}));
        body.position.set(isl.cx,isl.h/2-1.5,isl.cz);body.receiveShadow=true;body.castShadow=true;scene.add(body);
        const beach=new THREE.Mesh(new THREE.CylinderGeometry(isl.r+12,isl.r+16,1,64),new THREE.MeshStandardMaterial({color:0xd4c090,roughness:0.95}));
        beach.position.set(isl.cx,-0.5,isl.cz);beach.receiveShadow=true;scene.add(beach);
        const cap=new THREE.Mesh(new THREE.CylinderGeometry(isl.r,isl.r,0.4,64),new THREE.MeshStandardMaterial({color:0x5aa050,roughness:0.9}));
        cap.position.set(isl.cx,isl.h/2+0.7,isl.cz);cap.receiveShadow=true;scene.add(cap);
        if(isl.id==='mountain')buildMountain(isl.cx,isl.cz);
        scatterTrees(isl);
    });
}
function buildMountain(cx,cz){
    const mountMat=new THREE.MeshStandardMaterial({color:0x706860,roughness:0.9});
    const snowMat=new THREE.MeshStandardMaterial({color:0xf4f4f0,roughness:0.6});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(30,70,60,16),mountMat);
    base.position.set(cx+50,26,cz-60);base.castShadow=true;scene.add(base);
    const mid=new THREE.Mesh(new THREE.CylinderGeometry(16,32,40,14),mountMat);
    mid.position.set(cx+50,60,cz-60);mid.castShadow=true;scene.add(mid);
    const peak=new THREE.Mesh(new THREE.ConeGeometry(14,35,12),mountMat);
    peak.position.set(cx+50,90,cz-60);peak.castShadow=true;scene.add(peak);
    const snow=new THREE.Mesh(new THREE.ConeGeometry(12,22,12),snowMat);
    snow.position.set(cx+50,98,cz-60);snow.castShadow=true;scene.add(snow);
    const snowC=new THREE.Mesh(new THREE.CylinderGeometry(14,14,3,12),snowMat);
    snowC.position.set(cx+50,83,cz-60);scene.add(snowC);
    const peak2=new THREE.Mesh(new THREE.ConeGeometry(10,25,10),mountMat);
    peak2.position.set(cx-40,58,cz-80);peak2.castShadow=true;scene.add(peak2);
    const snow2=new THREE.Mesh(new THREE.ConeGeometry(8,15,10),snowMat);
    snow2.position.set(cx-40,65,cz-80);scene.add(snow2);
    [[cx+20,8,cz-30],[cx-20,7,cz-50],[cx+60,9,cz-40],[cx+30,8,cz-90]].forEach(([rx,ry,rz])=>{
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(8+Math.random()*4,0),new THREE.MeshStandardMaterial({color:0x686060,roughness:0.92}));
        rock.position.set(rx,ry,rz);rock.rotation.set(Math.random(),Math.random(),Math.random());rock.castShadow=true;scene.add(rock);
    });
    for(let i=0;i<6;i++){
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,3,6),new THREE.MeshStandardMaterial({color:i%2===0?0xff2020:0x2020ff}));
        pole.position.set(cx+30+i*3,12-i*1.5,cz-45+i*4);scene.add(pole);
    }
}
function scatterTrees(isl){
    const count=isl.id==='mountain'?8:6;
    const isAlpine=isl.id==='mountain';
    for(let i=0;i<count;i++){
        const ang=(i/count)*Math.PI*2+0.3;
        const dist=isl.r*0.75+Math.random()*isl.r*0.18;
        const tx=isl.cx+Math.cos(ang)*dist;
        const tz=isl.cz+Math.sin(ang)*dist;
        const h=isAlpine?(12+Math.random()*6):(5+Math.random()*4);
        const grp=new THREE.Group();
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.24,h*0.65,8),M.trunk);
        trunk.position.y=h*0.325;trunk.castShadow=true;grp.add(trunk);
        if(isAlpine){
            [0,1.6,3.0,4.2].forEach((yo,idx)=>{
                const r=(h*0.32)*(1-idx*0.18);
                const cone=new THREE.Mesh(new THREE.ConeGeometry(r,h*0.2,9),M.palmGn);
                cone.position.y=h*0.42+yo*(h*0.1);grp.add(cone);
            });
        } else {
            [0,0.8,1.5].forEach((yo,idx)=>{
                const r=(h*0.22)*(1-idx*0.2);
                const layer=new THREE.Mesh(new THREE.CylinderGeometry(r*0.28,r,0.5,7),M.palmGn);
                layer.position.y=h*0.62+yo;grp.add(layer);
            });
        }
        grp.position.set(tx,4,tz);grp.castShadow=true;scene.add(grp);
    }
}
function buildPaths(){
    const pathM=M.path;
    [[0,-38,12,54],[0,38,12,20]].forEach(([x,z,w,d])=>{
        const p=new THREE.Mesh(new THREE.PlaneGeometry(w,d),pathM);
        p.rotation.x=-Math.PI/2;p.position.set(x,4.1,z);p.receiveShadow=true;scene.add(p);
    });
    const promenade=new THREE.Mesh(new THREE.RingGeometry(96,104,64),new THREE.MeshStandardMaterial({color:0xc8bca8,roughness:0.88}));
    promenade.rotation.x=-Math.PI/2;promenade.position.set(0,4.08,0);scene.add(promenade);
}
function buildPlayer(){
    const grp=new THREE.Group();
    const mk=(g,c,x,y,z)=>{const me=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:c,roughness:0.88}));me.position.set(x,y,z);me.castShadow=true;grp.add(me);return me;};
    [-0.38,0.38].forEach(ox=>mk(new THREE.BoxGeometry(0.58,0.3,0.84),0x181410,ox,0.15,0.08));
    [-0.37,0.37].forEach(ox=>mk(new THREE.BoxGeometry(0.54,1.28,0.54),0x0e1520,ox,1.04,0));
    mk(new THREE.BoxGeometry(1.36,1.52,0.76),0x1a2848,0,2.44,0);
    [-0.9,0.9].forEach(ox=>{mk(new THREE.BoxGeometry(0.42,1.28,0.42),0x1a2848,ox,2.32,0);mk(new THREE.BoxGeometry(0.38,0.34,0.38),0xe8c090,ox,1.6,0);});
    mk(new THREE.BoxGeometry(1.02,1.02,1.02),0xe8c090,0,3.5,0);
    mk(new THREE.BoxGeometry(1.06,0.46,1.04),0x281808,0,3.9,0);
    [-0.22,0.22].forEach(ox=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.13,0.04),new THREE.MeshStandardMaterial({color:0x101820}));e.position.set(ox,3.46,0.52);grp.add(e);});
    return grp;
}
const gpsMat=new THREE.MeshBasicMaterial({color:0xffe040,depthTest:false,depthWrite:false,transparent:true,opacity:0.95});
function rebuildGPS(){
    while(gpsGrp.children.length)gpsGrp.remove(gpsGrp.children[0]);
    if(!activePad)return;
    const fx=player.position.x,fz=player.position.z;
    const tx=activePad.position.x,tz=activePad.position.z;
    const dx=tx-fx,dz=tz-fz;
    const dist=Math.sqrt(dx*dx+dz*dz);
    if(dist<1)return;
    const nx=dx/dist,nz=dz/dist,ang=Math.atan2(nx,nz);
    const geo=new THREE.BoxGeometry(0.42,0.22,2.0);
    const STEP=3.2,n=Math.floor((dist-3)/STEP);
    for(let i=0;i<n;i++){
        const t=3+(i+0.5)*STEP;
        if(t>=dist-2)break;
        const seg=new THREE.Mesh(geo,gpsMat);
        seg.position.set(fx+nx*t,4.9,fz+nz*t);
        seg.rotation.y=ang;seg.renderOrder=999;
        gpsGrp.add(seg);
    }
}
function testAABB(px,py,pz){
    for(const c of colls){if(px+PLAYER_R>c.x0&&px-PLAYER_R<c.x1&&py+PLAYER_H>c.y0&&py<c.y1&&pz+PLAYER_R>c.z0&&pz-PLAYER_R<c.z1)return true;}
    return false;
}
function addColl(wx,wz,ww,wh,wd,wy=0){colls.push({x0:wx-ww/2,x1:wx+ww/2,y0:wy,y1:wy+wh,z0:wz-wd/2,z1:wz+wd/2});}
function resolveMove(ox,oy,oz,nx,ny,nz){
    if(!testAABB(nx,ny,nz)){player.position.set(nx,ny,nz);return;}
    if(!testAABB(nx,oy,oz)){player.position.x=nx;return;}
    if(!testAABB(ox,oy,nz)){player.position.z=nz;return;}
    if(!testAABB(ox,ny,oz)){player.position.y=ny;return;}
    player.position.set(ox,oy,oz);
    if(ny!==oy)vspeed=0;
}
function checkRoom(){
    const px=player.position.x,pz=player.position.z;
    for(const r of ROOMS){
        if(px>r.x0&&px<r.x1&&pz>r.z0&&pz<r.z1){
            if(insideRoom!==r.label){
                insideRoom=r.label;
                const el=document.getElementById('roomLabel');
                el.textContent=r.label;el.style.opacity='1';
                setTimeout(()=>el.style.opacity='0',2500);
            }
            camTargetDist=14;camTargetH=10;return;
        }
    }
    if(insideRoom!==''){insideRoom='';}
    camTargetDist=30;camTargetH=17;
}
function getGroundY(x,z){
    for(const isl of ISLANDS){
        const dx=x-isl.cx,dz=z-isl.cz;
        if(Math.sqrt(dx*dx+dz*dz)<isl.r+2)return isl.h;
    }
    for(const s of STEPS){
        if(!s.bought)continue;
        if(s.type==='floor'&&(s.label.includes('Bridge')||s.label.includes('Span'))){
            if(x>s.x-s.w/2&&x<s.x+s.w/2&&z>s.z-s.d/2&&z<s.z+s.d/2)return 1.2;
        }
    }
    return -2;
}
function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),0.05);
    const ox=player.position.x,oy=player.position.y,oz=player.position.z;
    const tgt=KEYS['w']?18:KEYS['s']?-9:0;
    hspeed+=(tgt-hspeed)*0.16;
    let nx=ox-Math.sin(player.rotation.y)*hspeed*dt;
    let nz=oz-Math.cos(player.rotation.y)*hspeed*dt;
    if(KEYS['a'])player.rotation.y+=0.06;
    if(KEYS['d'])player.rotation.y-=0.06;
    const groundY=getGroundY(nx,nz);
    if(KEYS[' ']&&!jumping){vspeed=12;jumping=true;}
    let ny=oy;
    if(jumping){ny=oy+vspeed*dt;vspeed-=28*dt;if(ny<=groundY){ny=groundY;jumping=false;vspeed=0;}}
    else{if(oy>groundY+0.1){ny=Math.max(groundY,oy-0.4);}else{ny=groundY;}}
    resolveMove(ox,oy,oz,nx,ny,nz);
    if(jumping&&player.position.y<ny-0.01)vspeed=-1;
    if(jumping&&player.position.y<=groundY){player.position.y=groundY;jumping=false;vspeed=0;}
    checkRoom();
    camDist+=(camTargetDist-camDist)*0.08;
    camHeight+=(camTargetH-camHeight)*0.08;
    const ry=player.rotation.y;
    cam.position.x=player.position.x+Math.sin(ry)*camDist;
    cam.position.y=player.position.y+camHeight;
    cam.position.z=player.position.z+Math.cos(ry)*camDist;
    cam.lookAt(player.position.x,player.position.y+2,player.position.z);
    for(const p of placed){if(p.grp.scale.x<1){p.grp.scale.setScalar(Math.min(p.grp.scale.x+0.055,1));}}
    rebuildGPS();
    if(activePad){
        const d=player.position.distanceTo(activePad.position);
        const afford=wallet>=activePad.stepData.cost;
        nearPad=d<7;
        document.getElementById('buyPrompt').style.display=(nearPad&&afford)?'block':'none';
        if(nearPad&&afford&&KEYS['e']){KEYS['e']=false;doBuy(activePad.stepData);}
    }else{document.getElementById('buyPrompt').style.display='none';}
    ren.render(scene,cam);
    document.getElementById('vm').textContent=fmt(wallet);
    document.getElementById('vi').textContent=fmt(income)+'/s';
}
function getMat(n){return M[n]||M.plaster;}
function placeObj(s){
    const grp=new THREE.Group();
    const mat=getMat(s.mat);
    if(s.type==='wall'){buildWall(grp,s);}
    else if(s.type==='palm'){buildPalm(grp,s,mat);addColl(s.x,s.z,s.w*0.55,s.h,s.d*0.55);}
    else if(s.type==='custom'){buildCustom(grp,s,mat);}
    else{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(s.w,s.h,s.d),mat);
        mesh.position.y=s.h/2;mesh.castShadow=true;mesh.receiveShadow=true;grp.add(mesh);
        if(s.type!=='floor')addColl(s.x,s.z,s.w,s.h,s.d);
    }
    grp.position.set(s.x,0,s.z);grp.scale.setScalar(0.01);
    scene.add(grp);s.grp=grp;placed.push({grp,step:s});
    if(s.type==='wall'&&(s.label.includes('Lobby Back')||s.label.includes('Suite Back')||s.label.includes('Restaurant Wall S')||s.label.includes('Lodge Structure'))){
        const halfW=s.w>s.d?s.w/2-1:30,halfD=s.w>s.d?30:s.d/2-1;
        ROOMS.push({label:getRoomLabel(s),x0:s.x-halfW,x1:s.x+halfW,z0:s.z-halfD,z1:s.z+halfD});
    }
}
function getRoomLabel(s){
    if(s.label.includes('Lobby'))return'Grand Lobby';
    if(s.label.includes('Suite'))return'Penthouse Suite';
    if(s.label.includes('Restaurant'))return'La Meridian Restaurant';
    if(s.label.includes('Lodge'))return'Mountain Lodge';
    return'Interior';
}
function buildWall(grp,s){
    const mat=getMat(s.mat);const isZ=s.w>s.d;
    const len=isZ?s.w:s.d,thk=isZ?s.d:s.w;
    const H=s.h,dw=s.dw||4,dh=s.dh||6;
    const leftLen=len/2-dw/2,rightLen=len/2-dw/2,aboveH=H-dh;
    function seg(lx,lz,sw,sh,sd,yoff){
        yoff=yoff||0;if(sw<0.05||sd<0.05||sh<0.05)return;
        const m=new THREE.Mesh(isZ?new THREE.BoxGeometry(sw,sh,sd):new THREE.BoxGeometry(sd,sh,sw),mat);
        m.position.set(isZ?lx:0,yoff+sh/2,isZ?0:lx);m.castShadow=true;m.receiveShadow=true;grp.add(m);
    }
    if(leftLen>0.05){seg(-len/2+leftLen/2,0,leftLen,H,thk);if(isZ)addColl(s.x-len/2+leftLen/2,s.z,leftLen,H,thk);else addColl(s.x,s.z-len/2+leftLen/2,thk,H,leftLen);}
    if(rightLen>0.05){seg(len/2-rightLen/2,0,rightLen,H,thk);if(isZ)addColl(s.x+len/2-rightLen/2,s.z,rightLen,H,thk);else addColl(s.x,s.z+len/2-rightLen/2,thk,H,rightLen);}
    if(aboveH>0.05){
        const lm=new THREE.Mesh(isZ?new THREE.BoxGeometry(dw,aboveH,thk):new THREE.BoxGeometry(thk,aboveH,dw),mat);
        lm.position.set(0,dh+aboveH/2,0);lm.castShadow=true;lm.receiveShadow=true;grp.add(lm);
        if(isZ)colls.push({x0:s.x-dw/2,x1:s.x+dw/2,y0:dh,y1:H,z0:s.z-thk/2,z1:s.z+thk/2});
        else colls.push({x0:s.x-thk/2,x1:s.x+thk/2,y0:dh,y1:H,z0:s.z-dw/2,z1:s.z+dw/2});
    }
    const fm=M.brass;
    const mkf=(x,y,z,fw,fh,fd)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(fw,fh,fd),fm);m.position.set(x,y,z);grp.add(m);};
    const ft=0.16;
    if(isZ){mkf(0,dh,0,dw+ft*2,ft,thk+0.1);mkf(-dw/2-ft/2,dh/2,0,ft,dh,thk+0.1);mkf(dw/2+ft/2,dh/2,0,ft,dh,thk+0.1);}
    else{mkf(0,dh,0,thk+0.1,ft,dw+ft*2);mkf(0,dh/2,-dw/2-ft/2,thk+0.1,dh,ft);mkf(0,dh/2,dw/2+ft/2,thk+0.1,dh,ft);}
}
function buildPalm(grp,s,mat){
    const th=s.h*0.7;
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.27,th,10),M.trunk);
    tr.position.y=th/2;tr.castShadow=true;grp.add(tr);
    if(s.h>10){
        [0,1.8,3.4,5.0,6.4].forEach((yo,i)=>{const r=(s.w*0.32)*(1-i*0.15);const c=new THREE.Mesh(new THREE.ConeGeometry(r,s.h*0.2,10),mat);c.position.y=th*0.44+yo*(s.h*0.09);c.castShadow=true;grp.add(c);});
    }else{
        [0,0.9,1.7].forEach((yo,i)=>{const r=(s.w*1.05)*(1-i*0.22);const l=new THREE.Mesh(new THREE.CylinderGeometry(r*0.26,r,0.5,8),mat);l.position.y=th-0.3+yo;l.castShadow=true;grp.add(l);});
    }
}
function buildCustom(grp,s,mat){
    const add=(geo,m,x,y,z,ry)=>{ry=ry||0;const me=new THREE.Mesh(geo,m||mat);me.position.set(x,y,z);me.rotation.y=ry;me.castShadow=true;me.receiveShadow=true;grp.add(me);return me;};
    const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
    const C=(r,h,sg)=>new THREE.CylinderGeometry(r,r,h,sg||10);
    const S=(r,sg)=>new THREE.SphereGeometry(r,sg||10,sg||10);
    switch(s.custom){
    case 'reception':add(B(s.w,s.h,s.d),M.walnut,0,s.h/2,0);add(B(s.w+0.1,0.1,s.d+0.1),M.marble,0,s.h+0.05,0);add(B(s.w-0.5,s.h-0.4,0.06),M.oakLt,0,s.h/2-0.1,s.d/2+0.04);add(B(3.5,0.7,0.04),M.gold,0,s.h*0.78,s.d/2+0.07);addColl(s.x,s.z,s.w,s.h+0.1,s.d);break;
    case 'monitors':[-1.5,0,1.5].forEach(ox=>{add(B(1.6,1.1,0.06),M.charcoal,ox,s.h,0);add(B(0.14,0.4,0.12),M.darkMet,ox,s.h-0.65,0);});break;
    case 'sofa':{add(B(s.w,0.55,s.d),mat,0,0.28,0);add(B(s.w,0.95,0.32),mat,0,0.95,-s.d/2+0.18);const lc=new THREE.MeshStandardMaterial({color:adjColor(mat.color.getHex(),1.18),roughness:0.96});const nc2=Math.round(s.w/2);const cw=(s.w-0.28)/nc2;for(let i=0;i<nc2;i++)add(B(cw-0.1,0.24,s.d-0.5),lc,-s.w/2+0.14+cw/2+i*cw,0.69,0.08);[-s.w/2+0.14,s.w/2-0.14].forEach(ox=>add(B(0.26,0.78,s.d),mat,ox,0.55,0));[[-s.w/2+0.27,s.d/2-0.27],[s.w/2-0.27,s.d/2-0.27],[-s.w/2+0.27,-s.d/2+0.27],[s.w/2-0.27,-s.d/2+0.27]].forEach(([lx,lz])=>add(C(0.055,0.22),M.brass,lx,0.11,lz));addColl(s.x,s.z,s.w,1.5,s.d);break;}
    case 'coffeetbl':add(B(s.w,0.08,s.d),mat,0,s.h,0);add(B(s.w+0.04,0.04,s.d+0.04),M.brass,0,s.h+0.06,0);[[s.w/2-0.14,s.d/2-0.14],[-(s.w/2-0.14),s.d/2-0.14],[s.w/2-0.14,-(s.d/2-0.14)],[-(s.w/2-0.14),-(s.d/2-0.14)]].forEach(([lx,lz])=>add(B(0.08,s.h,0.08),mat,lx,s.h/2,lz));addColl(s.x,s.z,s.w,s.h+0.12,s.d);break;
    case 'piano':add(B(s.w,s.h,s.d),mat,0,s.h/2,0);add(B(s.w-0.08,0.05,s.d/2),mat,0,s.h+0.025,-s.d/4);add(B(s.w-0.7,0.04,0.48),M.white,0,s.h+0.02,s.d/2-0.38);[-0.2,0,0.2].forEach(px=>add(C(0.03,0.22),M.chrome,px,0.04,s.d/2+0.08));[[-s.w/2+0.18,s.d/2-0.28],[s.w/2-0.18,s.d/2-0.28],[0,-s.d/2+0.28]].forEach(([lx,lz])=>add(C(0.07,s.h*0.68),mat,lx,s.h*0.34,lz));addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'ceiling':add(B(s.w,s.h,s.d),M.plaster,0,7.4,0);for(let xi=-2;xi<=2;xi++)add(B(0.18,0.22,s.d-2.5),M.plasterW,xi*10,7.0,0);for(let zi=-2;zi<=2;zi++)add(B(s.w-2.5,0.22,0.18),M.plasterW,0,7.0,zi*10);break;
    case 'chandeliers':[-18,0,18].forEach(cx=>[-18,0,18].forEach(cz=>{add(C(0.03,1.4),M.brass,cx,6.6,cz);add(new THREE.CylinderGeometry(0.55,0.55,0.28,14),M.brass,cx,5.8,cz);add(S(0.7,14),M.goldLt,cx,5.6,cz);for(let a=0;a<6;a++){const ang2=a*Math.PI/3;const arm=add(B(0.85,0.03,0.06),M.brass,cx+Math.cos(ang2)*0.44,5.6,cz+Math.sin(ang2)*0.44);arm.rotation.y=ang2;}}));break;
    case 'bedframe':add(B(s.w,0.28,s.d),mat,0,0.14,0);add(B(s.w,s.h*2.8,0.22),mat,0,s.h*1.4,-s.d/2+0.13);add(B(s.w-0.5,s.h*2.2,0.1),M.navyFab,0,s.h*1.22,-s.d/2+0.27);add(B(s.w,s.h*0.9,0.18),mat,0,s.h*0.45,s.d/2-0.09);[-s.w/2+0.1,s.w/2-0.1].forEach(ox=>add(B(0.2,0.18,s.d),mat,ox,0.32,0));[[-s.w/2+0.17,-s.d/2+0.17],[s.w/2-0.17,-s.d/2+0.17],[-s.w/2+0.17,s.d/2-0.17],[s.w/2-0.17,s.d/2-0.17]].forEach(([lx,lz])=>add(B(0.18,0.32,0.18),mat,lx,0.16,lz));addColl(s.x,s.z,s.w,s.h*3,s.d);break;
    case 'mattress':add(B(s.w,s.h,s.d),M.linen,0,0.4+s.h/2,0);add(B(s.w+0.04,0.04,s.d+0.04),M.cream,0,0.4+s.h+0.02,0);addColl(s.x,s.z,s.w,0.4+s.h*1.5,s.d);break;
    case 'pillows':[-2.8,-0.95,0.95,2.8].forEach(ox=>{add(B(1.7,0.52,1.12),M.ivory,ox,2.4+0.26,0);add(B(1.5,0.04,0.04),M.cream,ox,2.4+0.52,0);});break;
    case 'nightstand':add(B(s.w,s.h,s.d),mat,0,s.h/2,0);add(B(s.w+0.06,0.06,s.d+0.06),M.marble,0,s.h+0.03,0);add(B(s.w-0.3,0.32,0.06),M.oakLt,0,s.h/2,s.d/2+0.04);add(S(0.05,6),M.brass,0,s.h/2,s.d/2+0.1);addColl(s.x,s.z,s.w,s.h+0.06,s.d);break;
    case 'lamp':add(C(0.05,s.h*0.64),M.brass,0,s.h*0.32,0);add(S(0.1,8),M.brass,0,0.08,0);add(new THREE.ConeGeometry(0.36,0.42,14,1,true),new THREE.MeshStandardMaterial({color:0xf0e8d0,roughness:0.9,side:THREE.DoubleSide}),0,s.h*0.76,0);addColl(s.x,s.z,0.4,s.h,0.4);break;
    case 'tv':add(B(s.w,s.h,0.1),M.black,0,s.h/2,0);add(B(s.w-0.28,s.h-0.28,0.02),M.charcoal,0,s.h/2,0.06);add(B(1.4,0.28,0.28),M.darkMet,0,s.h/2,0.18);addColl(s.x,s.z,s.w,s.h,0.18);break;
    case 'armchair':{add(B(s.w,0.52,s.d),mat,0,0.26,0);add(B(s.w,s.h,0.28),mat,0,s.h/2,-s.d/2+0.18);[-s.w/2+0.16,s.w/2-0.16].forEach(ox=>add(B(0.28,s.h*0.48,s.d),mat,ox,s.h*0.24,0));const cm=new THREE.MeshStandardMaterial({color:adjColor(mat.color.getHex(),1.14),roughness:0.97});add(B(s.w-0.62,0.22,s.d-0.48),cm,0,0.64,0.08);[[-s.w/2+0.22,s.d/2-0.22],[s.w/2-0.22,s.d/2-0.22],[-s.w/2+0.22,-s.d/2+0.22],[s.w/2-0.22,-s.d/2+0.22]].forEach(([lx,lz])=>add(B(0.09,0.18,0.09),M.darkMet,lx,0.09,lz));addColl(s.x,s.z,s.w,s.h,s.d);break;}
    case 'desk':add(B(s.w,0.07,s.d),mat,0,s.h,0);add(B(s.w+0.04,0.04,s.d+0.04),M.chrome,0,s.h+0.055,0);[[-s.w/2+0.11,s.d/2-0.11],[s.w/2-0.11,s.d/2-0.11]].forEach(([lx,lz])=>add(B(0.14,s.h,0.14),mat,lx,s.h/2,lz));add(B(s.w-0.25,s.h,0.14),mat,0,s.h/2,-s.d/2+0.1);add(B(2.1,1.35,0.06),M.black,0,s.h+0.76,-s.d/2+0.52);addColl(s.x,s.z,s.w,s.h+0.07,s.d);break;
    case 'bathtub':add(B(s.w,s.h,s.d),M.white,0,s.h/2,0);add(B(s.w-0.28,s.h-0.22,s.d-0.28),new THREE.MeshStandardMaterial({color:0xd4ecf4,roughness:0.04,metalness:0.04}),0,s.h/2+0.1,0);add(B(s.w+0.1,0.06,s.d+0.1),M.chrome,0,s.h+0.03,0);[[-s.w/2+0.26,s.d/2-0.26],[s.w/2-0.26,s.d/2-0.26],[-s.w/2+0.26,-s.d/2+0.26],[s.w/2-0.26,-s.d/2+0.26]].forEach(([lx,lz])=>add(S(0.14,7),M.chrome,lx,0.1,lz));add(C(0.038,0.48),M.chrome,-s.w/2+0.46,s.h+0.28,0);addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'vanity':add(B(s.w,s.h-0.48,s.d),M.walnut,0,(s.h-0.48)/2,0);add(B(s.w,0.06,s.d),M.marble,0,s.h-0.48,0);[-0.7,0.7].forEach(ox=>{add(B(0.76,0.07,0.56),M.white,ox,s.h-0.41,0);add(C(0.028,0.22),M.chrome,ox,s.h+0.02,0);});add(B(s.w-0.08,1.72,0.04),M.glassCl,0,s.h+0.92,-s.d/2-0.02);add(B(s.w+0.05,1.77,0.06),M.chrome,0,s.h+0.92,-s.d/2-0.05);addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'toilet':add(B(s.w,0.44,s.d*0.68),M.white,0,0.22,-0.1);add(B(s.w-0.08,0.1,s.d),M.white,0,0.5,0.08);add(B(s.w-0.14,0.38,s.d*0.44),M.white,0,0.68,s.d/2-0.14);addColl(s.x,s.z,s.w,1.1,s.d);break;
    case 'pool':add(B(s.w,0.55,s.d),M.poolTile,0,0.28,0);add(B(s.w-0.55,0.06,s.d-0.55),M.poolBlue,0,0.52,0);for(let li=-1;li<=1;li++)add(B(0.05,0.04,s.d-0.8),M.white,li*(s.w/3.1),0.54,0);add(B(s.w-1,0.3,1.2),M.marble,0,0.15,s.d/2+0.6);addColl(s.x-s.w/2,s.z,0.3,0.55,s.d);addColl(s.x+s.w/2,s.z,0.3,0.55,s.d);break;
    case 'lounger':{add(B(s.w,0.12,s.d),M.oakDk,0,0.32,0);for(let i=0;i<10;i++)add(B(s.w-0.1,0.07,0.15),M.oakLt,0,0.39,(-s.d/2+0.26)+i*(s.d-0.52)/9);add(B(s.w-0.12,0.18,s.d-0.2),mat,0,0.48,0);add(B(s.w-0.24,0.14,0.7),M.ivory,0,0.48,-s.d/2+0.5);[0.9*s.d/2,-0.9*s.d/2].forEach(oz=>[-s.w/2+0.1,s.w/2-0.1].forEach(ox=>add(C(0.05,0.3),M.steel,ox,0.15,oz)));addColl(s.x,s.z,s.w,0.66,s.d);break;}
    case 'umbrella':{add(C(0.05,s.h),M.steel,0,s.h/2,0);add(new THREE.CylinderGeometry(2.6,2.6,0.08,16),mat,0,s.h-0.14,0);for(let i=0;i<8;i++){const ang3=i*Math.PI/4;const rib=add(B(2.5,0.05,0.08),mat,Math.cos(ang3)*1.1,s.h-0.12,Math.sin(ang3)*1.1);rib.rotation.y=ang3;}addColl(s.x,s.z,0.2,s.h,0.2);break;}
    case 'bar':add(B(s.w,s.h,s.d),mat,0,s.h/2,0);add(B(s.w+0.14,0.08,s.d+0.14),M.marble,0,s.h+0.04,0);add(B(s.w-0.42,s.h-0.38,0.07),M.oakLt,0,s.h/2-0.1,s.d/2+0.04);add(B(s.w-1,0.06,0.22),M.oakMd,0,s.h*0.72,-s.d/2+0.14);addColl(s.x,s.z,s.w,s.h+0.08,s.d);break;
    case 'barstools':{const n=Math.round(s.w/1.75),sw=s.w/n;for(let i=0;i<n;i++){const ox=-s.w/2+sw/2+i*sw;add(C(0.038,1.82),M.steel,ox,0.91,0);add(new THREE.CylinderGeometry(0.3,0.26,0.13,12),M.warmGy,ox,1.87,0);}addColl(s.x,s.z,s.w,2.0,s.d);break;}
    case 'diningtable':{add(B(s.w,0.1,s.d),mat,0,s.h,0);add(B(s.w+0.05,0.04,s.d+0.05),M.brass,0,s.h+0.07,0);add(B(s.w-0.3,0.02,s.d-0.3),M.offWht,0,s.h+0.12,0);add(C(0.16,s.h),mat,0,s.h/2,0);add(B(s.w-1.5,0.1,0.16),mat,0,0.08,0);add(B(0.16,0.1,s.d-1.5),mat,0,0.08,0);[[0,s.d/2+0.52],[0,-s.d/2-0.52],[s.w/2+0.52,0],[-s.w/2-0.52,0]].forEach(([cx2,cz2],idx)=>{add(B(1.15,0.07,1.15),M.ivory,cx2,s.h-0.07,cz2);const bk=add(B(1.15,0.95,0.1),M.charFab,cx2,s.h+0.4,cz2+(cz2>0?-0.52:cz2<0?0.52:0));bk.rotation.y=idx>=2?Math.PI/2:0;[[-0.44,0.44],[0.44,0.44],[-0.44,-0.44],[0.44,-0.44]].forEach(([lx,lz2])=>add(B(0.07,s.h-0.07,0.07),M.darkMet,cx2+lx,(s.h-0.07)/2,cz2+lz2));});addColl(s.x,s.z,s.w,s.h+0.12,s.d);break;}
    case 'kitchen':add(B(s.w,s.h,s.d),M.steel,0,s.h/2,0);add(B(s.w-0.45,0.06,s.d-0.38),M.chrome,0,s.h+0.03,0);[-6,-2,2,6].forEach(ox=>add(new THREE.CylinderGeometry(0.17,0.18,0.07,8),M.steel,ox,s.h+0.07,0));addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'counter':add(B(s.w,0.07,s.d),M.marble,0,0.04,0);add(B(s.w+0.06,0.04,s.d+0.06),M.chrome,0,0.09,0);break;
    case 'jacuzzi':add(B(s.w,s.h,s.d),M.marble,0,s.h/2,0);add(B(s.w-0.45,0.08,s.d-0.45),M.poolBlue,0,s.h-0.04,0);for(let a=0;a<6;a++){const ang4=a*Math.PI/3;add(C(0.055,0.13),M.chrome,(s.w/2-0.32)*Math.cos(ang4),s.h*0.68,(s.d/2-0.32)*Math.sin(ang4));}add(B(s.w+0.9,0.32,0.75),M.marbleGy,0,0.16,s.d/2+0.38);addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'pylon':add(B(s.w,s.h,s.d),M.stoneLight,0,s.h/2,0);add(B(s.w+1.8,1.4,s.d+1.8),M.stoneLight,0,s.h+0.7,0);for(let i=0;i<4;i++)add(B(0.18,0.18,0.18),M.darkMet,s.w/2+0.1,s.h-i*8,0);addColl(s.x,s.z,s.w,s.h+1.4,s.d);break;
    case 'fireplace':add(B(s.w,s.h,s.d),M.stone,0,s.h/2,0);add(B(s.w-0.55,s.h*0.44,0.18),M.black,0,s.h*0.22,s.d/2+0.1);add(B(s.w+0.38,0.18,s.d+0.28),M.oakDk,0,s.h*0.68,0);addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'skiwall':add(B(s.w,s.h,s.d),mat,0,s.h/2,0);for(let i=0;i<3;i++)add(B(0.07,s.h-0.75,0.11),M.burg,(i-1)*2,s.h/2+0.08,s.d/2+0.07);for(let i=0;i<4;i++)add(C(0.032,s.h-1.1),M.steel,(i-1.5)*1.25,s.h/2,s.d/2+0.1);addColl(s.x,s.z,s.w,s.h,s.d);break;
    case 'aroof':add(B(s.w,0.45,s.d),mat,0,s.h,0);add(B(0.38,0.55,s.d),mat,0,s.h+0.5,0);add(B(s.w+0.55,0.22,0.22),M.oakLt,0,s.h+0.08,s.d/2);add(B(s.w+0.55,0.22,0.22),M.oakLt,0,s.h+0.08,-s.d/2);break;
    case 'arch':[-s.w/2+0.7,s.w/2-0.7].forEach(ox=>add(B(1.4,s.h,1.4),mat,ox,s.h/2,0));add(B(s.w,1.1,1.4),mat,0,s.h-0.55,0);add(B(s.w-3.2,1.65,0.14),M.gold,0,s.h-1.45,0.75);add(S(0.55,12),mat,0,s.h+0.55,0);addColl(s.x-s.w/2,s.z,1.4,s.h,1.4);addColl(s.x+s.w/2,s.z,1.4,s.h,1.4);break;
    default:add(B(s.w,s.h,s.d),mat,0,s.h/2,0);addColl(s.x,s.z,s.w,s.h,s.d);
    }
}
function adjColor(hex,f){return(Math.min(255,Math.floor(((hex>>16)&0xff)*f))<<16)|(Math.min(255,Math.floor(((hex>>8)&0xff)*f))<<8)|Math.min(255,Math.floor((hex&0xff)*f));}
function doBuy(s){wallet-=s.cost;s.bought=true;income+=s.inc;placeObj(s);showToast('✅  '+s.label);spawnPad();upProg();}
function spawnPad(){
    padList.forEach(p=>scene.remove(p));padList.length=0;activePad=null;
    const next=STEPS.find(s=>!s.bought&&(s.need===0||STEPS.find(x=>x.id===s.need)?.bought));
    if(next){
        const parent=STEPS.find(x=>x.id===next.need);
        const px=parent?parent.x+(next.ox||0):next.x+(next.ox||0);
        const pz=parent?parent.z+(next.oz||0):next.z+(next.oz||0);
        const py=(parent&&parent.type!=='floor'&&parent.h>0.5?parent.h:0)+PAD_FLOAT+4;
        const pad=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,0.22,32),new THREE.MeshBasicMaterial({color:0xffe040,transparent:true,opacity:0.9}));
        pad.position.set(px,py,pz);pad.stepData=next;
        scene.add(pad);padList.push(pad);activePad=pad;
        document.getElementById('ncn').textContent=next.label;
        document.getElementById('ncc').textContent=next.cost===0?'COMPLIMENTARY':fmt(next.cost);
    }else{
        document.getElementById('ncn').textContent='GRAND MERIDIAN COMPLETE';
        document.getElementById('ncc').textContent='';
        showToast('🎉 The Grand Meridian is open!');
        cloudSave();
    }
}
setInterval(()=>{if(gameRunning)wallet+=income;},1000);
window.addEventListener('keydown',e=>{if(e.key===' ')e.preventDefault();KEYS[e.key.toLowerCase()]=true;});
window.addEventListener('keyup',e=>{KEYS[e.key.toLowerCase()]=false;});
window.addEventListener('resize',()=>{if(!cam||!ren)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
<\/script>
</body>
</html>`;
}

export default Game;
