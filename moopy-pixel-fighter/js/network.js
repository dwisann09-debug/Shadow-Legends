window.MoopyGame = window.MoopyGame || {};

(function (G) {
  "use strict";

  var peer = null;
  var conn = null;
  var isHost = false;
  var roomCode = "";
  var localNickname = "";
  var remoteNickname = "";
  var lastPingTime = 0;
  var currentPing = 0;
  var syncTimer = null;
  var remoteCharId = null;
  var localCharReady = false;
  var remoteCharReady = false;
  var inputSeq = 0;
  var remoteState = null;
  var connected = false;

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
      try {
        conn.send(data);
      } catch (e) {
        console.error("Network send error:", e);
      }
    }
  }

  function measurePing() {
    if (!connected) return;
    lastPingTime = Date.now();
    sendPacket({ type: "PING", timestamp: lastPingTime });
  }

  function startSyncLoop() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(function () {
      if (G.Network.gameMode === "multiplayer" && !G.gamePaused) {
        G.Network.sendInputState();
      }
    }, G.Config.MULTIPLAYER_SYNC_RATE_MS);
    
    setInterval(measurePing, 2000);
  }

  function stopSyncLoop() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  function handleIncomingPacket(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case "PING":
        sendPacket({ type: "PONG", timestamp: data.timestamp });
        break;

      case "PONG":
        if (data.timestamp === lastPingTime) {
          currentPing = Date.now() - data.timestamp;
        }
        break;

      case "CHAR_SELECT":
        remoteCharId = data.charId;
        remoteCharReady = data.isReady;
        if (G.Network.onRemoteCharSelect) {
          G.Network.onRemoteCharSelect(data.charId, data.isReady);
        }
        break;

      case "START_FIGHT":
        if (G.Network.onStartFight) {
          G.Network.onStartFight();
        }
        break;

      case "INPUT":
        if (G.Network.onRemoteInput) {
          G.Network.onRemoteInput(data.keys);
        }
        break;

      case "STATE_SYNC":
        remoteState = data;
        if (G.Network.onRemoteStateSync) {
          G.Network.onRemoteStateSync(data);
        }
        break;

      case "REMATCH":
        if (G.Network.onRematch) {
          G.Network.onRematch();
        }
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
      console.log("Connection established");
      sendPacket({ type: "HELLO", nickname: localNickname });
      startSyncLoop();
      if (G.Network.onConnected) G.Network.onConnected();
    });

    conn.on("data", handleIncomingPacket);

    conn.on("close", function () {
      connected = false;
      console.log("Connection closed");
      stopSyncLoop();
      if (G.Network.onDisconnect) G.Network.onDisconnect();
    });

    conn.on("error", function (err) {
      console.error("Connection error:", err);
      if (G.Network.onError) G.Network.onError(err);
    });
  }

  G.Network = {
    gameMode: "singleplayer",
    isHost: function () { return isHost; },
    isConnected: function () { return connected; },
    getRoomCode: function () { return roomCode; },
    getLocalNickname: function () { return localNickname; },
    getRemoteNickname: function () { return remoteNickname; },
    getPing: function () { return currentPing; },
    getRemoteCharId: function () { return remoteCharId; },
    isRemoteReady: function () { return remoteCharReady; },
    getRemoteState: function () { return remoteState; },

    onConnected: null,
    onDisconnect: null,
    onError: null,
    onRoomCreated: null,
    onOpponentJoined: null,
    onRemoteCharSelect: null,
    onStartFight: null,
    onRemoteInput: null,
    onRemoteStateSync: null,
    onRematch: null,

    hostRoom: function (nickname, onRoomCreated, onOpponentJoined) {
      localNickname = nickname;
      roomCode = generateRoomCode();
      isHost = true;
      connected = false;
      localCharReady = false;
      remoteCharReady = false;

      if (peer) peer.destroy();
      peer = new Peer(roomCode, G.Config.PEERJS_CONFIG);

      peer.on("open", function (id) {
        console.log("Room created:", id);
        if (onRoomCreated) onRoomCreated(roomCode);
        if (G.Network.onRoomCreated) G.Network.onRoomCreated(roomCode);
      });

      peer.on("connection", function (connection) {
        console.log("Opponent joined");
        setupConnection(connection);
        if (onOpponentJoined) onOpponentJoined();
        if (G.Network.onOpponentJoined) G.Network.onOpponentJoined();
      });

      peer.on("error", function (err) {
        console.error("Peer error:", err);
        if (G.Network.onError) G.Network.onError(err);
      });
    },

    joinRoom: function (code, nickname, onConnected) {
      localNickname = nickname;
      roomCode = code.toUpperCase();
      isHost = false;
      connected = false;
      localCharReady = false;
      remoteCharReady = false;

      if (peer) peer.destroy();
      peer = new Peer(G.Config.PEERJS_CONFIG);

      peer.on("open", function () {
        console.log("Connecting to room:", roomCode);
        var connection = peer.connect(roomCode, { reliable: true });
        setupConnection(connection);
        if (onConnected) onConnected();
      });

      peer.on("error", function (err) {
        console.error("Peer error:", err);
        if (G.Network.onError) G.Network.onError(err);
      });
    },

    sendCharSelect: function (charId, isReady) {
      localCharReady = isReady;
      sendPacket({
        type: "CHAR_SELECT",
        charId: charId,
        isReady: isReady
      });
    },

    sendStartFight: function () {
      sendPacket({ type: "START_FIGHT" });
    },

    sendInputState: function () {
      if (!connected) return;
      var m = G.moopy;
      inputSeq++;
      sendPacket({
        type: "INPUT",
        seq: inputSeq,
        keys: {
          w: G.keys ? G.keys.w : false,
          a: G.keys ? G.keys.a : false,
          s: G.keys ? G.keys.s : false,
          j: G.keys ? G.keys.j : false,
          k: G.keys ? G.keys.k : false,
          l: G.keys ? G.keys.l : false,
          p: G.keys ? G.keys.p : false,
          u: G.keys ? G.keys.u : false,
          i: G.keys ? G.keys.i : false
        },
        timestamp: Date.now()
      });
    },

    sendSyncState: function (p1State, p2State, timer) {
      if (!isHost || !connected) return;
      sendPacket({
        type: "STATE_SYNC",
        p1: p1State,
        p2: p2State,
        timer: timer
      });
    },

    sendRematch: function () {
      sendPacket({ type: "REMATCH" });
    },

    disconnect: function () {
      sendPacket({ type: "DISCONNECT" });
      stopSyncLoop();
      connected = false;
      if (conn) {
        conn.close();
        conn = null;
      }
      if (peer) {
        peer.destroy();
        peer = null;
      }
      isHost = false;
      roomCode = "";
      remoteNickname = "";
      remoteCharId = null;
      localCharReady = false;
      remoteCharReady = false;
      G.Network.gameMode = "singleplayer";
    }
  };
})(window.MoopyGame);
