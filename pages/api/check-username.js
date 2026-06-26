// Route API Next.js : valide le format d'un pseudo avant création/sélection de profil.
// Conformément à la stack imposée, toute logique "serveur" passe par les API routes Next.js ;
// la persistance et le temps réel restent gérés côté client via le SDK Firebase Firestore
// (aucun mot de passe, aucune authentification classique, salons en accès libre).

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { username } = req.body || {};

  if (!username || typeof username !== "string") {
    return res.status(400).json({ valid: false, reason: "Pseudo manquant" });
  }

  const trimmed = username.trim();

  if (trimmed.length < 2) {
    return res.status(200).json({ valid: false, reason: "Pseudo trop court (2 caractères minimum)" });
  }
  if (trimmed.length > 16) {
    return res.status(200).json({ valid: false, reason: "Pseudo trop long (16 caractères maximum)" });
  }
  if (!/^[a-zA-Z0-9À-ÿ _-]+$/.test(trimmed)) {
    return res.status(200).json({ valid: false, reason: "Caractères non autorisés" });
  }

  return res.status(200).json({ valid: true, username: trimmed });
}
