const AVATAR_COLORS = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635",
  "#34D399", "#22D3EE", "#60A5FA", "#A78BFA",
  "#F472B6", "#FB7185", "#4ADE80", "#38BDF8",
];

// Génère une couleur stable à partir d'un pseudo (simple hash)
export function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initialForName(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  );
}
