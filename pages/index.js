import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Avatar from "../components/Avatar";
import {
  getOrCreateProfile,
  listenAllProfiles,
  listenPublicRooms,
  joinRoom,
} from "../lib/firestoreHelpers";

export default function Home() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = listenAllProfiles(setProfiles);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenPublicRooms(setRooms);
    return () => unsub();
  }, []);

  function selectProfile(username) {
    localStorage.setItem("wordrush_username", username);
    router.push("/rooms");
  }

  async function handleJoinRoomDirect(code) {
    setError("");
    const username = localStorage.getItem("wordrush_username");
    if (!username) {
      setError("Choisis ou crée d'abord un pseudo ci-dessus pour rejoindre un salon.");
      return;
    }
    try {
      await joinRoom(code, username);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err.message || "Impossible de rejoindre ce salon.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    const name = newName.trim();
    if (!name) return;
    if (name.length > 16) {
      setError("Le pseudo doit faire 16 caractères maximum.");
      return;
    }
    setLoading(true);
    try {
      const profile = await getOrCreateProfile(name);
      selectProfile(profile.username);
    } catch (err) {
      setError(err.message || "Erreur lors de la création du profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 className="title">🧠 WordRush</h1>
      <p className="subtitle">
        Trouve un max de mots avant tout le monde. Joue entre amis, sans
        compte, sans prise de tête.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Nouveau pseudo</h3>
        <form onSubmit={handleCreate} className="row">
          <input
            type="text"
            placeholder="Ton pseudo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={16}
          />
          <button className="btn" type="submit" disabled={loading || !newName.trim()}>
            {loading ? "..." : "Jouer"}
          </button>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Salons publics ouverts</h3>
        {rooms.length === 0 && (
          <p style={{ color: "#9ca3af", margin: 0 }}>
            Aucun salon ouvert pour le moment.
          </p>
        )}
        {rooms.map((room) => (
          <div key={room.id} className="player-row">
            <Avatar username={room.hostUsername} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                Salon de {room.hostUsername}{" "}
                <span className="badge">{room.code}</span>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {room.playerCount || 0} joueur{(room.playerCount || 0) > 1 ? "s" : ""} · {room.roundCount} manches
              </div>
            </div>
            <button className="btn" onClick={() => handleJoinRoomDirect(room.code)}>
              Rejoindre
            </button>
          </div>
        ))}
        {error && <div className="error-text">{error}</div>}
      </div>

      {profiles.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Profils existants</h3>
          {profiles.map((p) => (
            <button
              key={p.username}
              onClick={() => selectProfile(p.username)}
              className="player-row"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Avatar username={p.username} color={p.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.username}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {p.wins || 0} victoires · {p.gamesPlayed || 0} parties
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
