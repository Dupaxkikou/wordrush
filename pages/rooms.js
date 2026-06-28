import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Avatar from "../components/Avatar";
import {
  listenPublicRooms,
  createRoom,
  joinRoom,
  joinGeneralRoom,
  listenRoom,
  GENERAL_ROOM_CODE,
} from "../lib/firestoreHelpers";

export default function Rooms() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [generalRoom, setGeneralRoom] = useState(null);
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

  useEffect(() => {
    const unsub = listenRoom(GENERAL_ROOM_CODE, setGeneralRoom);
    return () => unsub();
  }, []);

  async function handleJoinGeneral() {
    setError("");
    setBusy(true);
    try {
      await joinGeneralRoom(username);
      router.push(`/room/${GENERAL_ROOM_CODE}`);
    } catch (err) {
      setError(err.message || "Impossible de rejoindre le salon général.");
    } finally {
      setBusy(false);
    }
  }

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

      <div className="card general-room-card">
        <div className="row-between">
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>🌍 Salon Général</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Toujours ouvert, sans code. {generalRoom?.playerCount || 0} joueur
              {(generalRoom?.playerCount || 0) > 1 ? "s" : ""} présent
              {(generalRoom?.playerCount || 0) > 1 ? "s" : ""}.
            </p>
          </div>
          <button className="btn" onClick={handleJoinGeneral} disabled={busy}>
            Rejoindre
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn" onClick={handleCreateRoom} disabled={busy}>
            ➕ Créer un salon avec code
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
        <h3 style={{ marginTop: 0 }}>Salons avec code en attente de joueurs</h3>
        {rooms.filter((r) => r.code !== GENERAL_ROOM_CODE).length === 0 && (
          <p style={{ color: "#9ca3af" }}>
            Aucun salon ouvert pour le moment. Crée le premier !
          </p>
        )}
        {rooms
          .filter((r) => r.code !== GENERAL_ROOM_CODE)
          .map((room) => (
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
