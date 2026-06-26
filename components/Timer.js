import { useEffect, useState } from "react";

export default function Timer({ endsAtMs, onExpire }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !expired) {
        setExpired(true);
        onExpire && onExpire();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [endsAtMs, expired, onExpire]);

  const danger = remaining <= 10;

  return (
    <div
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: danger ? "#f87171" : "#e5e7eb",
        minWidth: 60,
        textAlign: "center",
      }}
    >
      {remaining}s
    </div>
  );
}
