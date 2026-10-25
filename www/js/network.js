window.MoopyGame = window.MoopyGame || {};

(function (G) {
  "use strict";

  var peer = null;
  var conn = null;
  var isHost = false;
  var roomCode = "";
  var localNickname = "Player";
  var remoteNickname = "Opponent";
  var lastPingTime = 0;
  var currentPing = 0;
  var syncTimer = null;
  var pingTimer = null;
  var remoteCharId = "moopy";
  var localCharReady = false;
  var remoteCharReady = false;
  var inputSeq = 0;
  var remoteState = null;
  var connected = false;

  // Urutan input remote (dipakai untuk menolak paket out-of-order)
  var lastRemoteSeq = -1;

  function generateRoomCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "";
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function sendPacket(data) {
    if (conn && conn.open) {
      try { conn.send(data); } catch (e) { console.error("[Network] Send error:", e); }
    }
  }

  function measurePing() {
    if (!connected) return;
    lastPingTime = Date.now();
    sendPacket({ type: "PING", timestamp: lastPingTime });
  }

  function startSyncLoop() {
    stopSyncLoop();
    // Kirim state lengkap setiap ~33ms (≈30 Hz)
    syncTimer = setInterval(function () {
      if (G.Network.gameMode !== "multiplayer" || G.gamePaused) return;

      // Host = otoritatif: kirim posisi/state kedua pemain
      if (isHost) {
        G.Network.sendFullState();
      } else {
        // Guest: kirim input keys saja
        G.Network.sendInputState();
      }
    }, 33);

    pingTimer = setInterval(measurePing, 2000);
  }

  function stopSyncLoop() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  }

  function handleIncomingPacket(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case "HELLO":
        remoteNickname = data.nickname || "Lawan";
        if (isHost) sendPacket({ type: "HELLO_ACK", nickname: localNickname });
        if (G.Network.onOpponentJoined) G.Network.onOpponentJoined(remoteNickname);
        break;

      case "HELLO_ACK":
        remoteNickname = data.nickname || "Host";
        connected = true;
        if (G.Network.onOpponentJoined) G.Network.onOpponentJoined(remoteNickname);
        if (G.Network.onConnected) G.Network.onConnected();
        break;

      case "PING":
        sendPacket({ type: "PONG", timestamp: data.timestamp });
        break;

      case "PONG":
        if (data.timestamp === lastPingTime) currentPing = Date.now() - data.timestamp;
        break;

      case "CHAR_SELECT":
        remoteCharId = data.charId;
        remoteCharReady = !!data.isReady;
        if (G.Network.onRemoteCharSelect) G.Network.onRemoteCharSelect(data.charId, data.isReady, data.nickname || remoteNickname);
        break;

      case "START_FIGHT":
        if (G.Network.onStartFight) G.Network.onStartFight(data);
        break;

      case "ACTION":
        if (G.Network.onRemoteAction) G.Network.onRemoteAction(data.action);
        break;

      // Guest -> Host: kirim input keys
      case "INPUT":
        if (data.seq <= lastRemoteSeq) break;  // buang paket lama
        lastRemoteSeq = data.seq;
        if (G.Network.onRemoteInput) G.Network.onRemoteInput(data.keys);
        break;

      // Host -> Guest: kirim state lengkap (posisi, HP, dll)
      case "FULL_STATE":
        if (G.Network.onFullState) G.Network.onFullState(data);
        break;

      // Host -> Guest: kiriman aksi diskret (jump, attack, dll.)
      case "DISCRETE_ACTION":
        if (G.Network.onDiscreteAction) G.Network.onDiscreteAction(data);
        break;

      // Guest -> Host: kiriman aksi diskret
      case "REMOTE_DISCRETE":
        if (G.Network.onRemoteDiscreteAction) G.Network.onRemoteDiscreteAction(data);
        break;

      case "REMATCH":
        if (G.Network.onRematch) G.Network.onRematch();
        break;

      case "DISCONNECT":
        G.Network.disconnect();
        break;
    }
  }

  function setupConnection(connection) {
    conn = connection;

    conn.on("open", function () {
      connected = true;
      sendPacket({ type: "HELLO", nickname: localNickname });
      startSyncLoop();
      if (G.Network.onConnected) G.Network.onConnected();
    });

    conn.on("data", handleIncomingPacket);

    conn.on("close", function () {
      connected = false;
      stopSyncLoop();
      if (G.Network.onDisconnect) G.Network.onDisconnect();
    });

    conn.on("error", function (err) {
      console.error("[Network] P2P Connection error:", err);
      if (G.Network.onError) G.Network.onError(err);
    });
  }

  G.Network = {
    gameMode: "singleplayer",   // "singleplayer" | "multiplayer"

    // Status
    isHost:       function () { return isHost; },
    isConnected:  function () { return connected; },
    getRoomCode:  function () { return roomCode; },
    getPing:      function () { return currentPing; },
    getLocalNickname:  function () { return localNickname; },
    setLocalNickname:  function (n) { localNickname = n || "Player"; },
    getRemoteNickname: function () { return remoteNickname; },
    getRemoteCharId:   function () { return remoteCharId; },
    isRemoteReady:     function () { return remoteCharReady; },

    // Hooks — dipasang oleh main.js
    onConnected:          null,
    onDisconnect:         null,
    onError:              null,
    onRoomCreated:        null,
    onOpponentJoined:     null,
    onRemoteCharSelect:   null,
    onStartFight:         null,
    onRemoteAction:       null,
    onRemoteInput:        null,   // keys object dari guest
    onFullState:          null,   // state lengkap dari host
    onDiscreteAction:     null,   // aksi diskret host->guest
    onRemoteDiscreteAction: null, // aksi diskret guest->host
    onRematch:            null,

    // ── Buat ruangan (jadi Host) ──────────────────────────────────────────
    hostRoom: function (nickname, onRoomCreated, onOpponentJoined) {
      localNickname = nickname || "Player 1";
      roomCode = generateRoomCode();
      var peerId = "SL-" + roomCode;
      isHost = true;
      connected = false;
      localCharReady = false;
      remoteCharReady = false;

      if (peer) { try { peer.destroy(); } catch(e){} }
      peer = new Peer(peerId, G.Config.PEERJS_CONFIG);

      peer.on("open", function (id) {
        if (onRoomCreated) onRoomCreated(roomCode);
        if (G.Network.onRoomCreated) G.Network.onRoomCreated(roomCode);
      });

      peer.on("connection", function (connection) {
        setupConnection(connection);
        if (onOpponentJoined) onOpponentJoined();
      });

      peer.on("error", function (err) {
        console.error("[Network] Host error:", err);
        if (G.Network.onError) G.Network.onError(err);
      });
    },

    // ── Masuk ke ruangan (jadi Guest) ────────────────────────────────────
    joinRoom: function (code, nickname, onConnected) {
      localNickname = nickname || "Player 2";
      roomCode = (code || "").toUpperCase().trim();
      var peerId = "SL-" + roomCode;
      isHost = false;
      connected = false;
      localCharReady = false;
      remoteCharReady = false;
      lastRemoteSeq = -1;

      if (peer) { try { peer.destroy(); } catch(e){} }
      peer = new Peer(G.Config.PEERJS_CONFIG);

      peer.on("open", function () {
        var connection = peer.connect(peerId, { reliable: true });
        setupConnection(connection);
        if (onConnected) onConnected();
      });

      peer.on("error", function (err) {
        console.error("[Network] Join error:", err);
        if (G.Network.onError) G.Network.onError(err);
      });
    },

    // ── Packet Senders ───────────────────────────────────────────────────

    sendCharSelect: function (charId, isReady) {
      localCharReady = !!isReady;
      sendPacket({ type: "CHAR_SELECT", charId: charId, isReady: localCharReady, nickname: localNickname });
    },

    sendStartFight: function () {
      sendPacket({ type: "START_FIGHT" });
    },

    // Guest → Host: kirim input keys setiap frame
    sendInputState: function (keys) {
      if (!connected) return;
      inputSeq++;
      sendPacket({ type: "INPUT", seq: inputSeq, keys: keys });
    },

    // Host → Guest: kirim state lengkap (posisi, HP, evo, cooldowns…)
    sendFullState: function () {
      if (!connected || !isHost) return;
      var m1 = G.moopy;
      var m2 = G.player2;
      sendPacket({
        type: "FULL_STATE",
        p1: {
          x: m1.x, y: m1.y, vx: m1.vx, vy: m1.vy,
          facing: m1.facing, hp: m1.hp, energy: m1.energy,
          isWolf: m1.isWolf, state: m1.state, attackType: m1.attackType,
          stunTimer: m1.stunTimer, onGround: m1.onGround,
          cd: { dash: m1.cd.dash, wolf: m1.cd.wolf, roar: m1.cd.roar, laser: m1.cd.laser }
        },
        p2: {
          x: m2.x, y: m2.y, vx: m2.vx, vy: m2.vy,
          facing: m2.facing, hp: m2.hp, energy: m2.energy,
          isWolf: m2.isWolf, state: m2.state, attackType: m2.attackType,
          stunTimer: m2.stunTimer, onGround: m2.onGround,
          cd: { dash: m2.cd.dash, wolf: m2.cd.wolf, roar: m2.cd.roar, laser: m2.cd.laser }
        },
        ping: currentPing
      });
    },

    // Kirim aksi diskret (jump, attack, dash, skill) ─ host atau guest
    sendDiscreteAction: function (action, payload) {
      if (!connected) return;
      var type = isHost ? "DISCRETE_ACTION" : "REMOTE_DISCRETE";
      sendPacket({ type: type, action: action, payload: payload || {} });
    },

    sendRematch: function () { sendPacket({ type: "REMATCH" }); },

    disconnect: function () {
      sendPacket({ type: "DISCONNECT" });
      stopSyncLoop();
      connected = false;
      if (conn)  { try { conn.close();    } catch(e){} conn  = null; }
      if (peer)  { try { peer.destroy();  } catch(e){} peer  = null; }
      isHost = false;
      roomCode = "";
      remoteNickname = "Opponent";
      remoteCharId = "moopy";
      localCharReady = false;
      remoteCharReady = false;
      lastRemoteSeq = -1;
      G.Network.gameMode = "singleplayer";
    }
  };

})(window.MoopyGame);
