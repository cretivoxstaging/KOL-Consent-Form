/**
 * Utility to auto-translate Indonesian Tema & Deskripsi Konten into English
 * for the 2-column A4 Consent Form PDF (Indonesian & English).
 */

const THEME_DICTIONARY: Record<string, string> = {
  "coba tebak - bahasa": "Guess The Country - Language Edition",
  "coba tebak bahasa": "Guess The Country - Language Edition",
  "coba tebak": "Guessing Game Series",
  "guess the country": "Guess The Country",
  "bicara masa depan": "Future Talk Podcast",
  "podcast bicara masa depan": "Future Talk Podcast",
  "food review": "Food Review & Culinary Storytelling",
};

const PHRASE_DICTIONARY: Array<[RegExp, string]> = [
  [/coba tebak adalah konten hiburan yang menghadirkan beberapa narasumber untuk menebak asal talent dari bermacam-macam latar belakang/gi, "Guess The Country is an entertainment content series that brings together participants from diverse backgrounds for a fun guessing experience"],
  [/konten review makanan dengan storytelling/gi, "Culinary review content presented through engaging storytelling"],
  [/coba tebak adalah konten hiburan/gi, "Guess The Country is an entertainment-based content series"],
  [/konten hiburan yang menghadirkan/gi, "entertainment-based content series that brings together"],
  [/beberapa narasumber/gi, "several guest participants"],
  [/menebak asal talent/gi, "guessing the background of the talent"],
  [/bermacam-macam latar belakang/gi, "diverse backgrounds"],
  [/konten hiburan/gi, "entertainment content"],
  [/podcast bincang-bincang/gi, "talk show podcast"],
  [/wawancara mendalam/gi, "in-depth interview"],
  [/seputar kehidupan/gi, "about life and culture"],
  [/memberikan kebahagiaan/gi, "provide happiness and joy"],
  [/menambah wawasan/gi, "add insights and perspectives"],
  [/sudut pandang/gi, "perspectives"],
  [/yang ingin terus berkembang/gi, "to those who want to continue to grow"],
  [/pengambilan gambar/gi, "shooting session"],
  [/proses perekaman/gi, "recording process"],
  [/acara/gi, "event / show"],
  [/episode/gi, "episode"],
];

const WORD_DICTIONARY: Record<string, string> = {
  "konten": "content",
  "hiburan": "entertainment",
  "narasumber": "participant",
  "menebak": "guessing",
  "asal": "origin",
  "latar": "background",
  "belakang": "background",
  "bincang": "talk",
  "bincang-bincang": "talk-show",
  "kehidupan": "life",
  "kebahagiaan": "happiness",
  "wawasan": "insight",
  "sudut": "perspective",
  "pandang": "view",
  "wawancara": "interview",
  "rekaman": "recording",
  "bahasa": "language",
  "dunia": "world",
  "internasional": "international",
  "makanan": "food",
  "review": "review",
};

export function autoTranslateTheme(indonesianTheme: string): string {
  if (!indonesianTheme || !indonesianTheme.trim()) return "";
  const normalized = indonesianTheme.trim().toLowerCase();
  
  if (THEME_DICTIONARY[normalized]) {
    return THEME_DICTIONARY[normalized];
  }

  let translated = indonesianTheme;
  translated = translated.replace(/coba tebak/gi, "Guessing Game");
  translated = translated.replace(/bahasa/gi, "Language Edition");
  translated = translated.replace(/podcast/gi, "Podcast Series");
  translated = translated.replace(/spesial/gi, "Special Edition");
  translated = translated.replace(/episode/gi, "Episode");

  return translated;
}

export function autoTranslateDescription(indonesianDesc: string): string {
  if (!indonesianDesc || !indonesianDesc.trim()) return "";
  const normalized = indonesianDesc.trim();

  let translated = normalized;

  for (const [pattern, replacement] of PHRASE_DICTIONARY) {
    translated = translated.replace(pattern, replacement);
  }

  if (translated !== normalized) {
    return translated;
  }

  const words = normalized.split(/\s+/);
  const translatedWords = words.map((w) => {
    const cleanWord = w.toLowerCase().replace(/[.,!?;:]/g, "");
    if (WORD_DICTIONARY[cleanWord]) {
      const punctuation = w.slice(cleanWord.length);
      return WORD_DICTIONARY[cleanWord] + punctuation;
    }
    return w;
  });

  return translatedWords.join(" ");
}
