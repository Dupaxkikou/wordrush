import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Avatar from "../../components/Avatar";
import Timer from "../../components/Timer";
import { getCategoryById } from "../../lib/categories";
import {
  listenRoom,
  listenPlayers,
  listenRound,
  startGame,
  submitWord,
  endRound,
  nextRoundOrFinish,
  recordFinalResults,
  leaveRoom,
} from "../../lib/firestoreHelpers";

export default function RoomPage() {
  const router = useRouter();
  const { code } = router.query;

  const [username, setUsername] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(null);
  const [wordInput, setWordInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const roundEndTriggered = useRef(false);
  const resultsRecorded = useRef(false);

  useEffect(() => {
    const u = localStorage.getItem("wordrush_username");
    if (!u) {
      router.replace("/");
      return;
    }
    setUsername(u);
  }, [router]);

  useEffect(() => {
    if (!code) return;
    const unsub = listenRoom(code, (r) => {
      if (!r) {
        setError("Ce salon n'existe plus.");
      }
      setRoom(r);
    });
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const unsub = listenPlayers(code, setPlayers);
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (!code || !room || room.currentRoundIndex < 0) {
      setRound(null);
      return;
    }
    roundEndTriggered.current = false;
    const unsub = listenRound(code, room.currentRoundIndex, setRound);
    return () => unsub();
  }, [code, room?.currentRoundIndex]);

  useEffect(() => {
    if (room?.status === "finished" && players.length > 0 && !resultsRecorded.current) {
      resultsRecorded.current = true;
      recordFinalResults(code, players).catch(() => {});
    }
  }, [room?.status, players, code]);

  if (!username || !room) {
    return (
      <div className="container">
        {error && <div className="card error-text">{error}</div>}
      </div>
    );
  }

  const isHost = room.hostUsername === username;
  const me = players.find((p) => p.username.toLowerCase() === username.toLowerCase());

  async function handleStart() {
    setError("");
    try {
      await startGame(code);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmitWord(e) {
    e.preventDefault();
    if (!wordInput.trim() || !round) return;
    const raw = wordInput;
    setWordInput("");
    try {
      const result = await submitWord(code, room.currentRoundIndex, username, raw);
      if (result.accepted) {
        setFeedback({ ok: true, msg: `+${result.points} pt${result.points > 1 ? "s" : ""} : ${result.matchedWord}` });
      } else {
        setFeedback({ ok: false, msg: reasonLabel(result.reason) });
      }
      setTimeout(() => setFeedback(null), 1500);
    } catch (err) {
      setFeedback({ ok: false, msg: "Erreur" });
    }
  }

  function handleTimerExpire() {
    if (roundEndTriggered.current) return;
    roundEndTriggered.current = true;
    endRound(code, room.currentRoundIndex).catch(() => {});
  }

  async function handleNextRound() {
    try {
      await nextRoundOrFinish(code);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave() {
    await leaveRoom(code, username);
    router.push("/rooms");
  }

  return (
    <div className="container">
      <div className="row-between">
        <h1 className="title" style={{ marginBottom: 0 }}>
          Salon {room.code}
        </h1>
        <button className="btn btn-secondary" onClick={handleLeave}>
          Quitter
        </button>
      </div>
      <p className="subtitle">Hôte : {room.hostUsername}</p>

      {room.status === "lobby" && (
        <LobbyView
          room={room}
          players={players}
          isHost={isHost}
          onStart={handleStart}
        />
      )}

      {room.status === "playing" && round && (
        <PlayingView
          round={round}
          players={players}
          username={username}
          wordInput={wordInput}
          setWordInput={setWordInput}
          onSubmit={handleSubmitWord}
          feedback={feedback}
          onTimerExpire={handleTimerExpire}
        />
      )}

      {room.status === "round_result" && round && (
        <RoundResultView
          round={round}
          players={players}
          isHost={isHost}
          isLastRound={room.currentRoundIndex >= (room.roundCount || 5) - 1}
          onNext={handleNextRound}
        />
      )}

      {room.status === "finished" && (
        <FinishedView players={players} onBack={() => router.push("/rooms")} />
      )}

      {error && <div className="card error-text">{error}</div>}
    </div>
  );
}

function reasonLabel(reason) {
  switch (reason) {
    case "déjà trouvé":
      return "Déjà proposé";
    case "réponse déjà comptée":
      return "Réponse déjà comptée";
    case "temps écoulé":
      return "Trop tard !";
    case "mot invalide":
      return "Pas dans la catégorie";
    default:
      return "Mot refusé";
  }
}

function LobbyView({ room, players, isHost, onStart }) {
  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Code du salon</h3>
        <div className="row-between">
          <span className="badge" style={{ fontSize: 18, padding: "8px 16px" }}>
            {room.code}
          </span>
          <span style={{ color: "#9ca3af", fontSize: 13 }}>
            Partage ce code à tes amis
          </span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Joueurs ({players.length})</h3>
        {players.map((p) => (
          <div key={p.username} className="player-row">
            <Avatar username={p.username} color={p.color} />
            <div style={{ fontWeight: 600 }}>{p.username}</div>
            {p.username === room.hostUsername && (
              <span className="badge">Hôte</span>
            )}
          </div>
        ))}
      </div>

      {isHost ? (
        <button
          className="btn"
          style={{ width: "100%" }}
          onClick={onStart}
          disabled={players.length < 2}
        >
          {players.length < 2 ? "En attente d'au moins 2 joueurs" : "🚀 Démarrer la partie"}
        </button>
      ) : (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>
          En attente que l'hôte démarre la partie...
        </p>
      )}
    </>
  );
}

function PlayingView({
  round,
  players,
  username,
  wordInput,
  setWordInput,
  onSubmit,
  feedback,
  onTimerExpire,
}) {
  const category = getCategoryById(round.categoryId);
  const myWords = round.players?.[username.toLowerCase()]?.words || [];

  return (
    <>
      <div className="category-banner">
        {category ? category.name : "Catégorie"}
      </div>

      <div className="row-between" style={{ marginBottom: 16 }}>
        <Timer endsAtMs={round.endsAtMs} onExpire={onTimerExpire} />
        <div className="row">
          {players.slice(0, 6).map((p) => (
            <div key={p.username} style={{ textAlign: "center" }}>
              <Avatar username={p.username} color={p.color} size={32} />
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.score || 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <form onSubmit={onSubmit} className="row">
          <input
            type="text"
            autoFocus
            placeholder="Tape un mot et valide..."
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
          />
          <button className="btn" type="submit">
            Valider
          </button>
        </form>
        {feedback && (
          <div
            style={{
              marginTop: 10,
              color: feedback.ok ? "#4ade80" : "#f87171",
              fontWeight: 600,
            }}
          >
            {feedback.msg}
          </div>
        )}
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Tes réponses trouvées</h4>
        {myWords.length === 0 && (
          <p style={{ color: "#9ca3af", margin: 0 }}>Aucune réponse encore...</p>
        )}
        {myWords.map((w, i) => (
          <span key={i} className={`word-chip points-${w.points}`}>
            {w.answerWord} · +{w.points}
          </span>
        ))}
      </div>
    </>
  );
}

function RoundResultView({ round, players, isHost, isLastRound, onNext }) {
  const category = getCategoryById(round.categoryId);
  const sortedPlayers = [...players].sort(
    (a, b) =>
      (round.players?.[b.username.toLowerCase()]?.score || 0) -
      (round.players?.[a.username.toLowerCase()]?.score || 0)
  );

  return (
    <>
      <div className="category-banner" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
        Résultats : {category ? category.name : "Catégorie"}
      </div>

      <div className="card">
        {sortedPlayers.map((p) => {
          const data = round.players?.[p.username.toLowerCase()];
          const words = data?.words || [];
          const roundScore = data?.score || 0;
          return (
            <div key={p.username} style={{ marginBottom: 14 }}>
              <div className="row-between">
                <div className="row">
                  <Avatar username={p.username} color={p.color} size={32} />
                  <span style={{ fontWeight: 600 }}>{p.username}</span>
                </div>
                <span className="badge">+{roundScore} pts cette manche</span>
              </div>
              <div style={{ marginTop: 6 }}>
                {words.length === 0 ? (
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>Aucune réponse</span>
                ) : (
                  words.map((w, i) => (
                    <span key={i} className={`word-chip points-${w.points}`}>
                      {w.answerWord} · +{w.points}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Score total</h4>
        {[...players]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .map((p) => (
            <div key={p.username} className="player-row">
              <Avatar username={p.username} color={p.color} size={28} />
              <span style={{ flex: 1 }}>{p.username}</span>
              <strong>{p.score || 0}</strong>
            </div>
          ))}
      </div>

      {isHost ? (
        <button className="btn" style={{ width: "100%" }} onClick={onNext}>
          {isLastRound ? "🏁 Voir le classement final" : "➡️ Manche suivante"}
        </button>
      ) : (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>
          En attente que l'hôte lance la suite...
        </p>
      )}
    </>
  );
}

function FinishedView({ players, onBack }) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sorted[0];

  return (
    <>
      <div className="category-banner" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
        🏆 {winner ? `${winner.username} gagne la partie !` : "Partie terminée"}
      </div>

      <div className="card">
        {sorted.map((p, i) => (
          <div key={p.username} className="player-row">
            <span style={{ width: 24, fontWeight: 800, color: "#9ca3af" }}>
              {i + 1}
            </span>
            <Avatar username={p.username} color={p.color} />
            <span style={{ flex: 1, fontWeight: 600 }}>{p.username}</span>
            <strong style={{ fontSize: 18 }}>{p.score || 0}</strong>
          </div>
        ))}
      </div>

      <button className="btn" style={{ width: "100%" }} onClick={onBack}>
        Retour aux salons
      </button>
    </>
  );
}
