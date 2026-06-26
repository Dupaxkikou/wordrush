import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Avatar from "../components/Avatar";
import {
  listenPublicRooms,
  createRoom,
  joinRoom,
} from "../lib/firestoreHelpers";

export default function Rooms() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("wordrush_username");
    if (!u) {
      router.replace("/");
      return;
    }
    setUsername(u);
  }, [router]);

  useEffect(() => {
    const unsub = listenPublicRooms(setRooms);
    return () => unsub();
  }, []);

  async function handleCreateRoom() {
    setError("");
    setBusy(true);
    try {
      const code = await createRoom(username);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err.message || "Impossible de créer le salon.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinByCode(e) {
    e.preventDefault();
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      await joinRoom(code, username);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err.message || "Salon introuvable.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinRoom(code) {
    setError("");
    setBusy(true);
    try {
      await joinRoom(code, username);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err.message || "Impossible de rejoindre ce salon.");
    } finally {
      setBusy(false);
    }
  }

  function changeProfile() {
    localStorage.removeItem("wordrush_username");
    router.push("/");
  }

  if (!username) return null;

  return (
    <div className="container">
      <div className="row-between">
        <h1 className="title" style={{ marginBottom: 0 }}>
          Salons publics
        </h1>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => router.push("/profile")}>
            Mon profil
          </button>
          <button className="btn btn-secondary" onClick={changeProfile}>
            Changer de profil
          </button>
        </div>
      </div>
      <p className="subtitle">Connecté en tant que {username}</p>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn" onClick={handleCreateRoom} disabled={busy}>
            ➕ Créer un salon public
          </button>
        </div>
        <form onSubmit={handleJoinByCode} className="row">
          <input
            type="text"
            placeholder="Code du salon (ex: AB12C)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button className="btn btn-secondary" type="submit" disabled={busy}>
            Rejoindre
          </button>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Salons en attente de joueurs</h3>
        {rooms.length === 0 && (
          <p style={{ color: "#9ca3af" }}>
            Aucun salon ouvert pour le moment. Crée le premier !
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
                {room.roundCount} manches
              </div>
            </div>
            <button
              className="btn"
              onClick={() => handleJoinRoom(room.code)}
              disabled={busy}
            >
              Rejoindre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
