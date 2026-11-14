// Going Once: screen controller and state machine.
// The UI never computes game results: it dispatches actions to reduce() and renders the state.

import {
  createGame,
  createRoomGame,
  reduce,
  replay,
  bidBounds,
  currentLot,
  standings,
  playerRank,
  outcomeKind,
  rivalTell,
  localDateString,
  saleNumber,
  isValidDateString,
  ANSWER_SECONDS,
  STEP,
  LOT_COUNT,
  EngineError,
} from "../engine.js";
import { ROSTER, getRivalById, describeSkills, registerRoomSeats } from "../roster.js";
import { CATEGORIES } from "../questions.js";
import {
  emptyProfile,
  applyFinishedGame,
  displayStreak,
  rankFor,
  rankProgress,
  unlockedPaddles,
  PADDLES,
  RANKS,
  buildShareText,
} from "../progress.js";
import { createStore, STORAGE_KEY } from "../store.js";
import { remainingMs, ANSWER_MS, createSequenceClock } from "../timing.js";
import {
  formatChips,
  ordinal,
  longDate,
  formatCountdown,
  signedChips,
  deltaLabel,
  difficultyLabel,
  msUntilMidnight,
  surnameOf,
} from "../format.js";
import { snapBid, quickPicks, stepBid } from "../bidmath.js";
import { h, mount, clear, cx, tiltFor } from "./dom.js";
import { portraitMarkup, portraitLabel } from "./portrait.js";
import { paddle, paddleSvg } from "./paddle.js";
import * as anim from "./anim.js";
import * as sound from "./sound.js";
import { RoomClient } from "../room.js";
import { SocketRoomClient, SOCKET_ROOM_URL } from "../socket-room.js";
const ROOM_SOCKET = Boolean(SOCKET_ROOM_URL);
import { RoomHost } from "../room-host.js";
import { povSnapshot, remapSnapshot, BID_MS, STEAL_MS } from "../room-game.js";
import { roomSetupScreen, roomLobbyScreen, roomStandingsScreen } from "./room-screens.js";
import { coverScreen } from "./cover.js";
import { lotScreen, roomStrip, attachLotHelpers } from "./lot.js";
import { resultsScreen } from "./results.js";
import { openHowToPlay, openLedger, openConfirm, openEndless, isModalOpen } from "./modals.js";

const STAMP_TILT = (seed) => ({ "--tilt": `${tiltFor(seed, 4)}deg` });

export function startApp({ root, devDate = null } = {}) {
  const storeKey = devDate ? "goingonce:dev" : STORAGE_KEY;
  const store = createStore(undefined, storeKey);
  const clock = createSequenceClock();

  const app = {
    root,
    store,
    devDate,
    today: devDate || localDateString(),
    profile: emptyProfile(),
    state: null,
    screen: "cover",
    actions: [],
    timer: null,
    bid: 0,
    selection: null,
    stealStage: false,
    lastGame: null,
    lastResult: null,
    revealDone: false,
    persistent: true,
    liveEl: null,
    unlockedNoticeShown: false,
    roomClient: null,
    setup: null,
    roomHost: null,
    roomMySeat: null,
    endless: false,
    endlessLots: null,
    roomLockedBid: null,
    roomLockedSeen: null,
    roomBidSeen: null,
    roomFinal: null,
    stealForPlayer: false,
  };

  /* ---------------------------------------------------------------- rooms helpers */

  function roomAwaiting() {
    const state = app.state;
    if (!state) return false;
    if (state.phase === "answering") {
      const awaiting = state.current && state.current.awaiting;
      return !Array.isArray(awaiting) || awaiting.includes("player");
    }
    if (state.phase === "stealing") return app.stealForPlayer;
    return true;
  }

  function setRoomTimer(state, deadline, duration) {
    const ph = state.phase;
    if (!deadline || (ph !== "bidding" && ph !== "answering" && ph !== "stealing")) {
      app.timer = null;
      return;
    }
    const fallback = ph === "bidding" ? BID_MS : ph === "answering" ? ANSWER_MS : STEAL_MS;
    const dur = duration || fallback;
    app.timer = { stage: ph, lotIndex: state.lotIndex, startedAt: deadline - dur, duration: dur };
  }

  function syncRoomDerived(povState, deadline, duration) {
    if (Array.isArray(povState.seats)) registerRoomSeats(povState.seats);
    app.state = povState;
    app.roomDeadline = deadline || null;
    app.roomDuration = duration || null;
    if (povState.phase === "bidding") {
      if (app.roomLockedSeen !== povState.lotIndex) {
        app.roomLockedBid = null;
        app.roomLockedSeen = povState.lotIndex;
      }
      if (app.roomBidSeen !== povState.lotIndex) {
        const bounds = bidBounds(povState);
        app.bid = currentLot(povState).isHammer ? bounds.min : 0;
        app.roomBidSeen = povState.lotIndex;
      }
    } else {
      app.roomLockedBid = null;
      app.roomLockedSeen = null;
    }
    app.stealForPlayer = Boolean(povState.current && povState.phase === "stealing" && povState.current.stealFor === "player");
    setRoomTimer(povState, deadline, duration);
    if (povState.phase === "finished") {
      app.roomFinal = povState.final || null;
      app.screen = "room-standings";
      return "finished";
    }
    app.screen = "lot";
    return "lot";
  }

  function roomHostUpdated() {
    const host = app.roomHost;
    if (!host || !host.sale) return;
    app.roomMySeat = "h-1";
    const pov = host.hostSnapshot();
    const dur = host.deadline ? { bidding: BID_MS, answering: ANSWER_MS, stealing: STEAL_MS }[host.sale.phase] || null : null;
    syncRoomDerived(pov, host.deadline, dur);
    render();
  }

  function roomGuestUpdated() {
    const client = app.roomClient;
    const snap = client && client.lastSnapshot;
    if (!snap || client.phase !== "playing") {
      return; // the first snapshot arrives within a beat of the sale opening
    }
    if (app.screen === "room-standings" || app.screen === "room-lobby") app.screen = "lot";
    app.roomMySeat = client.mySeat;
    const pov = remapSnapshot(snap.pub, client.mySeat || "nobody");
    syncRoomDerived(pov, snap.deadline, snap.duration);
    render();
  }

  /* ---------------------------------------------------------------- storage */

  root.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn || btn.disabled) return;
    if (btn.closest("[data-own-sound]")) return;
    sound.play("click");
  });

  function loadAll() {
    const loaded = store.load(app.today);
    app.profile = loaded.profile;
    app.persistent = loaded.persistent;
    const save = loaded.saves[app.today];
    if (save && save.actions.length) {
      try {
        app.state = replay(app.today, save.actions);
        app.actions = save.actions.map((a) => ({ ...a }));
        app.timer = save.timer;
      } catch {
        app.state = null;
        app.actions = [];
        app.timer = null;
      }
    } else {
      app.state = null;
      app.actions = [];
      app.timer = null;
    }
    sound.setEnabled(app.profile.soundOn);
  }

  function persist() {
    if (app.roomClient) return; // a room sale never touches the daily save
    if (app.endless) return; // an evening table is never recorded either
    if (!app.state) {
      store.saveProfile(app.profile);
      return;
    }
    store.save({ profile: app.profile, saves: { ...store.snapshot().saves, [app.today]: { engineVersion: 1, actions: app.actions, timer: app.timer } } });
  }

  function persistProfile() {
    store.saveProfile(app.profile);
  }

  /* ---------------------------------------------------------------- engine dispatch */

  function dispatch(action) {
    if (!app.state) return false;
    let next;
    try {
      next = reduce(app.state, action);
    } catch (error) {
      if (error instanceof EngineError) return false;
      return false;
    }
    app.state = next;
    app.actions = [...app.actions, action];
    persist();
    return true;
  }

  function newGame() {
    app.state = createGame(app.today);
    app.actions = [];
    app.timer = null;
    app.selection = null;
    app.stealStage = false;
    app.revealDone = false;
    app.bid = 0;
    persist();
  }

  function startEndless(lotCount) {
    sound.unlock();
    sound.play("page");
    app.endless = true;
    app.endlessLots = Math.max(7, Math.min(20, Math.floor(lotCount) || 10));
    app.state = createRoomGame(
      `evening-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
      { lotCount: app.endlessLots, difficulty: "mixed" },
    );
    app.actions = [];
    app.timer = null;
    app.selection = null;
    app.stealStage = false;
    app.revealDone = false;
    app.bid = 0;
    app.screen = "lot";
    render();
  }

  function exitEndless() {
    app.endless = false;
    app.endlessLots = null;
    app.state = null;
    app.actions = [];
    app.timer = null;
    loadAll();
    app.screen = "cover";
    render();
  }

  /* ---------------------------------------------------------------- live region */

  function announce(message) {
    if (!app.liveEl) return;
    app.liveEl.textContent = "";
    setTimeout(() => {
      if (app.liveEl) app.liveEl.textContent = message;
    }, 30);
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    clock.begin();
    if (isModalOpen()) return;
    if (app.screen === "room-setup") {
      mountScreen(roomSetupView());
      return;
    }
    if (app.screen === "room-lobby") {
      mountScreen(roomLobbyView());
      return;
    }
    if (app.screen === "room-standings") {
      mountScreen(roomStandingsView());
      return;
    }
    if (!app.state || app.state.phase === "finished") {
      if (app.state && app.state.phase === "finished") {
        if (app.roomClient) {
          app.screen = "room-standings";
          mountScreen(roomStandingsView());
          return;
        }
        finishGame();
        app.screen = "results";
        mountScreen(resultsView());
      } else {
        app.screen = "cover";
        mountScreen(coverView());
      }
      return;
    }
    app.screen = "lot";
    mountScreen(lotView());
  }

  function mountScreen(view) {
    const scrollY = window.scrollY;
    mount(root, view.header || null, view.body, app.liveEl);
    if (view.after) view.after();
    if (view.scrollTo === false) window.scrollTo(0, scrollY);
    else if (view.scrollTo === "top") window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- cover */

  function coverView() {
    return coverScreen(app, {
      onStart: () => startOrResume(),
      onPrivateRoom: () => openPrivateRoom(),
      onEndless: () => openEndless(app, null),
      onHowTo: (opener) => openHowToPlay(app, opener),
      onLedger: (opener) => openLedger(app, opener),
      onSound: toggleSound,
      onPickPaddle: (id) => {
        app.profile = { ...app.profile, paddle: id };
        persistProfile();
        applyPaddle();
        render();
      },
    });
  }

  function toggleSound() {
    app.profile = { ...app.profile, soundOn: !app.profile.soundOn };
    sound.setEnabled(app.profile.soundOn);
    if (app.profile.soundOn) sound.play("coin");
    persistProfile();
    render();
  }

  function applyPaddle() {
    const chosen = PADDLES.find((p) => p.id === app.profile.paddle) || PADDLES[0];
    document.documentElement.style.setProperty("--paddle", chosen.color);
    document.documentElement.style.setProperty("--paddle-trim", chosen.trim);
  }

  function startOrResume() {
    sound.unlock();
    sound.play("page");
    if (!app.state) {
      newGame();
      openIntroIfNeeded();
    }
    app.selection = null;
    app.stealStage = false;
    if (app.state.phase === "stealing" && app.timer) app.stealStage = true;
    render();
  }

  function openIntroIfNeeded() {
    if (app.profile.seenIntro) return;
    app.profile = { ...app.profile, seenIntro: true };
    persistProfile();
    setTimeout(() => openHowToPlay(app, null), 320);
  }

  /* ---------------------------------------------------------------- lot screen */

  function lotView() {
    const view = lotScreen(app, {
      onBidChange: (amount) => {
        app.bid = amount;
        updateBidUI();
      },
      onConfirmBid: confirmBid,
      onSelect: (index) => selectAnswer(index),
      onLockAnswer: lockAnswer,
      onSteal: startSteal,
      onDecline: declineSteal,
      onNext: nextLot,
      onSkipSequence: () => clock.skip(),
      onHowTo: (opener) => openHowToPlay(app, opener),
      onLedger: (opener) => openLedger(app, opener),
      onSound: toggleSound,
      announce,
    });
    return view;
  }

  function updateBidUI() {
    const screen = root.querySelector("[data-lot-screen]");
    if (screen) {
      const detail = { bid: app.bid };
      screen.dispatchEvent(new CustomEvent("goingonce:bid", { detail }));
    }
  }

  function confirmBid() {
    if (!app.state || app.state.phase !== "bidding") return;
    const lot = currentLot(app.state);
    const bounds = bidBounds(app.state);
    const amount = lot.isHammer ? snapBid(app.bid, bounds) : snapBid(app.bid, bounds);
    if (app.roomClient && app.roomClient.phase === "playing") {
      if (app.roomLockedBid != null) return;
      if (amount > 0) sound.play("lock");
      app.roomLockedBid = amount;
      if (app.roomClient.isHost && app.roomHost) app.roomHost.noteBid("h-1", amount);
      else app.roomClient.publishAction({ t: "bid", amount });
      app.selection = null;
      app.revealDone = false;
      render();
      playReveal();
      return;
    }
    if (amount > 0) sound.play("lock");
    if (!dispatch({ type: "bid", amount })) return;
    app.selection = null;
    app.revealDone = false;
    const phase = app.state.phase;
    if (phase === "answering") startAnswerTimer();
    render();
    playReveal();
  }

  function startAnswerTimer() {
    app.timer = { stage: "answering", lotIndex: app.state.lotIndex, startedAt: Date.now() };
    persist();
  }

  function playReveal() {
    const seq = clock.begin();
    const screen = root.querySelector("[data-lot-screen]");
    if (!screen) return;
    screen.dispatchEvent(new CustomEvent("goingonce:reveal", { detail: { seq } }));
  }

  function selectAnswer(index) {
    if (!app.state) return;
    if (app.roomClient && !roomAwaiting()) return;
    if (app.state.phase === "answering") {
      app.selection = index;
      root.querySelector("[data-lot-screen]")?.dispatchEvent(new CustomEvent("goingonce:select", { detail: { index } }));
    } else if (app.state.phase === "stealing" && app.stealStage) {
      app.selection = index;
      root.querySelector("[data-lot-screen]")?.dispatchEvent(new CustomEvent("goingonce:select", { detail: { index } }));
    }
  }

  function lockAnswer() {
    if (!app.state) return;
    if (app.roomClient && app.roomClient.phase === "playing") {
      if (app.state.phase === "answering") {
        if (!roomAwaiting()) return;
        const index = app.selection;
        app.timer = null;
        app.selection = null;
        if (app.roomClient.isHost && app.roomHost) app.roomHost.noteAnswer("h-1", index);
        else app.roomClient.publishAction({ t: "answer", index });
        render();
        return;
      }
      if (app.state.phase === "stealing" && app.stealStage) {
        if (!roomAwaiting()) return;
        const index = app.selection;
        app.timer = null;
        app.selection = null;
        app.stealStage = false;
        if (app.roomClient.isHost && app.roomHost) app.roomHost.noteSteal("h-1", index);
        else app.roomClient.publishAction({ t: "steal", index });
        render();
        return;
      }
      return;
    }
    if (app.state.phase === "answering") {
      const index = app.selection;
      if (!dispatch({ type: "answer", index })) return;
      app.timer = null;
      app.selection = null;
      render();
      afterResolve();
    } else if (app.state.phase === "stealing" && app.stealStage) {
      const index = app.selection;
      if (!dispatch({ type: "steal", index })) return;
      app.timer = null;
      app.selection = null;
      render();
      afterResolve();
    }
  }

  function startSteal() {
    if (!app.state || app.state.phase !== "stealing") return;
    if (app.roomClient && !roomAwaiting()) return;
    app.stealStage = true;
    app.selection = null;
    app.timer = { stage: "stealing", lotIndex: app.state.lotIndex, startedAt: Date.now(), duration: STEAL_MS };
    persist();
    render();
  }

  function declineSteal() {
    if (!app.state || app.state.phase !== "stealing") return;
    if (app.roomClient && app.roomClient.phase === "playing") {
      if (!roomAwaiting()) return;
      app.timer = null;
      app.stealStage = false;
      if (app.roomClient.isHost && app.roomHost) app.roomHost.noteDecline("h-1");
      else app.roomClient.publishAction({ t: "decline" });
      render();
      return;
    }
    if (!dispatch({ type: "decline" })) return;
    app.timer = null;
    app.stealStage = false;
    render();
    afterResolve();
  }

  function afterResolve() {
    const record = app.state.history[app.state.history.length - 1];
    if (!record) return;
    const delta = record.deltas.player;
    if (delta > 0) sound.play("right");
    else if (delta < 0) sound.play("wrong");
  }

  function nextLot() {
    if (!app.state || app.state.phase !== "resolved") return;
    if (app.roomClient) {
      if (app.roomClient.isSocket) {
        sound.play("page");
        app.roomClient.publishAction({ t: "advance" });
        app.selection = null;
        app.revealDone = false;
        app.timer = null;
        app.roomLockedBid = null;
        return; // the house relay turns the page
      }
      if (!app.roomClient.isHost || !app.roomHost) return;
      sound.play("page");
      app.roomHost.nextLot();
      app.selection = null;
      app.revealDone = false;
      app.timer = null;
      app.roomLockedBid = null;
      return; // roomHostUpdated renders the next lot
    }
    sound.play("page");
    const exiting = root.querySelector("[data-lot-screen]");
    const commit = () => {
      if (!dispatch({ type: "next" })) return;
      app.selection = null;
      app.revealDone = false;
      app.timer = null;
      if (app.state.phase === "bidding") {
        const lot = currentLot(app.state);
        const bounds = bidBounds(app.state);
        app.bid = lot.isHammer ? bounds.min : 0;
      }
      render();
      if (app.state.phase === "finished") return;
      const seq = clock.begin();
      const screen = root.querySelector("[data-lot-screen]");
      if (screen) screen.dispatchEvent(new CustomEvent("goingonce:newlot", { detail: { seq } }));
    };
    if (exiting && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      exiting.classList.add("sheet--exit");
      window.setTimeout(commit, 210);
      return;
    }
    commit();
  }


  /* ---------------------------------------------------------------- private rooms */

  function ensureClient() {
    if (!app.roomClient) {
      const client = ROOM_SOCKET ? new SocketRoomClient() : new RoomClient();
      client.onUpdate = () => syncRoom();
      app.roomClient = client;
    }
    return app.roomClient;
  }

  function syncRoom() {
    const client = app.roomClient;
    if (!client) return;
    if (client.phase === "playing") {
      if (client.isHost && app.roomHost) return; // MQTT host path; over the relay everyone is a viewer
      roomGuestUpdated();
      return;
    }
    if (client.phase === "ended") {
      app.state = null;
      app.actions = [];
      app.selection = null;
      app.stealStage = false;
      app.timer = null;
      app.roomHost = null;
      app.roomFinal = null;
      app.screen = "room-standings";
      render();
      return;
    }
    if (app.screen === "room-setup" || app.screen === "room-lobby" || app.screen === "room-standings") render();
  }

  function openPrivateRoom() {
    sound.unlock();
    app.setup = { mode: "choose", name: "", code: "", error: null, connecting: false };
    app.screen = "room-setup";
    render();
  }

  function releaseRoom() {
    if (app.roomClient) {
      const client = app.roomClient;
      if (client.isSocket) {
        if (client.isHost) client.disband(); else client.leave();
      } else if (client.isHost && client.phase === "playing") client.endRoom();
      else client.leave();
    }
    app.roomClient = null;
    app.roomHost = null;
    app.roomFinal = null;
    app.roomLockedBid = null;
    app.roomMySeat = null;
    app.stealForPlayer = false;
    app.setup = null;
    app.state = null;
    app.actions = [];
    app.timer = null;
    app.selection = null;
    app.stealStage = false;
    app.screen = "cover";
    render();
  }

  function copyRoomCode() {
    const client = app.roomClient;
    if (!client) return;
    const code = client.code;
    const done = () => announce(`Room code ${code} copied.`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, done);
    } else {
      const area = document.createElement("textarea");
      area.value = code;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch { /* no clipboard */ }
      area.remove();
      done();
    }
  }

  function roomSetupView() {
    return roomSetupScreen(app, {
      onMode: (mode) => {
        const draft = app.setup ?? {};
        app.setup = { ...draft, mode, error: null, connecting: false };
        if (app.roomClient) { app.roomClient.leave(); app.roomClient = null; }
        render();
      },
      onCreate: (name) => {
        const draft = app.setup;
        draft.connecting = true;
        draft.error = null;
        render();
        ensureClient();
        app.roomClient
          .createRoom(name)
          .then(() => {
            app.setup = null;
            app.screen = "room-lobby";
            render();
          })
          .catch((error) => {
            draft.connecting = false;
            draft.error = error && error.message ? error.message : "Could not open the room. Try again.";
            if (app.roomClient) { app.roomClient.leave(); app.roomClient = null; }
            render();
          });
      },
      onJoin: (code, name) => {
        const draft = app.setup;
        draft.connecting = true;
        draft.error = null;
        render();
        ensureClient();
        app.roomClient
          .joinRoom(code, name)
          .then(() => {
            app.setup = null;
            app.screen = "room-lobby";
            render();
          })
          .catch((error) => {
            draft.connecting = false;
            draft.error = error && error.message ? error.message : "Could not join the room. Check the code and try again.";
            if (app.roomClient) { app.roomClient.leave(); app.roomClient = null; }
            render();
          });
      },
      onLeave: releaseRoom,
    });
  }

  function roomLobbyView() {
    const client = app.roomClient;
    return roomLobbyScreen(app, {
      onKick: (id, name) =>
        openConfirm({
          title: `Remove ${name}?`,
          text: "They can rejoin later with the code — as long as you have not disbanded the room.",
          confirmLabel: "Remove",
          opener: null,
          onConfirm: () => client && client.kick(id),
        }),
      onDisband: () =>
        openConfirm({
          title: "Disband the room?",
          text: "Everyone at the table is sent back to the cover. The daily sale goes on as ever.",
          confirmLabel: "Disband",
          opener: null,
          onConfirm: () => client && client.disband(),
        }),
      onStart: () => {
        if (!client || client.phase !== "lobby") return;
        sound.unlock();
        if (client.isSocket) { client.startSale().catch(() => {}); return; }
        const host = new RoomHost(client, { onUpdate: roomHostUpdated });
        client.hostEngine = host;
        app.roomHost = host;
        host.start(); // broadcasts the sale; roomHostUpdated takes over rendering
      },
      onSettings: (patch) => client && client.setSettings(patch),
      onRefusal: (message) => {
        // the house said no (a stale tap, a closed phase): tell the player, then re-sync from the next snapshot
        if (app.roomClient) app.roomClient.error = message;
        render();
      },
      onCopyCode: copyRoomCode,
      onLeave: releaseRoom,
    });
  }

  function roomStandingsView() {
    return roomStandingsScreen(app, { onLeave: releaseRoom, onPlayAgain: () => app.roomClient && typeof app.roomClient.playAgain === "function" && app.roomClient.playAgain().catch(() => {}) });
  }

    /* ---------------------------------------------------------------- results */

  function finishGame() {
    if (app.endless) {
      app.lastResult = { gained: 0, rankedUp: false, newPaddles: [], newAchievements: [], endless: true };
      return;
    }
    if (app.roomClient) return; // room sales never touch daily saves
    if (!app.state || app.state.phase !== "finished") return;
    const already = app.profile.history.some((entry) => entry.date === app.today);
    if (!already) {
      const result = applyFinishedGame(app.profile, {
        date: app.today,
        chips: app.state.banks.player,
        rank: playerRank(app.state),
        records: app.state.history,
      });
      app.profile = result.profile;
      app.lastResult = result;
      if (result.rankedUp) sound.play("fanfare");
      persistProfile();
    } else if (!app.lastResult) {
      const chips = app.state.banks.player;
      const rank = playerRank(app.state);
      const entry = app.profile.history.find((e) => e.date === app.today);
      app.lastResult = { gained: entry ? entry.rep : 0, rankedUp: false, newPaddles: [] };
      app.lastChips = chips;
      app.lastRank = rank;
    }
  }

  function resultsView() {
    return resultsScreen(app, {
      onCopy: copyResult,
      onHowTo: (opener) => openHowToPlay(app, opener),
      onLedger: (opener) => openLedger(app, opener),
      onSound: toggleSound,
      onAgain: () => startEndless(app.endlessLots || 10),
      onHome: () => exitEndless(),
      onPlayNew: () => {
        app.today = localDateString();
        app.state = null;
        app.actions = [];
        app.timer = null;
        loadAll();
        render();
      },
    });
  }

  async function copyResult() {
    const text = buildShareText(app.state, `${location.origin}${location.pathname}`);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return { ok: true, text };
      }
    } catch {
      /* fall through to the textarea */
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand && document.execCommand("copy");
      area.remove();
      if (ok) return { ok: true, text };
    } catch {
      /* fall through */
    }
    return { ok: false, text };
  }

  /* ---------------------------------------------------------------- rollover */

  function checkDate() {
    if (app.devDate) return;
    if (app.roomClient) return; // a room sale is in session; do not roll the daily over
    const now = localDateString();
    if (now === app.today) return;
    if (app.state && app.state.phase !== "finished") return;
    app.today = now;
    app.state = null;
    app.actions = [];
    app.timer = null;
    loadAll();
    render();
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    app.liveEl = h("div", { class: "sr-live", role: "status", "aria-live": "polite", "aria-atomic": "true" });
    loadAll();
    applyPaddle();
    if (app.state) {
      if (app.state.phase === "answering" || app.state.phase === "stealing") {
        const left = remainingMs(app.timer ? app.timer.startedAt : null);
        if (!app.timer && app.state.phase === "answering") {
          app.timer = { stage: "answering", lotIndex: app.state.lotIndex, startedAt: Date.now() };
          persist();
        }
        if (left <= 0) {
          if (app.state.phase === "answering") {
            dispatch({ type: "answer", index: null });
            app.timer = null;
            persist();
          } else if (app.timer) {
            dispatch({ type: "steal", index: null });
            app.timer = null;
            persist();
          }
        } else if (app.state.phase === "stealing" && app.timer) {
          app.stealStage = true;
        }
      }
      if (app.state.phase === "bidding") {
        const bounds = bidBounds(app.state);
        app.bid = currentLot(app.state).isHammer ? bounds.min : 0;
      }
    }
    render();
    startWatchers();
    if (!app.profile.seenIntro && !app.state) {
      /* the intro opens from the cover's start button, or on its own after a moment */
      setTimeout(() => {
        if (!app.state && !isModalOpen() && app.screen === "cover") openIntroIfNeeded();
      }, 700);
    }
  }

  let watcherId = null;
  function startWatchers() {
    if (watcherId) clearInterval(watcherId);
    watcherId = setInterval(() => {
      checkDate();
      if (app.screen === "cover" || app.screen === "results") updateCountdowns();
    }, 1000);
    document.addEventListener("visibilitychange", () => {
      checkDate();
      if (!document.hidden) {
        const screen = root.querySelector("[data-lot-screen]");
        if (screen) screen.dispatchEvent(new CustomEvent("goingonce:resume"));
      }
    });
    window.addEventListener("focus", () => {
      checkDate();
      const screen = root.querySelector("[data-lot-screen]");
      if (screen) screen.dispatchEvent(new CustomEvent("goingonce:resume"));
    });
  }

  function updateCountdowns() {
    const nodes = root.querySelectorAll("[data-countdown]");
    const ms = msUntilMidnight();
    nodes.forEach((node) => {
      node.textContent = formatCountdown(ms);
    });
  }

  app.dispatch = dispatch;
  app.render = render;
  attachLotHelpers(app);
  app.announce = announce;
  app.persist = persist;
  app.persistProfile = persistProfile;
  app.startEndless = startEndless;
  app.exitEndless = exitEndless;
  app.applyPaddle = applyPaddle;
  app.STAMP_TILT = STAMP_TILT;
  app.loadAll = loadAll;
  app.clock = clock;

  boot();
  return app;
}

