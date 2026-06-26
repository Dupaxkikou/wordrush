import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebaseClient";
import Avatar from "../components/Avatar";

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("wordrush_username");
    if (!u) {
      router.replace("/");
      return;
    }
    setUsername(u);
  }, [router]);

  useEffect(() => {
    if (!username) return;
    const ref = doc(db, "profiles", username.toLowerCase());
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [username]);

  if (!username || !profile) return <div className="container" />;

  const avgScore =
    profile.gamesPlayed > 0
      ? Math.round((profile.totalScore || 0) / profile.gamesPlayed)
      : 0;

  return (
    <div className="container">
      <div className="row-between">
        <h1 className="title" style={{ marginBottom: 0 }}>
          Mon profil
        </h1>
        <button className="btn btn-secondary" onClick={() => router.push("/rooms")}>
          Retour
        </button>
      </div>

      <div className="card row" style={{ marginTop: 16 }}>
        <Avatar username={profile.username} color={profile.color} size={56} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{profile.username}</div>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            {profile.gamesPlayed || 0} partie{(profile.gamesPlayed || 0) > 1 ? "s" : ""} jouée{(profile.gamesPlayed || 0) > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="card">
        <StatRow label="Victoires" value={profile.wins || 0} />
        <StatRow label="Défaites" value={profile.losses || 0} />
        <StatRow label="Score moyen" value={avgScore} />
        <StatRow label="Score total" value={profile.totalScore || 0} />
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="player-row">
      <span style={{ flex: 1, color: "#9ca3af" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
