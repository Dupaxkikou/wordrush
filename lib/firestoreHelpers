import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  deleteField,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseClient";
import { colorForName, generateRoomCode } from "./avatar";
import { CATEGORIES, getCategoryById, pickRandomCategories } from "./categories";
import { findBestMatch, normalize, pointsForDifficulty } from "./fuzzy";

const ROUND_DURATION_MS = 40 * 1000;
const DEFAULT_ROUND_COUNT = 3;
export const GENERAL_ROOM_CODE = "GENERAL";

/* ----------------------------- PROFILS ----------------------------- */

export async function getOrCreateProfile(usernameRaw) {
  const username = usernameRaw.trim();
  if (!username) throw new Error("Pseudo vide");
  const ref = doc(db, "profiles", username.toLowerCase());
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  const profile = {
    username,
    color: colorForName(username),
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    totalScore: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function listenAllProfiles(callback) {
  const q = query(collection(db, "profiles"), orderBy("username"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export async function recordGameResult(username, { isWinner, scoreGained }) {
  const ref = doc(db, "profiles", username.toLowerCase());
  await updateDoc(ref, {
    wins: increment(isWinner ? 1 : 0),
    losses: increment(isWinner ? 0 : 1),
    gamesPlayed: increment(1),
    totalScore: increment(scoreGained || 0),
  });
}

/* ------------------------------ SALONS ------------------------------ */

export function listenPublicRooms(callback) {
  const q = query(
    collection(db, "rooms"),
    where("status", "==", "lobby"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createRoom(hostUsername, { roundCount } = {}) {
  let code = generateRoomCode();
  // s'assure que le code n'existe pas dÃ©jÃ  (trÃ¨s rare en collision)
  let ref = doc(db, "rooms", code);
  let snap = await getDoc(ref);
  let attempts = 0;
  while (snap.exists() && attempts < 5) {
    code = generateRoomCode();
    ref = doc(db, "rooms", code);
    snap = await getDoc(ref);
    attempts++;
  }

  const roomData = {
    code,
    hostUsername,
    status: "lobby",
    roundCount: roundCount || DEFAULT_ROUND_COUNT,
    currentRoundIndex: -1,
    playerCount: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, roomData);
  await joinRoom(code, hostUsername);
  return code;
}

export async function joinRoom(code, username) {
  const profile = await getOrCreateProfile(username);
  const roomRef = doc(db, "rooms", code);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error("Ce salon n'existe pas.");
  if (roomSnap.data().status !== "lobby") {
    throw new Error("La partie a dÃ©jÃ  commencÃ© dans ce salon.");
  }

  const playerRef = doc(db, "rooms", code, "players", username.toLowerCase());
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) {
    await setDoc(playerRef, {
      username,
      color: profile.color,
      score: 0,
      joinedAt: serverTimestamp(),
    });
    // Met Ã  jour le compteur de joueurs sur le salon (affichage live sans listener par salon)
    await updateDoc(roomRef, { playerCount: increment(1) });
  }
  return roomSnap.data();
}

export function listenRoom(code, callback) {
  const ref = doc(db, "rooms", code);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function listenPlayers(code, callback) {
  const q = query(collection(db, "rooms", code, "players"), orderBy("score", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export async function leaveRoom(code, username) {
  const playerRef = doc(db, "rooms", code, "players", username.toLowerCase());
  const roomRef = doc(db, "rooms", code);
  await setDoc(playerRef, { left: true }, { merge: true });
  try {
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists() && roomSnap.data().status === "lobby") {
      await updateDoc(roomRef, { playerCount: increment(-1) });
    }
  } catch (e) {
    // pas bloquant
  }
}

/* -------------------------- SALON GÃNÃRAL PERMANENT -------------------------- */

/**
 * CrÃ©e le salon gÃ©nÃ©ral s'il n'existe pas encore. Ce salon ne contient pas
 * de "hostUsername" fixe : l'hÃ´te est toujours le premier joueur actif
 * (le plus ancien "joinedAt" parmi les joueurs prÃ©sents).
 */
export async function ensureGeneralRoom() {
  const ref = doc(db, "rooms", GENERAL_ROOM_CODE);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      code: GENERAL_ROOM_CODE,
      isGeneral: true,
      hostUsername: null,
      status: "lobby",
      roundCount: DEFAULT_ROUND_COUNT,
      currentRoundIndex: -1,
      playerCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  return GENERAL_ROOM_CODE;
}

export async function joinGeneralRoom(username) {
  await ensureGeneralRoom();
  const profile = await getOrCreateProfile(username);
  const roomRef = doc(db, "rooms", GENERAL_ROOM_CODE);

  const playerKey = username.toLowerCase();
  const playerRef = doc(db, "rooms", GENERAL_ROOM_CODE, "players", playerKey);
  const playerSnap = await getDoc(playerRef);

  // Pas de blocage sur le statut : on peut rejoindre le salon gÃ©nÃ©ral Ã  tout
  // moment, mÃªme en pleine partie (on participe aux manches restantes).
  if (!playerSnap.exists()) {
    await setDoc(playerRef, {
      username,
      color: profile.color,
      score: 0,
      joinedAt: serverTimestamp(),
      active: true,
    });
    await updateDoc(roomRef, { playerCount: increment(1) });
  } else if (playerSnap.data().active !== true) {
    await setDoc(
      playerRef,
      { active: true, score: 0, joinedAt: serverTimestamp() },
      { merge: true }
    );
    await updateDoc(roomRef, { playerCount: increment(1) });
  }

  return GENERAL_ROOM_CODE;
}

export async function leaveGeneralRoom(username) {
  const playerRef = doc(db, "rooms", GENERAL_ROOM_CODE, "players", username.toLowerCase());
  const roomRef = doc(db, "rooms", GENERAL_ROOM_CODE);

  // On marque le joueur comme inactif de faÃ§on fiable, quel que soit le
  // statut de la partie (lobby, en cours, terminÃ©e).
  await setDoc(playerRef, { active: false }, { merge: true });
  await updateDoc(roomRef, { playerCount: increment(-1) });

  // S'il ne reste plus personne d'actif, on arrÃªte tout et on remet le
  // salon en lobby pour que de nouveaux joueurs puissent repartir Ã  zÃ©ro.
  try {
    const activeQuery = query(
      collection(db, "rooms", GENERAL_ROOM_CODE, "players"),
      where("active", "==", true)
    );
    const activeSnap = await getDocs(activeQuery);
    if (activeSnap.empty) {
      await updateDoc(roomRef, {
        status: "lobby",
        currentRoundIndex: -1,
        categoryIds: deleteField(),
        resultsRecorded: false,
        playerCount: 0,
      });
    }
  } catch (e) {
    // pas bloquant
  }
}

/**
 * Remet le salon gÃ©nÃ©ral en lobby pour une nouvelle partie, avec les scores
 * remis Ã  zÃ©ro pour les joueurs encore actifs. Le salon n'est jamais supprimÃ©.
 */
export async function resetGeneralRoomForNextGame() {
  const roomRef = doc(db, "rooms", GENERAL_ROOM_CODE);

  const shouldReset = await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) return false;
    if (roomSnap.data().status !== "finished") return false;
    tx.update(roomRef, {
      status: "lobby",
      currentRoundIndex: -1,
      categoryIds: deleteField(),
      resultsRecorded: false,
    });
    return true;
  });

  if (!shouldReset) return;

  const playersQuery = query(
    collection(db, "rooms", GENERAL_ROOM_CODE, "players"),
    where("active", "==", true)
  );
  const snap = await getDocs(playersQuery);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { score: 0 });
  });
  await batch.commit();
}



export async function startGame(code) {
  const roomRef = doc(db, "rooms", code);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error("Salon introuvable");
  const room = roomSnap.data();

  const categoryIds = pickRandomCategories(room.roundCount || DEFAULT_ROUND_COUNT);

  await updateDoc(roomRef, {
    status: "playing",
    currentRoundIndex: 0,
    categoryIds,
  });

  await createRoundDoc(code, 0, categoryIds[0]);
}

async function createRoundDoc(code, roundIndex, categoryId) {
  const roundRef = doc(db, "rooms", code, "rounds", String(roundIndex));
  await setDoc(roundRef, {
    categoryId,
    status: "playing",
    startedAt: serverTimestamp(),
    endsAtMs: Date.now() + ROUND_DURATION_MS,
    players: {},
  });
}

export function listenRound(code, roundIndex, callback) {
  const ref = doc(db, "rooms", code, "rounds", String(roundIndex));
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/**
 * Soumet un mot pour validation. Utilise une transaction pour Ã©viter les doublons
 * et garantir l'unicitÃ© par joueur. Retourne { accepted, points, matchedWord }.
 */
export async function submitWord(code, roundIndex, username, rawWord) {
  const normalized = normalize(rawWord);
  if (!normalized) return { accepted: false, reason: "vide" };

  const roundRef = doc(db, "rooms", code, "rounds", String(roundIndex));
  const playerKey = username.toLowerCase();

  return runTransaction(db, async (tx) => {
    const roundSnap = await tx.get(roundRef);
    if (!roundSnap.exists()) return { accepted: false, reason: "manche introuvable" };
    const round = roundSnap.data();

    if (round.status !== "playing") {
      return { accepted: false, reason: "manche terminÃ©e" };
    }
    if (Date.now() > round.endsAtMs) {
      return { accepted: false, reason: "temps Ã©coulÃ©" };
    }

    const category = getCategoryById(round.categoryId);
    if (!category) return { accepted: false, reason: "catÃ©gorie introuvable" };

    const existingPlayerData = round.players?.[playerKey] || { words: [], score: 0 };
    const alreadyFound = existingPlayerData.words.some(
      (w) => w.normalized === normalized
    );
    if (alreadyFound) {
      return { accepted: false, reason: "dÃ©jÃ  trouvÃ©" };
    }

    const result = findBestMatch(normalized, category.answers);
    if (!result) {
      return { accepted: false, reason: "mot invalide" };
    }

    // VÃ©rifie qu'aucun autre mot dÃ©jÃ  trouvÃ© par ce joueur ne pointe vers la mÃªme rÃ©ponse
    const duplicateAnswer = existingPlayerData.words.some(
      (w) => w.answerWord === result.match.word
    );
    if (duplicateAnswer) {
      return { accepted: false, reason: "rÃ©ponse dÃ©jÃ  comptÃ©e" };
    }

    const points = pointsForDifficulty(result.match.difficulty);
    const newWordEntry = {
      raw: rawWord,
      normalized,
      answerWord: result.match.word,
      difficulty: result.match.difficulty,
      points,
      foundAt: Date.now(),
    };

    const updatedWords = [...existingPlayerData.words, newWordEntry];
    const updatedScore = existingPlayerData.score + points;

    tx.update(roundRef, {
      [`players.${playerKey}`]: {
        username,
        words: updatedWords,
        score: updatedScore,
      },
    });

    const playerRef = doc(db, "rooms", code, "players", playerKey);
    tx.update(playerRef, { score: increment(points) });

    return { accepted: true, points, matchedWord: result.match.word };
  });
}

export async function endRound(code, roundIndex) {
  const roundRef = doc(db, "rooms", code, "rounds", String(roundIndex));
  const roomRef = doc(db, "rooms", code);

  await runTransaction(db, async (tx) => {
    const roundSnap = await tx.get(roundRef);
    if (!roundSnap.exists()) return;
    if (roundSnap.data().status !== "playing") return; // dÃ©jÃ  clÃ´turÃ©e
    tx.update(roundRef, { status: "ended" });
    tx.update(roomRef, { status: "round_result" });
  });
}

export async function nextRoundOrFinish(code) {
  const roomRef = doc(db, "rooms", code);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;
  const room = roomSnap.data();
  const nextIndex = room.currentRoundIndex + 1;

  if (nextIndex >= (room.categoryIds || []).length) {
    await updateDoc(roomRef, { status: "finished" });
    return;
  }

  await updateDoc(roomRef, {
    status: "playing",
    currentRoundIndex: nextIndex,
  });
  await createRoundDoc(code, nextIndex, room.categoryIds[nextIndex]);
}

/**
 * Enregistre les statistiques de fin de partie (victoires/dÃ©faites/score) une seule fois.
 * ProtÃ©gÃ© par un flag resultsRecorded sur le document du salon.
 */
export async function recordFinalResults(code, players) {
  const roomRef = doc(db, "rooms", code);

  const shouldRecord = await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) return false;
    const room = roomSnap.data();
    if (room.status !== "finished" || room.resultsRecorded) return false;
    tx.update(roomRef, { resultsRecorded: true });
    return true;
  });

  if (!shouldRecord) return;

  const maxScore = Math.max(...players.map((p) => p.score || 0));
  await Promise.all(
    players.map((p) =>
      recordGameResult(p.username, {
        isWinner: (p.score || 0) === maxScore,
        scoreGained: p.score || 0,
      })
    )
  );
}

export { ROUND_DURATION_MS, DEFAULT_ROUND_COUNT };
