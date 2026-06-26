import { colorForName, initialForName } from "../lib/avatar";

export default function Avatar({ username, color, size = 40 }) {
  const bg = color || colorForName(username || "?");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        color: "#0b0f17",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.45,
        flexShrink: 0,
      }}
    >
      {initialForName(username)}
    </div>
  );
}
