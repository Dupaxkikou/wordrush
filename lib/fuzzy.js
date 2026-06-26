// Normalise une chaîne : minuscules, suppression des accents, trim, suppression espaces multiples
export function normalize(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/[^a-z0-9\s-]/g, "") // garde lettres/chiffres/espaces/tirets
    .trim()
    .replace(/\s+/g, " ");
}

// Distance de Levenshtein classique
export function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Tolérance de faute de frappe en fonction de la longueur du mot
function toleranceForLength(len) {
  if (len <= 3) return 0; // mots très courts : exact uniquement
  if (len <= 6) return 1;
  return 2;
}

/**
 * Cherche la meilleure correspondance entre un mot saisi et la liste de réponses valides
 * d'une catégorie. Retourne { match: {word, difficulty}, distance } ou null.
 */
export function findBestMatch(input, answers) {
  const normInput = normalize(input);
  if (!normInput) return null;

  let best = null;
  let bestDistance = Infinity;

  for (const answer of answers) {
    const candidates = [answer.word, ...(answer.aliases || [])];
    for (const candidate of candidates) {
      const normCandidate = normalize(candidate);
      const tol = toleranceForLength(Math.max(normInput.length, normCandidate.length));
      const dist = levenshtein(normInput, normCandidate);
      if (dist <= tol && dist < bestDistance) {
        bestDistance = dist;
        best = answer;
      }
    }
  }

  if (!best) return null;
  return { match: best, distance: bestDistance };
}

export function pointsForDifficulty(difficulty) {
  switch (difficulty) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
    default:
      return 1;
  }
}
