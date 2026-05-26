// Liste de mots-clés interdits — modération automatique des annonces.
// Utilisée à la publication et à la modification d'annonces.
export const FORBIDDEN_KEYWORDS: string[] = [
  // Contenus non-islamiques / contraires à l'éthique
  "alcool", "vin", "biere", "bière", "porc", "jambon",
  "tarot", "horoscope", "astrologie", "magie noire", "sorcellerie",
  "nudite", "nudité", "erotique", "érotique", "pornographie", "porno",
  // Discours de haine / takfir / fitna
  "kafir", "kufr", "takfir", "mécréant traître", "mort aux",
  "haine", "raciste", "racisme", "nazi",
  // Polémiques excessives
  "secte", "khawarij maudit", "rafidite chien",
  // Fraude / publicité commerciale
  "arnaque", "ponzi", "crypto pump", "investissement garanti",
  "viagra", "cialis", "casino", "paris sportifs", "loterie",
  "contactez whatsapp +", "telegram t.me/",
];

// Image par défaut pour remplacer une photo modérée
export const DEFAULT_BOOK_IMAGE = "/og-cover.jpg";

/**
 * Vérifie si un texte contient un mot-clé interdit.
 * @returns le mot trouvé, ou null si tout est OK.
 */
export function checkForbidden(...texts: (string | undefined | null)[]): string | null {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack.trim()) return null;
  for (const word of FORBIDDEN_KEYWORDS) {
    const w = word.toLowerCase();
    if (haystack.includes(w)) return word;
  }
  return null;
}
