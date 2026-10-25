window.MoopyGame = window.MoopyGame || {};

(function (G) {
  "use strict";

  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");

  var SCALE_RES = 2;
  canvas.width  = G.Config.BASE_W * SCALE_RES;
  canvas.height = G.Config.BASE_H * SCALE_RES;

  // Expose untuk network.js
  G.gamePaused = true;

  // ── Round timer & game over state ─────────────────────────────────────────
  var roundTimerSecs = 99;
  var roundFrameCount = 0;
  var gameOverActive = false;
  var isTouchDevice = false;

  var selectedCharId   = "moopy";
  var p2SelectedCharId = "moopy";   // karakter yang dipilih player 2

  // Input player lokal
  var keys = { a: false, s: false };

  // Input player 2 remote (diisi oleh guest sync; pada host-side = disimulasi lokal jika solo)
  var remoteKeys = { a: false, s: false };
  // Discrete actions remote yang antri
  var remoteActionQueue = [];

  G.Camera = { shake: 0 };

  var LoadedAssets = { bg: null, heartbar: null, menu: null, moopyStickman: null, moopyWolf: null, dummy: null };

  // ── Background cache ──────────────────────────────────────────────────────
  var bgCache = document.createElement("canvas");
  bgCache.width  = G.Config.BASE_W * SCALE_RES;
  bgCache.height = G.Config.BASE_H * SCALE_RES;

  function buildGothicStageCache() {
    var bctx = bgCache.getContext("2d");
    bctx.save();
    bctx.scale(SCALE_RES, SCALE_RES);
    var W = G.Config.BASE_W, H = G.Config.BASE_H, GY = G.Config.GROUND_Y;

    var skyGrad = bctx.createLinearGradient(0, 0, 0, GY);
    skyGrad.addColorStop(0, "#66586e");
    skyGrad.addColorStop(0.55, "#87748b");
    skyGrad.addColorStop(1, "#5c4f66");
    bctx.fillStyle = skyGrad;
    bctx.fillRect(0, 0, W, GY);

    bctx.fillStyle = "rgba(72, 62, 84, 0.55)";
    bctx.beginPath();
    bctx.arc(145, 95, 78, Math.PI * 0.7, Math.PI * 2.1);
    bctx.arc(165, 95, 42, Math.PI * 2.1, Math.PI * 0.7, true);
    bctx.fill();

    bctx.strokeStyle = "rgba(225, 90, 120, 0.22)";
    bctx.lineWidth = 10; bctx.lineCap = "round";
    bctx.beginPath();
    bctx.moveTo(130, 62);
    bctx.bezierCurveTo(190, 115, 250, 80, 295, 18);
    bctx.stroke();

    bctx.fillStyle = "rgba(215, 200, 220, 0.25)";
    bctx.beginPath(); bctx.arc(278, 72, 18, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#7a6980";
    bctx.beginPath(); bctx.arc(282, 73, 12, 0, Math.PI * 2); bctx.fill();

    bctx.fillStyle = "#52465c";
    bctx.beginPath();
    bctx.moveTo(315, GY);
    [315,324,331,337,344,352,360,368,376].forEach(function(x,i){
      if(i===0){bctx.lineTo(x,125);}
      else{var hs=[92,120,56,115,84,118,96,130];bctx.lineTo(x,hs[i-1]);}
    });
    bctx.lineTo(376, GY); bctx.closePath(); bctx.fill();

    [[336,98],[326,126],[348,118],[358,112],[339,134]].forEach(function(c){
      bctx.fillStyle="#f43f5e"; bctx.fillRect(c[0],c[1],2,3.5);
    });

    bctx.fillStyle = "#3f364a";
    bctx.beginPath();
    bctx.arc(95,GY,55,Math.PI,0); bctx.arc(195,GY,38,Math.PI,0); bctx.arc(365,GY,52,Math.PI,0);
    bctx.fill();

    bctx.strokeStyle="#241f30"; bctx.lineWidth=7; bctx.lineCap="round";
    bctx.beginPath(); bctx.moveTo(95,GY); bctx.bezierCurveTo(80,185,135,155,145,95); bctx.stroke();

    bctx.lineWidth=3.5;
    bctx.beginPath();
    bctx.moveTo(125,142);bctx.bezierCurveTo(95,130,82,100,102,102);
    bctx.moveTo(132,132);bctx.bezierCurveTo(165,125,195,95,208,108);
    bctx.moveTo(145,95);bctx.bezierCurveTo(158,72,132,68,138,82);
    bctx.stroke();

    bctx.fillStyle="#120f1a";
    bctx.beginPath(); bctx.ellipse(141,69,5.5,8.5,0.25,0,Math.PI*2); bctx.fill();
    bctx.beginPath(); bctx.arc(144,61,4,0,Math.PI*2); bctx.fill();
    bctx.beginPath(); bctx.moveTo(147,60);bctx.lineTo(151,62);bctx.lineTo(147,63); bctx.fill();
    bctx.fillRect(136,75,2.5,9);
    bctx.fillStyle="#ffffff"; bctx.fillRect(144.5,60.5,1.5,1.5);

    var lx=224;
    bctx.strokeStyle="#171421"; bctx.lineWidth=2.5;
    bctx.beginPath(); bctx.moveTo(lx,GY); bctx.lineTo(lx,152); bctx.stroke();

    var halo = bctx.createRadialGradient(lx,144,2,lx,144,22);
    halo.addColorStop(0,"rgba(255,255,255,0.65)");
    halo.addColorStop(0.5,"rgba(235,230,245,0.22)");
    halo.addColorStop(1,"rgba(235,230,245,0)");
    bctx.fillStyle=halo;
    bctx.beginPath(); bctx.arc(lx,144,22,0,Math.PI*2); bctx.fill();

    bctx.fillStyle="#171421";
    bctx.beginPath(); bctx.moveTo(lx-8,138);bctx.lineTo(lx,130);bctx.lineTo(lx+8,138); bctx.closePath(); bctx.fill();
    bctx.fillStyle="#ffffff"; bctx.fillRect(lx-5,138,10,11);
    bctx.strokeStyle="#171421"; bctx.lineWidth=1.2;
    bctx.strokeRect(lx-5,138,10,11);
    bctx.beginPath(); bctx.moveTo(lx-2,138);bctx.lineTo(lx-2,149);bctx.moveTo(lx+2,138);bctx.lineTo(lx+2,149); bctx.stroke();

    var ux=274;
    bctx.fillStyle="#120f1a";
    bctx.beginPath(); bctx.arc(ux,196,4.5,0,Math.PI*2);
    bctx.moveTo(ux-5,200);bctx.quadraticCurveTo(ux-9,216,ux-6,224);
    bctx.lineTo(ux+6,224);bctx.quadraticCurveTo(ux+8,212,ux+4,200);
    bctx.fill();
    bctx.fillStyle="#ffffff"; bctx.fillRect(ux-2,195,1.4,1.4); bctx.fillRect(ux+1,195,1.4,1.4);

    bctx.strokeStyle="#120f1a"; bctx.lineWidth=1.6;
    bctx.beginPath(); bctx.moveTo(ux+12,GY);bctx.lineTo(ux+12,155); bctx.stroke();
    bctx.fillStyle="#120f1a";
    bctx.beginPath(); bctx.arc(ux+12,174,17,Math.PI,0); bctx.fill();

    bctx.fillStyle="#14111d";
    bctx.fillRect(0,115,52,GY-115); bctx.fillRect(0,115,62,16);
    bctx.fillRect(425,155,55,GY-155); bctx.fillRect(435,52,45,115); bctx.fillRect(415,68,65,22);

    bctx.strokeStyle="#14111d"; bctx.lineWidth=2;
    bctx.beginPath();
    bctx.moveTo(355,185); bctx.quadraticCurveTo(395,205,445,198);
    for(var fp=358;fp<=430;fp+=16){bctx.moveTo(fp,182);bctx.lineTo(fp-3,GY);}
    bctx.stroke();

    [[38,120],[45,126],[22,188],[28,194],[88,218],[96,222],[115,122],[134,112],[156,92],[178,112],
     [202,104],[164,222],[312,221],[322,224],[385,223],[428,72],[436,78],[442,160],[456,132]].forEach(function(b,i){
      bctx.fillStyle = i%2===0?"#f43f5e":"#fb7185";
      bctx.beginPath(); bctx.arc(b[0],b[1],2.2,0,Math.PI*2); bctx.fill();
    });

    var waterGrad = bctx.createLinearGradient(0,GY,0,H);
    waterGrad.addColorStop(0,"#1c1829"); waterGrad.addColorStop(0.3,"#3b344a"); waterGrad.addColorStop(1,"#1e1a29");
    bctx.fillStyle=waterGrad; bctx.fillRect(0,GY,W,H-GY);
    bctx.fillStyle="#120f1a"; bctx.fillRect(0,GY-2,W,3.5);
    bctx.fillStyle="rgba(226,232,240,0.35)";
    for(var wy=GY+5;wy<H-4;wy+=4){var rw=48-(wy-GY)*0.9; bctx.fillRect(lx-rw*0.5,wy,rw,1.5);}

    bctx.fillStyle="#0e0c14";
    bctx.beginPath();
    bctx.moveTo(105,H-6);bctx.quadraticCurveTo(145,GY+8,188,H-6);
    bctx.moveTo(335,H-8);bctx.quadraticCurveTo(385,GY+12,435,H-8);
    bctx.fill();

    bctx.restore();
  }

  function removeSolidBackground(img) {
    try {
      var off = document.createElement("canvas");
      off.width=img.width; off.height=img.height;
      var octx=off.getContext("2d"); octx.drawImage(img,0,0);
      var imgData=octx.getImageData(0,0,off.width,off.height); var data=imgData.data;
      var bgR=data[0],bgG=data[1],bgB=data[2],bgA=data[3];
      if(bgA>240){
        for(var i=0;i<data.length;i+=4){
          if(Math.abs(data[i]-bgR)<24&&Math.abs(data[i+1]-bgG)<24&&Math.abs(data[i+2]-bgB)<24) data[i+3]=0;
        }
        octx.putImageData(imgData,0,0); return off;
      }
    } catch(e){}
    return img;
  }

  function tryLoadFolderAsset(path, key, statusElId) {
    var img=new Image();
    img.onload=function(){
      LoadedAssets[key]=key==="heartbar"?removeSolidBackground(img):img;
      if(key==="menu"){
        var box=document.getElementById("customMenuBannerBox");
        var bi=document.getElementById("customMenuBannerImg");
        if(box&&bi){bi.src=img.src;box.classList.remove("hidden");}
      }
      var st=document.getElementById(statusElId);
      if(st){st.textContent="Aktif dari folder: "+path;st.className="text-sm text-emerald-400";}
    };
    img.src=path;
  }

  function initFolderAssets() {
    var p=G.Config.assetPaths;
    tryLoadFolderAsset(p.bg,"bg","statusBgAsset");
    tryLoadFolderAsset(p.heartbar,"heartbar","statusHeartAsset");
    tryLoadFolderAsset(p.menu,"menu","statusMenuAsset");
    tryLoadFolderAsset(p.moopyStickman,"moopyStickman","statusMoopyAsset");
    tryLoadFolderAsset(p.moopyWolf,"moopyWolf","statusWolfAsset");
    tryLoadFolderAsset(p.dummy,"dummy","");
  }

  // ── Overlay DOM refs ──────────────────────────────────────────────────────
  var startPlayOverlay  = document.getElementById("startPlayOverlay");
  var charSelectOverlay = document.getElementById("charSelectOverlay");
  var cardMoopy   = document.getElementById("cardSelectMoopy");
  var cardSimon   = document.getElementById("cardSelectSimon");
  var cardXeera   = document.getElementById("cardSelectXeera");
  var cardVioley  = document.getElementById("cardSelectVioley");

  // ── Character selection ───────────────────────────────────────────────────
  function applyCharSelect(fighter, id) {
    fighter.charId    = id;
    fighter.isWolf    = false;
    fighter.evoTimer  = 0;
    fighter.energy    = 0;
    fighter.state     = "idle";
    fighter.stateTimer= 0;
    fighter.attackType= "";
    fighter.blitzRemaining=0; fighter.blitzTimer=0; fighter.stormTimer=0;
    fighter.vx=0; fighter.vy=0;
    fighter.onGround  = true;
    fighter.jumpsUsed = 0;
    fighter.hasEnergy = id !== "violey";
    fighter.gunToggle = 0;
  }

  function selectCharacter(id) {
    selectedCharId = id;
    applyCharSelect(G.moopy, id);
    G.FX.slashBarriers.length=0; G.FX.windSlashes.length=0; G.FX.giantCleaves.length=0;
    G.FX.feralArcs.length=0; G.FX.ribbonVortices.length=0; G.FX.xCrossClaws.length=0;
    G.FX.feralSpeedLines.length=0; G.FX.roarWaves.length=0;
    G.FX.violeyProjectiles.length=0; G.FX.violeySmokes.length=0;
    G.FX.violeyBeams.length=0; G.FX.violeyMuzzles.length=0;
    G.Actions.updateModeBadge();

    var base="pixel-box p-3 cursor-pointer border-4 border-[#4a3f6b] bg-[#120e24] opacity-80 transition-all flex flex-col items-center text-center";
    var cards={moopy:cardMoopy,simon:cardSimon,xeera:cardXeera,violey:cardVioley};
    var borders={moopy:"border-cyan-400",simon:"border-amber-400",xeera:"border-purple-400",violey:"border-pink-400"};
    Object.keys(cards).forEach(function(k){
      if(!cards[k]) return;
      if(k===id) cards[k].className="pixel-box p-3 cursor-pointer border-4 "+borders[k]+" bg-[#1c1538] transition-all flex flex-col items-center text-center";
      else cards[k].className=base;
    });
  }

  // ── Multiplayer Modal ─────────────────────────────────────────────────────
  var mpModal     = document.getElementById("multiplayerModal");
  var panelHost   = document.getElementById("panelHost");
  var panelJoin   = document.getElementById("panelJoin");
  var tabHostBtn  = document.getElementById("tabHost");
  var tabJoinBtn  = document.getElementById("tabJoin");
  var mpStatus    = document.getElementById("mpConnectStatus");

  function showMPStatus(msg, color) {
    mpStatus.textContent = msg;
    mpStatus.className = "mt-3 font-vt text-base text-center " + (color||"text-slate-400");
    mpStatus.classList.remove("hidden");
  }

  tabHostBtn.addEventListener("click", function(){
    panelHost.classList.remove("hidden"); panelJoin.classList.add("hidden");
    tabHostBtn.className="flex-1 pixel-btn pixel-btn-cyan py-2 text-[9px] text-sky-100";
    tabJoinBtn.className="flex-1 pixel-btn py-2 text-[9px] text-slate-300";
  });
  tabJoinBtn.addEventListener("click", function(){
    panelJoin.classList.remove("hidden"); panelHost.classList.add("hidden");
    tabJoinBtn.className="flex-1 pixel-btn pixel-btn-cyan py-2 text-[9px] text-sky-100";
    tabHostBtn.className="flex-1 pixel-btn py-2 text-[9px] text-slate-300";
  });

  document.getElementById("btnMultiplayer").addEventListener("click", function(){
    mpModal.classList.remove("hidden");
  });
  document.getElementById("btnCloseMPModal").addEventListener("click", function(){
    mpModal.classList.add("hidden");
  });

  // ── Host Room ─────────────────────────────────────────────────────────────
  document.getElementById("btnCreateRoom").addEventListener("click", function(){
    var nick = (document.getElementById("inputNickname").value||"Player").trim();
    G.Network.setLocalNickname(nick);
    showMPStatus("Membuat ruangan…", "text-amber-300");

    G.Network.hostRoom(nick, function(code){
      document.getElementById("roomCodeText").textContent = code;
      document.getElementById("roomCodeDisplay").classList.remove("hidden");
      showMPStatus("Menunggu lawan bergabung…", "text-amber-300");
    });

    G.Network.onOpponentJoined = function(remoteName){
      document.getElementById("waitingOpponent").textContent = remoteName + " bergabung!";
      document.getElementById("waitingOpponent").className = "font-pixel text-[8px] text-emerald-300 mt-2";
      showMPStatus(remoteName + " bergabung! Pilih karakter.", "text-emerald-300");
      startMultiplayerCharSelect();
    };

    G.Network.onError = function(err){
      showMPStatus("Error: " + err.type, "text-rose-400");
    };
  });

  // ── Join Room ─────────────────────────────────────────────────────────────
  document.getElementById("btnJoinRoom").addEventListener("click", function(){
    var code = (document.getElementById("inputRoomCode").value||"").trim().toUpperCase();
    if(code.length < 4){ showMPStatus("Masukkan kode ruangan!", "text-rose-400"); return; }
    var nick = (document.getElementById("inputNickname").value||"Player 2").trim();
    G.Network.setLocalNickname(nick);
    showMPStatus("Menghubungkan ke " + code + "…", "text-amber-300");

    G.Network.joinRoom(code, nick);

    G.Network.onConnected = function(){
      showMPStatus("Terhubung! Pilih karakter.", "text-emerald-300");
      startMultiplayerCharSelect();
    };

    G.Network.onError = function(err){
      showMPStatus("Gagal: " + (err.type||err), "text-rose-400");
    };
  });

  // ── Start multiplayer char select ─────────────────────────────────────────
  function startMultiplayerCharSelect() {
    mpModal.classList.add("hidden");
    G.Network.gameMode = "multiplayer";
    startPlayOverlay.classList.add("hidden");
    charSelectOverlay.classList.remove("hidden");
    G.gamePaused = true;

    // Tampilkan info lawan
    document.getElementById("opponentInfo").classList.remove("hidden");
    document.getElementById("opponentName").textContent = G.Network.getRemoteNickname();

    // Inisialisasi player 2 agar bergerak dari kanan
    G.moopy.x   = 130; G.moopy.facing   = 1;
    G.player2.x = 335; G.player2.facing = -1;
    applyCharSelect(G.player2, "moopy");

    // Dengarkan pilihan karakter lawan
    G.Network.onRemoteCharSelect = function(charId, isReady, name){
      p2SelectedCharId = charId;
      document.getElementById("opponentChar").textContent = charId.toUpperCase();
      if(isReady){
        document.getElementById("opponentChar").textContent = charId.toUpperCase() + " ✓";
      }
    };
  }

  // ── Hooks disconnect ──────────────────────────────────────────────────────
  G.Network.onDisconnect = function(){
    if(G.Network.gameMode !== "multiplayer") return;
    G.Network.gameMode = "singleplayer";
    G.gamePaused = true;
    alert("Lawan disconnect.");
    document.getElementById("mainMenuOverlay").classList.add("hidden");
    startPlayOverlay.classList.remove("hidden");
    document.getElementById("mpStatusBar").classList.add("hidden");
    document.getElementById("btnDisconnectMP").classList.add("hidden");
    document.getElementById("pingBadge").classList.add("hidden");
  };

  // ── Char select listeners ─────────────────────────────────────────────────
  document.getElementById("btnPlayNow").addEventListener("click", function(){
    startPlayOverlay.classList.add("hidden");
    charSelectOverlay.classList.remove("hidden");
    G.Sound.init();
  });
  document.getElementById("btnPlayAssets").addEventListener("click", function(){ document.getElementById("assetsModal").classList.remove("hidden"); });
  document.getElementById("btnPlayMoves").addEventListener("click", function(){ document.getElementById("movesModal").classList.remove("hidden"); });
  document.getElementById("btnBackToPlay").addEventListener("click", function(){
    charSelectOverlay.classList.add("hidden");
    startPlayOverlay.classList.remove("hidden");
  });

  if(cardMoopy)  cardMoopy.addEventListener("click",  function(){ selectCharacter("moopy");  sendCharIfMP(); });
  if(cardSimon)  cardSimon.addEventListener("click",  function(){ selectCharacter("simon");  sendCharIfMP(); });
  if(cardXeera)  cardXeera.addEventListener("click",  function(){ selectCharacter("xeera");  sendCharIfMP(); });
  if(cardVioley) cardVioley.addEventListener("click", function(){ selectCharacter("violey"); sendCharIfMP(); });

  function sendCharIfMP(){
    if(G.Network.gameMode === "multiplayer"){
      G.Network.sendCharSelect(selectedCharId, false);
    }
  }

  document.getElementById("btnConfirmChar").addEventListener("click", function(){
    selectCharacter(selectedCharId);
    if(G.Network.gameMode === "multiplayer"){
      applyCharSelect(G.player2, p2SelectedCharId);
      G.Network.sendCharSelect(selectedCharId, true);
      // Host mulai laga, guest tunggu START_FIGHT atau langsung jika sudah connect
      if(G.Network.isHost()){
        G.Network.sendStartFight();
        startFight();
      } else {
        // Guest: tunggu START_FIGHT
        G.Network.onStartFight = function(){ startFight(); };
        // Jika host sudah konfirm duluan (FULL_STATE sudah datang), mulai langsung
        G.Network.onFullState = handleFullState;
      }
    } else {
      startFight();
    }
  });

  function startFight(){
    charSelectOverlay.classList.add("hidden");
    G.gamePaused = false;
    G.Sound.init();

    // Reset timer
    roundTimerSecs = 99;
    roundFrameCount = 0;
    gameOverActive = false;
    document.getElementById("timerDisplay").textContent = "99";
    document.getElementById("roundTimer").classList.remove("hidden");

    // Deteksi touch device, tampilkan kontrol sentuh
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      document.getElementById("touchControls").style.display = "block";
    }

    if(G.Network.gameMode === "multiplayer"){
      document.getElementById("mpStatusBar").classList.remove("hidden");
      document.getElementById("mpStatusRoom").textContent = "ROOM: " + G.Network.getRoomCode();
      document.getElementById("btnDisconnectMP").classList.remove("hidden");
      document.getElementById("pingBadge").classList.remove("hidden");

      // Pasang hooks multiplayer
      hookMultiplayer();
    }
  }

  // ── Multiplayer hooks ─────────────────────────────────────────────────────
  function hookMultiplayer(){
    if(G.Network.isHost()){
      // Host: terima input keys dari guest
      G.Network.onRemoteInput = function(remKeys){
        remoteKeys.a = !!remKeys.a;
        remoteKeys.s = !!remKeys.s;
      };
      // Host: terima aksi diskret dari guest (jump, attack, skill)
      G.Network.onRemoteDiscreteAction = function(pkt){
        remoteActionQueue.push(pkt);
      };
      G.Network.onFullState = null;
    } else {
      // Guest: terima state lengkap dari host (posisi, HP, dll)
      G.Network.onFullState = handleFullState;
      // Guest: terima aksi diskret dari host (untuk animasi FX)
      G.Network.onDiscreteAction = function(pkt){
        remoteActionQueue.push(pkt);
      };
      G.Network.onRemoteInput = null;
    }
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
  function showGameOver(playerWon, reason) {
    if (gameOverActive) return;
    gameOverActive = true;
    G.gamePaused = true;
    var overlay = document.getElementById("gameOverOverlay");
    var title   = document.getElementById("gameOverTitle");
    var sub     = document.getElementById("gameOverSub");
    if (playerWon) {
      title.textContent = "MENANG!";
      title.className   = "font-pixel text-xl text-emerald-300 mb-1";
      sub.textContent   = reason || "Lawan dikalahkan!";
    } else {
      title.textContent = "KALAH!";
      title.className   = "font-pixel text-xl text-rose-400 mb-1";
      sub.textContent   = reason || "Kamu dikalahkan!";
    }
    overlay.style.display = "flex";
  }

  function resetRound() {
    var m = G.moopy;
    var d = G.dummy;
    m.x=130; m.y=G.Config.GROUND_Y; m.vx=0; m.vy=0; m.onGround=true; m.jumpsUsed=0;
    m.state="idle"; m.stateTimer=0; m.attackType="";
    m.blitzRemaining=0; m.blitzTimer=0; m.stormTimer=0;
    m.comboStep=0; m.comboWindow=0; m.comboCount=0; m.comboResetTimer=0;
    m.hp=m.maxHp; m.displayHp=m.maxHp;
    m.dashCharges=m.maxDashCharges;
    m.evoTimer=0; m.isWolf=false; m.energy=0;
    m.cd.dash=0; m.cd.wolf=0; m.cd.roar=0; m.cd.laser=0;
    if (G.Network.gameMode === "multiplayer") {
      var p2 = G.player2;
      p2.x=335; p2.y=G.Config.GROUND_Y; p2.vx=0; p2.vy=0; p2.onGround=true;
      p2.hp=p2.maxHp; p2.displayHp=p2.maxHp; p2.stunTimer=0;
    } else {
      d.x=335; d.y=G.Config.GROUND_Y; d.vx=0; d.vy=0; d.onGround=true;
      d.hp=d.maxHp; d.displayHp=d.maxHp; d.stunTimer=0; d.koResetTimer=0; d.aiTick=0;
    }
    G.FX.slashBarriers.length=0; G.FX.windSlashes.length=0; G.FX.giantCleaves.length=0;
    G.FX.feralArcs.length=0; G.FX.ribbonVortices.length=0; G.FX.xCrossClaws.length=0;
    G.FX.feralSpeedLines.length=0; G.FX.roarWaves.length=0;
    if(G.FX.violeyProjectiles) G.FX.violeyProjectiles.length=0;
    if(G.FX.violeySmokes) G.FX.violeySmokes.length=0;
    roundTimerSecs=99; roundFrameCount=0; gameOverActive=false;
    document.getElementById("gameOverOverlay").style.display = "none";
    document.getElementById("timerDisplay").textContent = "99";
    G.Actions.updateModeBadge();
    G.gamePaused = false;
  }

  function handleFullState(data){
    if(!data) return;
    var p1 = data.p1, p2 = data.p2;
    if(!p1||!p2) return;
    // Guest: moopy = player lokal (player2 di sisi host), player2 = host
    // Kita simpan saja: p1 = G.moopy view of host, p2 = G.player2 view of host
    // Karena di guest: G.moopy = karakter guest, G.player2 = karakter host
    // Host kirim p1=moopy (host), p2=player2 (guest)
    // Di guest: kita interpolate posisi, tapi biarkan input lokal override movement
    var guestM  = G.moopy;   // karakter guest
    var hostM   = G.player2; // karakter host (dirender sebagai "dummy" slot)

    // Update host character (player2 di guest screen)
    hostM.x       = p1.x;   hostM.y        = p1.y;
    hostM.vx      = p1.vx;  hostM.vy       = p1.vy;
    hostM.facing  = p1.facing;
    hostM.hp      = p1.hp;
    hostM.energy  = p1.energy;
    hostM.isWolf  = p1.isWolf;
    hostM.state   = p1.state;
    hostM.attackType = p1.attackType;
    hostM.stunTimer  = p1.stunTimer;
    hostM.onGround   = p1.onGround;
    if(p1.cd){ hostM.cd.dash=p1.cd.dash; hostM.cd.wolf=p1.cd.wolf; hostM.cd.roar=p1.cd.roar; hostM.cd.laser=p1.cd.laser; }

    // Update guest character (authoritative HP / energy dari host; posisi dari prediksi lokal)
    guestM.hp     = p2.hp;
    guestM.energy = p2.energy;
    guestM.isWolf = p2.isWolf;
    guestM.stunTimer = p2.stunTimer;
    if(p2.cd){ guestM.cd.dash=p2.cd.dash; guestM.cd.wolf=p2.cd.wolf; guestM.cd.roar=p2.cd.roar; guestM.cd.laser=p2.cd.laser; }

    // Ping badge
    if(data.ping !== undefined){
      document.getElementById("pingValue").textContent = data.ping;
      document.getElementById("mpStatusPing").textContent = data.ping + "ms";
    }
  }

  // ── Input handling ────────────────────────────────────────────────────────
  function highlightButton(k, isDown){
    var btn=document.querySelector('.key-btn[data-key="'+k+'"]');
    if(btn){ isDown?btn.classList.add("active-key"):btn.classList.remove("active-key"); }
  }

  function handleKeyDown(key){
    if(G.gamePaused) return;
    var k=key.toLowerCase();
    highlightButton(k, true);
    var isMP = G.Network.gameMode === "multiplayer";

    if(k==="w"||k==="arrowup"||k===" "){ G.Actions.jump(); if(isMP) G.Network.sendDiscreteAction("jump"); }
    else if(k==="a"||k==="arrowleft")  { keys.a=true; }
    else if(k==="s"||k==="d"||k==="arrowright"){ keys.s=true; }
    else if(k==="j"){ G.Actions.basicAttackJ(); if(isMP) G.Network.sendDiscreteAction("j"); }
    else if(k==="k"){ G.Actions.kickAttackK();  if(isMP) G.Network.sendDiscreteAction("k"); }
    else if(k==="l"){ G.Actions.dash();         if(isMP) G.Network.sendDiscreteAction("l"); }
    else if(k==="p"){ G.Actions.ultimateTransformP(); if(isMP) G.Network.sendDiscreteAction("p"); }
    else if(k==="u"){ G.Actions.wolfRoarU();    if(isMP) G.Network.sendDiscreteAction("u"); }
    else if(k==="i"){ G.Actions.wolfLaserI();   if(isMP) G.Network.sendDiscreteAction("i"); }
  }

  function handleKeyUp(key){
    var k=key.toLowerCase();
    highlightButton(k, false);
    if(k==="a"||k==="arrowleft")            keys.a=false;
    if(k==="s"||k==="d"||k==="arrowright")  keys.s=false;
  }

  window.addEventListener("keydown", function(e){
    if(e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")) return;
    var k=e.key.toLowerCase();
    if(["w","a","s","d","j","k","l","p","u","i","arrowup","arrowleft","arrowright"," "].indexOf(k)!==-1) e.preventDefault();
    if(e.repeat&&["w","j","k","l","p","u","i","arrowup"," "].indexOf(k)!==-1) return;
    handleKeyDown(k);
  });
  window.addEventListener("keyup", function(e){ handleKeyUp(e.key); });

  document.querySelectorAll(".key-btn").forEach(function(btn){
    var keyName=btn.getAttribute("data-key");
    btn.addEventListener("pointerdown", function(e){ e.preventDefault(); handleKeyDown(keyName); });
    btn.addEventListener("pointerup",   function(e){ e.preventDefault(); handleKeyUp(keyName); });
    btn.addEventListener("pointerleave",function(){ handleKeyUp(keyName); });
  });

  // ── HUD helpers ───────────────────────────────────────────────────────────
  function updateBottomSkillButtons(){
    var m=G.moopy;
    var elL=document.getElementById("cdTextL");
    var elP=document.getElementById("cdTextP");
    var elU=document.getElementById("cdTextU");
    var elI=document.getElementById("cdTextI");

    if(elL) elL.textContent = m.cd.dash>0?(m.cd.dash/60).toFixed(1)+"s":"";
    if(elP){
      if(m.charId==="violey")          elP.textContent = m.cd.wolf>0?(m.cd.wolf/60).toFixed(1)+"s":"";
      else if(m.isWolf)                elP.textContent = ((m.energy/m.maxEnergy)*27).toFixed(1)+"s";
      else if(m.energy<m.maxEnergy)    elP.textContent = Math.floor(m.energy)+"%";
      else                             elP.textContent = "MAX";
    }
    if(elU) elU.textContent = m.cd.roar>0?(m.cd.roar/60).toFixed(1)+"s":"";
    if(elI) elI.textContent = m.cd.laser>0?(m.cd.laser/60).toFixed(1)+"s":"";
  }

  // ── Remote action processor (host menerap aksi guest, guest render FX host) ──
  function processRemoteActions(){
    while(remoteActionQueue.length > 0){
      var pkt = remoteActionQueue.shift();
      if(!pkt) continue;

      if(G.Network.isHost()){
        // Host menjalankan aksi guest sebagai player2
        var p2 = G.player2;
        switch(pkt.action){
          case "jump": G.Actions.jump(p2); break;
          case "j":    G.Actions.basicAttackJ(p2, G.moopy); break;
          case "k":    G.Actions.kickAttackK(p2, G.moopy);  break;
          case "l":    G.Actions.dash(p2); break;
          case "p":    G.Actions.ultimateTransformP(p2); break;
          case "u":    G.Actions.wolfRoarU(p2, G.moopy);    break;
          case "i":    G.Actions.wolfLaserI(p2, G.moopy);   break;
        }
      }
      // Guest: aksi diskret host sudah diterapkan via handleFullState (state sync)
      // kita skip agar tidak double-apply
    }
  }

  // ── Game update ───────────────────────────────────────────────────────────
  function updateGame(){
    if(G.gamePaused) return;
    var m   = G.moopy;
    var cfg = G.Config;
    var s   = cfg.charScale;
    var isMP = G.Network.gameMode === "multiplayer";

    // Tentukan "target" (siapa yang diserang oleh moopy)
    var target = isMP ? G.player2 : G.dummy;

    // ── Round timer ───────────────────────────────────────────────────────
    if (!gameOverActive) {
      roundFrameCount++;
      if (roundFrameCount >= 60) {
        roundFrameCount = 0;
        roundTimerSecs = Math.max(0, roundTimerSecs - 1);
        var tDisp = document.getElementById("timerDisplay");
        if (tDisp) {
          tDisp.textContent = roundTimerSecs;
          tDisp.style.color = roundTimerSecs <= 10 ? "#f43f5e" : "#fbbf24";
        }
        if (roundTimerSecs <= 0) {
          // Waktu habis: siapa HP lebih tinggi menang
          if (m.hp > target.hp) showGameOver(true, "Waktu habis - HP lebih tinggi!");
          else if (target.hp > m.hp) showGameOver(false, "Waktu habis - HP lawan lebih tinggi!");
          else showGameOver(true, "Waktu habis - SERI!");
          return;
        }
      }
      // Cek KO
      if (!isMP && target.hp <= 0 && !gameOverActive) {
        showGameOver(true, "KO! Lawan dikalahkan!");
        return;
      }
      if (m.hp <= 0 && !gameOverActive) {
        showGameOver(false, "KO! Kamu dikalahkan!");
        return;
      }
    }

    m.animTick++;
    if(m.isWolf) m.wolfAuraTimer++;
    if(m.comboWindow>0) m.comboWindow--;
    if(m.comboResetTimer>0){ m.comboResetTimer--; if(m.comboResetTimer===0) m.comboCount=0; }

    G.Actions.updateEnergyDrain();

    if(m.cd.dash>0){ m.cd.dash--; if(m.cd.dash===0) m.dashCharges=m.maxDashCharges; }
    if(m.cd.wolf>0)  m.cd.wolf--;
    if(m.cd.roar>0)  m.cd.roar--;
    if(m.cd.laser>0) m.cd.laser--;

    updateBottomSkillButtons();

    m.displayHp  += (m.hp  - m.displayHp)  * 0.15;
    target.displayHp += (target.hp - target.displayHp) * 0.15;

    // Partikel aura evolusi
    if(m.isWolf && m.animTick%5===0){
      var pCol = m.charId==="xeera"?(Math.random()>0.5?"#a855f7":"#f43f5e"):
                 m.charId==="simon"?(Math.random()>0.5?"#00e5ff":"#ffbe0b"):
                 (Math.random()>0.5?"#e11d48":"#a855f7");
      G.FX.particles.push({x:m.x+(Math.random()*18-9)*s,y:m.y-Math.random()*16*s,
        vx:(Math.random()-0.5)*0.5,vy:-0.9-Math.random()*0.7,size:2,color:pCol,gravity:0,life:13});
    }

    // Proses aksi remote
    processRemoteActions();

    // ── Giant Cleave Xeera (evo U) ────────────────────────────────────────
    for(var gcIdx=G.FX.giantCleaves.length-1;gcIdx>=0;gcIdx--){
      var gc=G.FX.giantCleaves[gcIdx]; gc.age++;
      if(gc.age===26){
        G.Sound.play("laser"); G.Camera.shake=12;
        G.FX.spawnStarImpact(gc.epicenterX,gc.epicenterY-14,1.5);
        var inCleave=(gc.facing===1&&target.x>=gc.originX-15&&target.x<=gc.epicenterX+125)||
                     (gc.facing===-1&&target.x<=gc.originX+15&&target.x>=gc.epicenterX-125);
        if(inCleave) G.Actions.applyDamage(m, target, 42, 4.5, -3.5, "#d946ef","",false);
      }
      if(gc.age>28&&gc.age<120){
        if(gc.age%6===0){
          var rx=gc.epicenterX+(Math.random()*150-75);
          var ry=gc.epicenterY-12-Math.random()*95;
          gc.afterSlashes.push({x:rx,y:ry,len:22+Math.random()*26,angle:(Math.random()-0.5)*2.4,life:10});
          G.FX.spawnHitParticles(rx,ry,"#a855f7",4);
        }
        if(gc.age%9===0){
          gc.pillars.push({x:gc.epicenterX+(Math.random()*140-70),w:5+Math.random()*6,
            h:55+Math.random()*75,life:14,maxLife:14});
        }
        if(gc.age%12===0){
          if(Math.abs(target.x-gc.epicenterX)<115){
            G.Sound.play("claw"); G.Camera.shake=5;
            G.Actions.applyDamage(m, target, 18, 1.2, -1.6, "#c084fc","",false);
          }
        }
      }
      for(var asI=gc.afterSlashes.length-1;asI>=0;asI--){ gc.afterSlashes[asI].life--; if(gc.afterSlashes[asI].life<=0) gc.afterSlashes.splice(asI,1); }
      for(var plI=gc.pillars.length-1;plI>=0;plI--){ gc.pillars[plI].life--; if(gc.pillars[plI].life<=0) gc.pillars.splice(plI,1); }
      if(gc.age>=gc.maxAge) G.FX.giantCleaves.splice(gcIdx,1);
    }

    // ── Violey Projectiles ────────────────────────────────────────────────
    for(var vpIdx=G.FX.violeyProjectiles.length-1;vpIdx>=0;vpIdx--){
      var vp=G.FX.violeyProjectiles[vpIdx];
      if(!vp.hasHit){
        var hitXv=Math.abs(vp.x-target.x)<(vp.type==="apaty_heavy"?26:20);
        var hitYv=Math.abs(vp.y-(target.y-18*s))<26;
        if(hitXv&&hitYv){
          vp.hasHit=true;
          var pushDirV=vp.vx>=0?1:-1;
          if(vp.type==="smoke_stun_bullet"){
            G.Sound.play("thunder");
            G.FX.spawnThickDashSmoke(target.x,target.y-18*s,-pushDirV);
            G.FX.spawnStarImpact(target.x,target.y-18*s,0.9);
            G.Actions.applyDamage(m,target,vp.dmg,pushDirV*4.2,-3.0,"#f472b6","",false);
            target.stunTimer=Math.max(target.stunTimer,vp.stun);
          } else if(vp.type==="apaty_heavy"){
            G.Sound.play("thunder");
            G.FX.spawnStarImpact(target.x,target.y-18*s,1.0);
            G.Actions.applyDamage(m,target,vp.dmg,pushDirV*6.5,-3.8,"#d946ef","",false);
          } else {
            G.Sound.play("punch");
            G.FX.spawnHitParticles(target.x,target.y-18*s,"#f472b6",6);
            G.Actions.applyDamage(m,target,vp.dmg,pushDirV*2.2,-1.4,"#f472b6","",false);
          }
          G.FX.violeyProjectiles.splice(vpIdx,1);
        }
      }
    }

    // Violey Air U scatter
    if(m.attackType==="violeyAirU"&&m.state==="violeyAirU"){
      if([26,20,14,8].indexOf(m.stateTimer)!==-1){
        G.Sound.play("zap");
        var scatterAngles=[0.15,0.65,Math.PI*0.5,Math.PI-0.65,Math.PI-0.15,-0.35];
        for(var saIdx=0;saIdx<scatterAngles.length;saIdx++){
          var sa=scatterAngles[saIdx];
          G.FX.spawnApatyShot(m.x+Math.cos(sa)*(16*s),(m.y-20*s)+Math.sin(sa)*(12*s),sa,true);
        }
      }
    }

    // Violey Ulti P beam
    if(m.attackType==="violeyUltP"&&m.state==="violeyUltP"){
      if(m.stateTimer===62){ G.Sound.play("laser"); G.Sound.play("thunder"); G.FX.spawnPrismaticHandBeam(m.x+m.facing*12*s,m.y-22*s,m.facing); }
      var inFrontP=(m.facing===1&&target.x>=m.x-20)||(m.facing===-1&&target.x<=m.x+20);
      var distP=Math.abs(target.x-m.x);
      if(m.stateTimer<=58&&m.stateTimer>=20&&m.stateTimer%10===0){
        if(distP<300*s&&inFrontP){ G.Actions.applyDamage(m,target,10,m.facing*2.0,-1.6,"#22c55e","",false); G.FX.spawnHitParticles(target.x,target.y-20*s,"#22c55e",6); }
      }
      if(m.stateTimer===14){
        var expX=(inFrontP&&distP<300*s)?target.x:(m.x+m.facing*120*s);
        G.Sound.play("thunder"); G.Camera.shake=12;
        G.FX.spawnColorfulFinaleExplosion(expX,target.y-22*s);
        if(distP<320*s&&inFrontP){ G.Actions.applyDamage(m,target,38,m.facing*7.5,-5.2,"#a855f7","",false); target.stunTimer=Math.max(target.stunTimer,55); }
      }
    }

    // Wind slashes Xeera
    for(var wsIdx=G.FX.windSlashes.length-1;wsIdx>=0;wsIdx--){
      var ws=G.FX.windSlashes[wsIdx]; ws.x+=ws.vx; ws.life--;
      if(!ws.hasHit){
        var distW=Math.abs(target.x-ws.x);
        var dyW=Math.abs((target.y-16*s)-ws.y);
        if(distW<ws.radius+14&&dyW<ws.radius+16){
          ws.hasHit=true; G.Sound.play("claw");
          G.FX.spawnStarImpact(target.x,target.y-16*s,0.9);
          G.Actions.applyDamage(m,target,ws.dmg,3.8,-2.0,"#d946ef","",false);
        }
      }
      if(ws.life<=0||ws.x<-40||ws.x>cfg.BASE_W+40) G.FX.windSlashes.splice(wsIdx,1);
    }

    // Slash Barrier Xeera
    for(var sbIdx=G.FX.slashBarriers.length-1;sbIdx>=0;sbIdx--){
      var sb=G.FX.slashBarriers[sbIdx]; sb.tick++; sb.life--;
      if(sb.tick%12===0){
        if(Math.abs(target.x-sb.x)<=sb.radius+8&&(sb.y-target.y)<=sb.radius){
          G.Sound.play("claw");
          G.Actions.applyDamage(m,target,sb.isEvo?20:14,0.8,-0.8,"#c084fc","",false);
        }
      }
      if(sb.life<=0) G.FX.slashBarriers.splice(sbIdx,1);
    }

    // Simon Blitz
    if(m.state==="blitz"){
      m.blitzTimer--;
      if(m.blitzTimer<=0){
        if(m.blitzRemaining>0){
          var prevX=m.x, prevY=m.y-16*s;
          var offsets=[{ox:-30*s,oy:-32*s,f:1},{ox:32*s,oy:-16*s,f:-1},{ox:-20*s,oy:0,f:1}];
          var bIdx=3-m.blitzRemaining;
          var bTgt=offsets[bIdx];
          m.x=Math.max(28,Math.min(cfg.BASE_W-28,target.x+bTgt.ox));
          m.y=cfg.GROUND_Y+bTgt.oy;
          m.onGround=m.y>=cfg.GROUND_Y; m.facing=bTgt.f;
          m.attackType=bIdx%2===0?"punch1":"punch2";
          G.Sound.play("zap");
          G.FX.spawnLightningBolt(prevX,prevY,m.x,m.y-14*s,2,15,true);
          G.FX.spawnStarImpact(target.x+(bIdx-1)*10,target.y-18*s+bTgt.oy*0.4,1.15);
          G.Actions.applyDamage(m,target,26,1.5,-1.8,bIdx%2===0?"#00e5ff":"#ffbe0b","",false);
          m.blitzRemaining--; m.blitzTimer=8;
        } else { m.state=m.onGround?"idle":"jump"; m.attackType=""; }
      }
    }

    // Simon Base U
    if(m.charId==="simon"&&m.state==="simonBaseU"){
      var swFrames=[28,18,8];
      if(swFrames.indexOf(m.stateTimer)!==-1){
        var isFP=m.stateTimer===8;
        m.vx=m.facing*(isFP?5.2:2.2);
        var reachX=m.x+m.facing*(isFP?95*s:75*s);
        var wColor=isFP?"#ffbe0b":"#38bdf8";
        G.Sound.play(isFP?"thunder":"zap");
        G.FX.spawnLightningBolt(m.x+m.facing*(10*s),m.y-20*s,reachX,m.y-18*s,2.8,12,true);
        G.FX.spawnHitParticles(m.x+m.facing*(16*s),m.y-20*s,wColor,6);
        if(Math.abs(target.x-m.x)<95*s&&(m.facing===1?target.x>=m.x:target.x<=m.x)){
          G.Actions.applyDamage(m,target,isFP?18:11,isFP?5.5:2.2,isFP?-3.4:-1.5,wColor,"",false);
          G.FX.spawnStarImpact(target.x,target.y-18*s,1.1);
        }
      }
    }

    // Simon Thunderstorm
    if(m.charId==="simon"&&m.state==="thunderStorm"&&m.stormTimer>0){
      m.stormTimer--;
      var isDevil=m.attackType==="simonDevilI";
      var coreX=m.x+m.facing*(26*s), coreY=m.y-74*s;
      if(isDevil){
        var dFrames=[44,34,24,14,4];
        if(dFrames.indexOf(m.stormTimer)!==-1){
          var isLast=m.stormTimer===4;
          G.Sound.play("thunder"); if(G.Camera) G.Camera.shake=isLast?14:9;
          var strX=target.x+(Math.random()*36-18);
          strX=Math.max(24,Math.min(cfg.BASE_W-24,strX));
          var bt=dFrames.indexOf(m.stormTimer)%3;
          G.FX.spawnLightningBolt(coreX,coreY,strX,cfg.GROUND_Y,3,16,true);
          G.FX.spawnLightningBolt(coreX,coreY,strX+10,cfg.GROUND_Y,2.4,13,false);
          G.FX.spawnStarImpact(strX,cfg.GROUND_Y-16*s,isLast?1.5:1.15);
          G.FX.spawnHitParticles(strX,cfg.GROUND_Y-18*s,bt===0?"#ef4444":(bt===1?"#facc15":"#38bdf8"),10);
          if(Math.abs(target.x-coreX)<210){
            target.stunTimer=isLast?Math.max(target.stunTimer,110):Math.max(target.stunTimer,35);
            G.Actions.applyDamage(m,target,isLast?22:12,1.5,-1.8,bt===0?"#ef4444":(bt===1?"#ffbe0b":"#00e5ff"),"",false);
          }
        }
        if(m.stormTimer===0){m.attackType="";m.state=m.onGround?"idle":"jump";}
      } else {
        if(m.stormTimer===30) G.FX.spawnStarImpact(coreX,coreY,1.3);
        if(m.stormTimer%5===0&&m.stormTimer>4){
          G.Sound.play("zap");
          for(var b=0;b<2;b++){
            var s2=target.x+(Math.random()*80-40);
            s2=Math.max(24,Math.min(cfg.BASE_W-24,s2));
            G.FX.spawnLightningBolt(coreX,coreY,s2,cfg.GROUND_Y,2,11,true);
          }
          if(Math.abs(target.x-coreX)<120){ target.stunTimer=185; G.Actions.applyDamage(m,target,22,1.2,-1.0,"#ffbe0b","",false); }
        }
        if(m.stormTimer===0) m.state=m.onGround?"idle":"jump";
      }
    }

    // Moopy skills
    if(m.charId==="moopy"){
      var mDist=Math.abs(m.x-target.x);
      var mFacing=(m.facing===1&&target.x>=m.x-14)||(m.facing===-1&&target.x<=m.x+14);
      if(m.state==="moopyClawFlurry"){
        if([30,22,14,6].indexOf(m.stateTimer)!==-1){
          m.vx=m.facing*3.0; G.Sound.play("claw");
          G.FX.spawnClawEffect(m.x+m.facing*(20*s),m.y-18*s,m.facing,false);
          if(mDist<58*s&&mFacing){
            var isCF=m.stateTimer===6;
            G.Actions.applyDamage(m,target,11,isCF?5.5:2.0,isCF?-3.2:-1.4,"#f43f5e","",false);
          }
        }
      }
      if(m.state==="moopyBlitzStun"&&m.stateTimer===18){
        if(mDist<58*s){
          G.Sound.play("kick"); G.FX.spawnStarImpact(target.x,target.y-18*s,1.25);
          G.Actions.applyDamage(m,target,32,5.0,-3.2,"#ffbe0b","",false);
          target.stunTimer=Math.max(target.stunTimer,90);
        }
      }
      if(m.state==="moopyWolfU"){
        if([42,34,26,18].indexOf(m.stateTimer)!==-1){
          var uSw=(42-m.stateTimer)/8;
          m.vx=m.facing*3.2; G.Sound.play("claw");
          G.FX.spawnFeralClawArc(m.x+m.facing*(24*s),m.y-20*s,m.facing,uSw);
          if(mDist<72*s&&mFacing) G.Actions.applyDamage(m,target,12,2.2,-1.8,"#e11d48","",false);
        }
        if(m.stateTimer===10){
          var dSX=m.x;
          m.x=Math.max(26,Math.min(cfg.BASE_W-26,target.x+m.facing*36));
          m.vx=0;
          G.Sound.play("dash"); G.Sound.play("claw");
          G.FX.spawnFeralSpeedLines((dSX+m.x)*0.5,m.y-18*s,m.facing,12);
          G.FX.spawnRibbonClawVortex(target.x,target.y-20*s,m.facing);
          if(Math.abs(dSX-target.x)<150*s) G.Actions.applyDamage(m,target,30,6.8,-4.4,"#a855f7","",false);
        }
      }
      if(m.state==="moopyWolfI"){
        if(m.stateTimer===68){
          G.Sound.play("roar"); G.Camera.shake=8;
          G.FX.spawnFeralSpeedLines(m.x,m.y-18*s,m.facing,10);
          for(var fw=0;fw<2;fw++){
            G.FX.roarWaves.push({x:m.x+m.facing*(14*s),y:m.y-14*s,facing:m.facing,
              radius:10+fw*24,life:22-fw*4,hasHit:true,isFeral:true});
          }
          if(mDist<185*s){ G.Actions.applyDamage(m,target,15,1.5,-1.2,"#e11d48","",false); target.stunTimer=100; }
        }
        if(m.stateTimer===50){
          G.FX.spawnFeralSpeedLines(m.x,m.y-18*s,m.facing,8);
          m.x=Math.max(26,Math.min(cfg.BASE_W-26,target.x-m.facing*20));
          m.facing=target.x>=m.x?1:-1;
          G.Sound.play("dash"); G.FX.spawnFeralSpeedLines(m.x,m.y-18*s,m.facing,10);
        }
        if([42,34,26,18].indexOf(m.stateTimer)!==-1){
          var iSw=(42-m.stateTimer)/8;
          var side=iSw%2===0?-18:18;
          m.x=Math.max(26,Math.min(cfg.BASE_W-26,target.x+side));
          m.facing=target.x>=m.x?1:-1;
          G.Sound.play("claw");
          G.FX.spawnFeralClawArc(target.x,target.y-20*s,m.facing,iSw);
          if(iSw===2) G.FX.spawnRibbonClawVortex(target.x,target.y-20*s,m.facing);
          G.Actions.applyDamage(m,target,12,1.2,-1.5,"#c084fc","",false);
          target.stunTimer=Math.max(target.stunTimer,24);
        }
        if(m.stateTimer===8){
          G.Sound.play("thunder"); G.Sound.play("claw");
          G.FX.spawnXCrossClawFinisher(target.x,target.y-22*s);
          G.Actions.applyDamage(m,target,34,7.2,-5.0,"#e11d48","",false);
          target.stunTimer=Math.max(target.stunTimer,30);
        }
      }
    }

    // Dive kick
    if(m.state==="diveKick"){
      G.FX.spawnDiveStreak(m.x,m.y-12*s,m.vx,m.vy,m.charId==="xeera");
      var distDive=Math.hypot(target.x-m.x,(target.y-12)-m.y);
      if(distDive<28*s||m.y>=cfg.GROUND_Y-2){
        if(m.charId==="xeera"){
          G.Sound.play("claw"); G.FX.spawnSwordTrail(target.x,target.y-14*s,m.facing,3,m.isWolf);
          if(distDive<54*s) G.Actions.applyDamage(m,target,36,5.0,-3.2,"#d946ef","",false);
        } else {
          G.Sound.play("thunder");
          G.FX.spawnLightningBolt(m.x-m.facing*42,m.y-48,target.x,target.y-10,2,12,true);
          G.FX.spawnStarImpact(target.x,target.y-14*s,1.25);
          if(distDive<52*s) G.Actions.applyDamage(m,target,38,5.2,-3.3,"#00e5ff","",false);
        }
        m.vx=-m.facing*2.0; m.vy=-3.0; m.onGround=false; m.state="jump"; m.stateTimer=0; m.attackType="";
      }
    }

    // State timer
    if(m.stateTimer>0&&m.state!=="blitz"){
      m.stateTimer--;
      if(m.state==="dash"&&m.stateTimer%2===0){
        G.FX.afterimages.push({x:m.x,y:m.y,facing:m.facing,isWolf:m.isWolf,life:8});
      }
      if(m.stateTimer===0){m.state=m.onGround?"idle":"jump"; m.attackType="";}
    }

    // Gerak player 1
    var moveSpeed=m.isWolf?3.5:2.7;
    if(m.state==="idle"||m.state==="walk"||m.state==="jump"){
      if(keys.a&&!keys.s){      m.vx=-moveSpeed; m.facing=-1; if(m.onGround) m.state="walk"; }
      else if(keys.s&&!keys.a){ m.vx=moveSpeed;  m.facing=1;  if(m.onGround) m.state="walk"; }
      else{ m.vx*=0.72; if(Math.abs(m.vx)<0.15) m.vx=0; if(m.onGround) m.state="idle"; }
    } else if(m.state==="attack"){ m.vx*=0.82; }
    else if(m.state==="moopyClawFlurry"||m.state==="moopyBlitzStun"||m.state==="moopyWolfU"||m.state==="moopyWolfI"){ m.vx*=0.8; }
    else if(m.state==="violeyAirU"){ m.vx*=0.9; m.vy=-0.15; }
    else if(m.state==="violeyUltP"){ m.vx*=0.6; m.vy=0; }

    if(m.state!=="blitz"){
      m.x+=m.vx; m.y+=m.vy;
      if(m.y<cfg.GROUND_Y||m.vy<0) m.onGround=false;
      if(!m.onGround){
        if(m.state!=="diveKick"&&m.state!=="violeyAirU"&&m.state!=="violeyUltP") m.vy+=cfg.GRAVITY;
        if(m.y>=cfg.GROUND_Y){
          m.y=cfg.GROUND_Y; m.vy=0; m.onGround=true; m.jumpsUsed=0;
          G.FX.spawnDust(m.x,cfg.GROUND_Y,0,4);
          if(m.state==="jump"||m.state==="diveKick") m.state="idle";
        }
      } else { m.y=cfg.GROUND_Y; m.vy=0; }
    }
    if(m.y<32){m.y=32;if(m.vy<0)m.vy=0;}
    m.x=Math.max(24,Math.min(cfg.BASE_W-24,m.x));

    // Laser beam
    for(var i=G.FX.activeLasers.length-1;i>=0;i--){
      var laser=G.FX.activeLasers[i]; laser.life--; laser.tickCounter++;
      if(laser.life<30&&laser.life>4&&laser.tickCounter%4===0){
        var bStartX=m.x+m.facing*(18*s);
        var inBeam=(m.facing===1&&target.x>=bStartX-8)||(m.facing===-1&&target.x<=bStartX+8);
        if(inBeam&&Math.abs((target.y-16*s)-(m.y-12*s))<38*s){
          G.Actions.applyDamage(m,target,18+Math.floor(Math.random()*7),2.2,-0.8,"#fb7185","",false);
        }
      }
      if(laser.life<=0) G.FX.activeLasers.splice(i,1);
    }

    // Roar waves
    for(var r=G.FX.roarWaves.length-1;r>=0;r--){
      var w=G.FX.roarWaves[r]; w.radius+=5.2; w.x+=w.facing*2.6; w.life--;
      if(!w.hasHit){
        var wDist=Math.hypot(target.x-w.x,(target.y-16)-w.y);
        if(wDist<=w.radius+16){ w.hasHit=true; target.stunTimer=185; G.Actions.applyDamage(m,target,28,3.2,-2.0,"#facc15","",false); }
      }
      if(w.life<=0) G.FX.roarWaves.splice(r,1);
    }

    if(target.hitFlash>0)  target.hitFlash--;
    if(target.hurtTimer>0) target.hurtTimer--;
    if(target.stunTimer>0) target.stunTimer--;

    // ── Update player 2 (dummy di solo / player nyata di multiplayer) ──────
    if(isMP){
      // Host: kendalikan player2 dari remoteKeys + remoteActionQueue (sudah diproses di atas)
      if(G.Network.isHost()){
        var p2 = G.player2;

        p2.animTick++;
        if(p2.isWolf) p2.wolfAuraTimer++;
        if(p2.comboWindow>0) p2.comboWindow--;
        if(p2.comboResetTimer>0){ p2.comboResetTimer--; if(p2.comboResetTimer===0) p2.comboCount=0; }

        G.Actions.updateEnergyDrain(p2);
        if(p2.cd.dash>0){ p2.cd.dash--; if(p2.cd.dash===0) p2.dashCharges=p2.maxDashCharges; }
        if(p2.cd.wolf>0) p2.cd.wolf--;
        if(p2.cd.roar>0) p2.cd.roar--;
        if(p2.cd.laser>0) p2.cd.laser--;

        p2.displayHp += (p2.hp - p2.displayHp) * 0.15;

        // Gerak p2 dari remoteKeys
        var p2Speed = p2.isWolf ? 3.5 : 2.7;
        if(p2.state==="idle"||p2.state==="walk"||p2.state==="jump"){
          if(remoteKeys.a&&!remoteKeys.s){      p2.vx=-p2Speed; p2.facing=-1; if(p2.onGround) p2.state="walk"; }
          else if(remoteKeys.s&&!remoteKeys.a){ p2.vx=p2Speed;  p2.facing=1;  if(p2.onGround) p2.state="walk"; }
          else{ p2.vx*=0.72; if(Math.abs(p2.vx)<0.15) p2.vx=0; if(p2.onGround) p2.state="idle"; }
        } else if(p2.state==="attack"){ p2.vx*=0.82; }
        else if(p2.state==="violeyAirU"){ p2.vx*=0.9; p2.vy=-0.15; }
        else if(p2.state==="violeyUltP"){ p2.vx*=0.6; p2.vy=0; }

        if(p2.state!=="blitz"){
          p2.x+=p2.vx; p2.y+=p2.vy;
          if(p2.y<cfg.GROUND_Y||p2.vy<0) p2.onGround=false;
          if(!p2.onGround){
            if(p2.state!=="diveKick"&&p2.state!=="violeyAirU"&&p2.state!=="violeyUltP") p2.vy+=cfg.GRAVITY;
            if(p2.y>=cfg.GROUND_Y){
              p2.y=cfg.GROUND_Y; p2.vy=0; p2.onGround=true; p2.jumpsUsed=0;
              G.FX.spawnDust(p2.x,cfg.GROUND_Y,0,4);
              if(p2.state==="jump"||p2.state==="diveKick") p2.state="idle";
            }
          } else { p2.y=cfg.GROUND_Y; p2.vy=0; }
        }
        if(p2.y<32){p2.y=32;if(p2.vy<0)p2.vy=0;}
        p2.x=Math.max(24,Math.min(cfg.BASE_W-24,p2.x));

        if(p2.stateTimer>0&&p2.state!=="blitz"){
          p2.stateTimer--;
          if(p2.state==="dash"&&p2.stateTimer%2===0){
            G.FX.afterimages.push({x:p2.x,y:p2.y,facing:p2.facing,isWolf:p2.isWolf,life:8});
          }
          if(p2.stateTimer===0){p2.state=p2.onGround?"idle":"jump"; p2.attackType="";}
        }

        if(p2.hp<=0){
          p2.hurtTimer++;
          if(p2.hurtTimer>65){ p2.hp=p2.maxHp; p2.stunTimer=0; p2.hurtTimer=0; }
        }
      }
      // Guest: posisi p2 sudah diupdate dari handleFullState, tidak perlu simulate
      else {
        G.player2.displayHp += (G.player2.hp - G.player2.displayHp) * 0.15;
      }

      // Kirim input keys ke host (guest) atau full state ke guest (host)
      if(!G.Network.isHost()){
        G.Network.sendInputState({ a: keys.a, s: keys.s });
      }
    } else {
      // ── Single player: update dummy AI (SMART) ──────────────────────────
      var d = G.dummy;
      d.displayHp += (d.hp - d.displayHp) * 0.15;

      if(d.stunTimer<=0 && d.hurtTimer<=0 && d.hp>0){
        d.aiTick++;
        d.facing = m.x < d.x ? -1 : 1;
        var distToPlayer = Math.abs(d.x - m.x);

        if(cfg.dummyBehavior === "static"){
          d.vx *= 0.8;
        } else if(cfg.dummyBehavior === "patrol"){
          d.vx = d.patrolDir * 1.25;
          if(d.x < 90) d.patrolDir = 1;
          if(d.x > cfg.BASE_W - 70) d.patrolDir = -1;
        } else if(cfg.dummyBehavior === "jump"){
          if(d.onGround && d.aiTick % 55 === 0){ d.vy = -5.8; d.onGround = false; }
          d.vx *= 0.8;
        } else {
          // AI MENYERANG: spar / default
          var aiAttackRange = 52 * s;
          var aiChaseRange  = 200;

          // Kejar player
          if(distToPlayer > aiAttackRange){
            var aiSpeed = cfg.dummyBehavior === "spar" ? 1.6 : 1.2;
            d.vx = d.facing === -1 ? -aiSpeed : aiSpeed;
            // Loncat kalau player jauh dan ai bisa
            if(d.onGround && d.aiTick % 90 === 0 && distToPlayer > 80){
              d.vy = -5.5; d.onGround = false;
            }
          } else {
            d.vx *= 0.6;
            // Serang saat dekat
            if(d.onGround && d.aiTick % 28 === 0){
              var roll = Math.random();
              if(roll < 0.5){
                // Basic punch
                G.Actions.checkMeleeHit(60*s, 40*s, 12, d.facing*2.5, -1.8, "#f87171", "", false, d, m);
                G.Sound.play("punch");
              } else if(roll < 0.75){
                // Kick dengan knockback lebih besar
                G.Actions.checkMeleeHit(55*s, 38*s, 18, d.facing*4.0, -2.5, "#fb923c", "", false, d, m);
                G.Sound.play("kick");
              } else {
                // Dash ke arah player
                d.vx = d.facing * 5.5;
                d.state = "dash";
                d.stateTimer = 10;
                G.Sound.play("dash");
              }
            }
          }

          // Loncat secara acak
          if(d.onGround && d.aiTick % 120 === 0 && Math.random() < 0.35){
            d.vy = -5.2; d.onGround = false;
          }
        }
      } else {
        d.vx *= 0.84;
      }

      if(d.hitFlash>0)  d.hitFlash--;
      if(d.hurtTimer>0) d.hurtTimer--;
      if(d.stunTimer>0) d.stunTimer--;

      d.x+=d.vx; d.y+=d.vy;
      if(d.y<cfg.GROUND_Y||d.vy<0) d.onGround=false;
      if(!d.onGround){ d.vy+=0.4; if(d.y>=cfg.GROUND_Y){d.y=cfg.GROUND_Y;d.vy=0;d.onGround=true;} }
      else{d.y=cfg.GROUND_Y;d.vy=0;}
      if(d.x<28){d.x=28;d.vx=Math.abs(d.vx)*0.6;} else if(d.x>cfg.BASE_W-28){d.x=cfg.BASE_W-28;d.vx=-Math.abs(d.vx)*0.6;}
      if(d.hp<=0){ d.koResetTimer++; if(d.koResetTimer>65){d.hp=d.maxHp;d.stunTimer=0;d.koResetTimer=0;} }
    }

    G.FX.updateAll();
    if(G.Camera.shake>0) G.Camera.shake--;
  }

  // ── HUD Draw ──────────────────────────────────────────────────────────────
  function drawEnergyTube(tubeX,tubeY,tubeW,ratio,isWolf,isReady,pulseTick,ownerChar){
    var enH=4; ctx.fillStyle="#09090b"; ctx.fillRect(tubeX-1,tubeY-1,tubeW+2,enH+2);
    ctx.fillStyle="#18181b"; ctx.fillRect(tubeX,tubeY,tubeW,enH);
    var enFillW=Math.round(tubeW*ratio); if(enFillW<=0) return;
    if(isWolf){
      var evoMain=ownerChar==="xeera"?"#a855f7":(ownerChar==="simon"?"#facc15":"#e11d48");
      var evoTop =ownerChar==="xeera"?"#f5d0fe":(ownerChar==="simon"?"#fef08a":"#fda4af");
      ctx.fillStyle=evoMain; ctx.fillRect(tubeX,tubeY,enFillW,enH);
      ctx.fillStyle=evoTop;  ctx.fillRect(tubeX,tubeY,enFillW,1.5);
    } else if(isReady){
      ctx.fillStyle=pulseTick?"#facc15":"#38bdf8"; ctx.fillRect(tubeX,tubeY,enFillW,enH);
      ctx.fillStyle="#ffffff"; ctx.fillRect(tubeX,tubeY,enFillW,1.5);
    } else {
      ctx.fillStyle="#0284c7"; ctx.fillRect(tubeX,tubeY,enFillW,enH);
      ctx.fillStyle="#38bdf8"; ctx.fillRect(tubeX,tubeY,enFillW,1.5);
    }
  }

  function drawHornedSkullHeartbar(x,y,hpRatio,drainRatio,isMirrored,fighter){
    var m=fighter||G.moopy;
    ctx.save();
    if(isMirrored){ctx.translate(x+188,y);ctx.scale(-1,1);}else{ctx.translate(x,y);}

    var showEnergy=!isMirrored&&m.hasEnergy;
    var energyRatio=showEnergy?Math.max(0,Math.min(1,m.energy/m.maxEnergy)):0;
    var energyReady=showEnergy&&!m.isWolf&&m.energy>=m.maxEnergy;
    var energyPulse=showEnergy?(m.animTick%16<8):false;

    if(LoadedAssets.heartbar){
      ctx.drawImage(LoadedAssets.heartbar,0,-4,188,30);
      var missingW=Math.round((1-Math.max(0,hpRatio))*130);
      if(missingW>0){ctx.fillStyle="#1a070a";ctx.fillRect(184-missingW,9,missingW,7);}
      if(showEnergy) drawEnergyTube(24,21,158,energyRatio,m.isWolf,energyReady,energyPulse,m.charId);
      ctx.restore(); return;
    }

    var tubeX=24,tubeY=8,tubeW=160,tubeH=9;
    ctx.fillStyle="#120407"; ctx.beginPath(); ctx.roundRect(tubeX-1,tubeY-1,tubeW+3,tubeH+2,4); ctx.fill();
    ctx.fillStyle="#2b090e"; ctx.beginPath(); ctx.roundRect(tubeX,tubeY,tubeW,tubeH,3); ctx.fill();
    var drainW=Math.max(0,drainRatio*tubeW);
    if(drainW>0){ctx.fillStyle="#f59e0b"; ctx.fillRect(tubeX,tubeY+1,drainW,tubeH-2);}
    var fillW=Math.max(0,hpRatio*tubeW);
    if(fillW>0){
      var tg=ctx.createLinearGradient(0,tubeY,0,tubeY+tubeH);
      tg.addColorStop(0,"#8f070e");tg.addColorStop(0.25,"#ff7a82");tg.addColorStop(0.5,"#e0111a");tg.addColorStop(1,"#4a0307");
      ctx.fillStyle=tg; ctx.beginPath(); ctx.roundRect(tubeX,tubeY,fillW,tubeH,3); ctx.fill();
    }

    ctx.fillStyle="#ef1522"; ctx.beginPath(); ctx.arc(21,12,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(20,10.5,1.5,0,Math.PI*2); ctx.fill();
    [[27,34],[34,41],[41,48],[48,54]].forEach(function(c){
      ctx.strokeStyle="#140d10"; ctx.lineWidth=3.5; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(c[0],6.5); ctx.lineTo(c[0]+1.5,18); ctx.stroke();
      ctx.strokeStyle="#6e5d62"; ctx.lineWidth=1.6; ctx.stroke();
    });

    ctx.fillStyle="#cfc6bc"; ctx.beginPath(); ctx.arc(13,9,5.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#140d10"; ctx.lineWidth=1.2; ctx.stroke();
    ctx.fillStyle="#140d10"; ctx.beginPath(); ctx.arc(13.5,8.5,1.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#140d10"; ctx.lineWidth=5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(10,12); ctx.quadraticCurveTo(1,18,2,6); ctx.stroke();
    ctx.strokeStyle="#9e9288"; ctx.lineWidth=3; ctx.stroke();

    if(showEnergy) drawEnergyTube(tubeX,tubeY+tubeH+5,tubeW,energyRatio,m.isWolf,energyReady,energyPulse,m.charId);
    ctx.restore();
  }

  function drawModeLabel(){
    var m=G.moopy;
    var label;
    if(m.charId==="violey"){
      label=m.cd.wolf>0?"PRISM CD "+(m.cd.wolf/60).toFixed(1)+"s":"APATY DUAL SHOOTER";
    } else if(m.isWolf){
      var secLeft=Math.max(0,Math.ceil((m.energy/m.maxEnergy)*27));
      var evoName=m.charId==="xeera"?"RED EYES EVO":(m.charId==="simon"?"THUNDER DEVIL":"DIRE WOLF");
      label=evoName+" "+secLeft+"s";
    } else if(m.energy>=m.maxEnergy){ label="EVO READY!";
    } else { label="ENERGY "+Math.floor(m.energy)+"%"; }

    ctx.save();
    ctx.font='6px "Press Start 2P", monospace'; ctx.textAlign="left";
    var lc="#7dd3fc";
    if(m.charId==="violey") lc=m.cd.wolf>0?"#fbcfe8":"#f472b6";
    else if(m.isWolf) lc=m.charId==="xeera"?"#e9d5ff":(m.charId==="simon"?"#fde68a":"#f0abfc");
    else if(m.energy>=m.maxEnergy) lc="#facc15";
    ctx.fillStyle="#000000"; ctx.fillText(label,9,47);
    ctx.fillStyle=lc; ctx.fillText(label,8,46);
    ctx.restore();
  }

  function drawHUD(){
    var m   = G.moopy;
    var t   = G.Network.gameMode==="multiplayer" ? G.player2 : G.dummy;
    var W   = G.Config.BASE_W;

    drawHornedSkullHeartbar(8,8,m.hp/m.maxHp,m.displayHp/m.maxHp,false,m);
    drawHornedSkullHeartbar(W-228,8,t.hp/t.maxHp,t.displayHp/t.maxHp,true,t);
    drawModeLabel();

    // Timer di tengah atas HUD
    if (!gameOverActive) {
      ctx.save();
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      var tColor = roundTimerSecs <= 10 ? "#f43f5e" : "#fbbf24";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W/2-14, 4, 28, 14);
      ctx.fillStyle = tColor;
      ctx.fillText(roundTimerSecs, W/2, 14);
      ctx.restore();
    }

    // Label nama pemain (multiplayer)
    if(G.Network.gameMode==="multiplayer"){
      ctx.save();
      ctx.font='5px "Press Start 2P", monospace'; ctx.textAlign="left";
      ctx.fillStyle="#00000088"; ctx.fillText(G.Network.getLocalNickname(),9+1,29+1);
      ctx.fillStyle="#38bdf8";   ctx.fillText(G.Network.getLocalNickname(),9,29);
      ctx.textAlign="right";
      ctx.fillStyle="#00000088"; ctx.fillText(G.Network.getRemoteNickname(),W-9+1,29+1);
      ctx.fillStyle="#f472b6";   ctx.fillText(G.Network.getRemoteNickname(),W-9,29);
      ctx.restore();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderGame(){
    var W=G.Config.BASE_W, H=G.Config.BASE_H;
    var m=G.moopy, s=G.Config.charScale;
    var isMP=G.Network.gameMode==="multiplayer";

    ctx.save();
    ctx.scale(SCALE_RES, SCALE_RES);
    if(G.Camera.shake>0){ ctx.translate((Math.random()-0.5)*G.Camera.shake,(Math.random()-0.5)*G.Camera.shake); }

    if(LoadedAssets.bg) ctx.drawImage(LoadedAssets.bg,0,0,W,H);
    else ctx.drawImage(bgCache,0,0,W,H);

    // Afterimages
    for(var i=0;i<G.FX.afterimages.length;i++){
      var ai=G.FX.afterimages[i];
      if(ai.isWolf) G.Renderer.drawMoopyWolf(ctx,ai.x,ai.y,ai.facing,s,true,LoadedAssets);
      else G.Renderer.drawMoopyStickman(ctx,ai.x,ai.y,ai.facing,s,true,LoadedAssets);
    }

    // Render "lawan" (dummy atau player2)
    if(isMP){
      var p2=G.player2;
      if(p2.isWolf) G.Renderer.drawMoopyWolf(ctx,p2.x,p2.y,p2.facing,s,false,LoadedAssets,p2);
      else          G.Renderer.drawMoopyStickman(ctx,p2.x,p2.y,p2.facing,s,false,LoadedAssets,p2);
    } else {
      G.Renderer.drawDummy(ctx,s,LoadedAssets);
    }

    // Player lokal
    if(m.isWolf) G.Renderer.drawMoopyWolf(ctx,m.x,m.y,m.facing,s,false,LoadedAssets,m);
    else         G.Renderer.drawMoopyStickman(ctx,m.x,m.y,m.facing,s,false,LoadedAssets,m);

    G.FX.drawAll(ctx,m,s,W);
    drawHUD();
    ctx.restore();
  }

  // ── Menu events ───────────────────────────────────────────────────────────
  var scaleSelect    = document.getElementById("scaleSelect");
  var dummySelect    = document.getElementById("dummySelect");
  var mainMenuOverlay= document.getElementById("mainMenuOverlay");
  var assetsModal    = document.getElementById("assetsModal");
  var movesModal     = document.getElementById("movesModal");

  scaleSelect.addEventListener("change",function(){ G.Config.charScale=parseFloat(scaleSelect.value)||1.0; });
  dummySelect.addEventListener("change",function(){ G.Config.dummyBehavior=dummySelect.value; });

  document.getElementById("btnToggleMenu").addEventListener("click",function(){
    mainMenuOverlay.classList.toggle("hidden");
    G.gamePaused=!mainMenuOverlay.classList.contains("hidden")||
                 !charSelectOverlay.classList.contains("hidden")||
                 !startPlayOverlay.classList.contains("hidden");
  });
  document.getElementById("btnStartGame").addEventListener("click",function(){
    mainMenuOverlay.classList.add("hidden"); G.gamePaused=false; G.Sound.init();
  });
  document.getElementById("btnChangeChar").addEventListener("click",function(){
    mainMenuOverlay.classList.add("hidden"); charSelectOverlay.classList.remove("hidden"); G.gamePaused=true;
  });
  document.getElementById("btnOpenAssets").addEventListener("click",function(){ assetsModal.classList.remove("hidden"); });
  document.getElementById("btnCloseAssets").addEventListener("click",function(){ assetsModal.classList.add("hidden"); });
  document.getElementById("btnSaveAssets").addEventListener("click",function(){ assetsModal.classList.add("hidden"); });
  document.getElementById("btnOpenMoves").addEventListener("click",function(){ movesModal.classList.remove("hidden"); });
  document.getElementById("btnCloseMoves").addEventListener("click",function(){ movesModal.classList.add("hidden"); });
  document.getElementById("btnGotItMoves").addEventListener("click",function(){ movesModal.classList.add("hidden"); });
  document.getElementById("btnMute").addEventListener("click",function(){
    G.Sound.muted=!G.Sound.muted;
    document.getElementById("btnMute").textContent=G.Sound.muted?"SFX: OFF":"SFX: ON";
  });

  document.getElementById("btnDisconnectMP").addEventListener("click",function(){
    G.Network.disconnect();
    mainMenuOverlay.classList.add("hidden");
    startPlayOverlay.classList.remove("hidden");
    document.getElementById("mpStatusBar").classList.add("hidden");
    document.getElementById("btnDisconnectMP").classList.add("hidden");
    document.getElementById("pingBadge").classList.add("hidden");
    G.gamePaused=true;
  });

  document.getElementById("btnResetFight").addEventListener("click",function(){
    var m=G.moopy,d=G.dummy;
    m.x=130;m.y=G.Config.GROUND_Y;m.vx=0;m.vy=0;m.onGround=true;m.jumpsUsed=0;
    m.state="idle";m.stateTimer=0;m.maxStateTimer=14;m.attackType="";
    m.blitzRemaining=0;m.blitzTimer=0;m.stormTimer=0;
    m.comboStep=0;m.comboWindow=0;m.comboCount=0;m.comboResetTimer=0;m.lastAttackFamily="";
    m.hp=m.maxHp;m.displayHp=m.maxHp;m.dashCharges=m.maxDashCharges;
    m.evoTimer=0;m.isWolf=false;m.energy=0;
    m.cd.dash=0;m.cd.wolf=0;m.cd.roar=0;m.cd.laser=0;
    G.FX.slashBarriers.length=0;G.FX.windSlashes.length=0;G.FX.giantCleaves.length=0;
    G.FX.feralArcs.length=0;G.FX.ribbonVortices.length=0;G.FX.xCrossClaws.length=0;
    G.FX.feralSpeedLines.length=0;G.FX.roarWaves.length=0;G.FX.clawEffects.length=0;
    if(G.Network.gameMode==="multiplayer"){
      var p2=G.player2;
      p2.x=335;p2.y=G.Config.GROUND_Y;p2.vx=0;p2.vy=0;p2.onGround=true;
      p2.hp=p2.maxHp;p2.displayHp=p2.maxHp;p2.stunTimer=0;
    } else {
      d.x=335;d.y=G.Config.GROUND_Y;d.vx=0;d.vy=0;d.onGround=true;
      d.hp=d.maxHp;d.displayHp=d.maxHp;d.stunTimer=0;
    }
    G.Actions.updateModeBadge();
    mainMenuOverlay.classList.add("hidden"); G.gamePaused=false;
  });

  // ── Game Over buttons ─────────────────────────────────────────────────────
  document.getElementById("btnRematch").addEventListener("click", function(){ resetRound(); });
  document.getElementById("btnBackToMenu").addEventListener("click", function(){
    document.getElementById("gameOverOverlay").style.display = "none";
    gameOverActive = false;
    document.getElementById("roundTimer").classList.add("hidden");
    document.getElementById("touchControls").style.display = "none";
    startPlayOverlay.classList.remove("hidden");
    G.gamePaused = true;
  });

  // ── Touch controls binding ────────────────────────────────────────────────
  function bindTouch(id, keyName, isMove){
    var el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("touchstart", function(e){ e.preventDefault(); handleKeyDown(keyName); }, {passive:false});
    el.addEventListener("touchend",   function(e){ e.preventDefault(); handleKeyUp(keyName);   }, {passive:false});
    el.addEventListener("touchcancel",function(e){ e.preventDefault(); handleKeyUp(keyName);   }, {passive:false});
  }
  bindTouch("touchLeft",  "a");
  bindTouch("touchRight", "s");
  bindTouch("touchJump",  "w");
  bindTouch("touchJ",     "j");
  bindTouch("touchK",     "k");
  bindTouch("touchL",     "l");
  bindTouch("touchP",     "p");
  bindTouch("touchU",     "u");
  bindTouch("touchI",     "i");

  // ── Asset upload bindings ─────────────────────────────────────────────────
  function bindUpload(inputId,statusId,assetKey){
    var input=document.getElementById(inputId);
    if(!input) return;
    input.addEventListener("change",function(e){
      var file=e.target.files&&e.target.files[0];
      if(!file) return;
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          LoadedAssets[assetKey]=assetKey==="heartbar"?removeSolidBackground(img):img;
          if(assetKey==="menu"){
            var box=document.getElementById("customMenuBannerBox");
            var bi=document.getElementById("customMenuBannerImg");
            if(box&&bi){bi.src=img.src;box.classList.remove("hidden");}
          }
          var st=document.getElementById(statusId);
          if(st){st.textContent="Terpasang: "+file.name;st.className="text-sm text-emerald-400";}
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  bindUpload("inputBgAsset","statusBgAsset","bg");
  bindUpload("inputHeartAsset","statusHeartAsset","heartbar");
  bindUpload("inputMenuAsset","statusMenuAsset","menu");
  bindUpload("inputMoopyAsset","statusMoopyAsset","moopyStickman");
  bindUpload("inputWolfAsset","statusWolfAsset","moopyWolf");

  document.getElementById("btnResetAssets").addEventListener("click",function(){
    LoadedAssets.bg=null;LoadedAssets.heartbar=null;LoadedAssets.menu=null;
    LoadedAssets.moopyStickman=null;LoadedAssets.moopyWolf=null;
    document.getElementById("customMenuBannerBox").classList.add("hidden");
    initFolderAssets();
  });

  // ── Game loop ─────────────────────────────────────────────────────────────
  var lastLoopError=null;
  function loop(){
    try{ updateGame(); renderGame(); }
    catch(err){
      if(lastLoopError!==String(err)){ lastLoopError=String(err); console.error("[MoopyGame] loop error:",err); }
    }
    requestAnimationFrame(loop);
  }

  window.onload=function(){
    buildGothicStageCache();
    initFolderAssets();
    selectCharacter("moopy");
    loop();
  };

})(window.MoopyGame);
