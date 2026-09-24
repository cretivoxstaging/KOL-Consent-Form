import { NextResponse } from "next/server";
import { autoTranslateTheme, autoTranslateDescription } from "@/lib/translate";

// In-memory cache to make repeated translation requests instantaneous (0ms)
const translationCache = new Map<string, string>();

async function translateWithGoogle(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const fullTranslation = data[0]
          .map((seg: any) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
          .join("")
          .trim();
        if (fullTranslation) {
          return fullTranslation;
        }
      }
    }
  } catch {
    // google error or timeout
  }
  return null;
}

async function translateWithMyMemory(text: string): Promise<string | null> {
  try {
    const query = text.length > 450 ? text.slice(0, 450) : text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=id|en&de=admin@cretivox.com`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const json = await res.json();
      const status = String(json.responseStatus);
      const result = json.responseData?.translatedText;
      if (
        status === "200" &&
        result &&
        typeof result === "string" &&
        result.trim() &&
        !result.toUpperCase().includes("QUERY LENGTH LIMIT") &&
        !result.toUpperCase().includes("MYMEMORY WARNING") &&
        !result.toUpperCase().includes("INVALID")
      ) {
        return result.trim();
      }
    }
  } catch {
    // mymemory error or timeout
  }
  return null;
}

async function translateChunk(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length < 2) return trimmed;

  // Check cache first
  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed)!;
  }

  // Preserve bullet symbols
  if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
    const symbol = trimmed[0];
    const rest = trimmed.slice(1).trim();
    const translatedRest = await translateChunk(rest);
    const result = `${symbol} ${translatedRest}`;
    translationCache.set(trimmed, result);
    return result;
  }

  // 1. Try Google Translate first (super fast 0.3s, accurate, handles full sentences)
  const gResult = await translateWithGoogle(trimmed);
  if (gResult) {
    translationCache.set(trimmed, gResult);
    return gResult;
  }

  // 2. Try MyMemory API as secondary
  if (trimmed.length > 350) {
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const transSentences = await Promise.all(sentences.map((s) => translateChunk(s)));
      const result = transSentences.join(" ");
      translationCache.set(trimmed, result);
      return result;
    }
  }

  const mResult = await translateWithMyMemory(trimmed);
  if (mResult) {
    translationCache.set(trimmed, mResult);
    return mResult;
  }

  // 3. Fallback to local dictionary only if both remote APIs fail (DO NOT cache failure)
  const fallback = autoTranslateDescription(trimmed);
  return fallback || trimmed;
}

export async function POST(req: Request) {
  try {
    const { text, type } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ translatedText: "" });
    }

    if (type === "theme") {
      const translated = await translateChunk(text);
      return NextResponse.json({ translatedText: translated || autoTranslateTheme(text) });
    }

    // 1. Normalize HTML tags and clean internal editor attributes
    let normalized = text
      .replace(/<i\b[^>]*>(.*?)<\/i>/gi, "*$1*")
      .replace(/<em\b[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<b\b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<u\b[^>]*>(.*?)<\/u>/gi, "$1")
      .replace(/&nbsp;/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<div\b[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p\b[^>]*>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n")
      .replace(/<\/?ul\b[^>]*>/gi, "\n")
      .replace(/<\/?ol\b[^>]*>/gi, "\n")
      .replace(/\\n/g, "\n");

    const rawLines = normalized.split("\n");
    const cleanLines = rawLines.map((l) => l.trim()).filter(Boolean);

    const translatedLines = await Promise.all(cleanLines.map((line) => translateChunk(line)));
    const translatedText = translatedLines.join("\n");

    return NextResponse.json({ translatedText, source: "neural-translate" });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json({ translatedText: "", error: "Fallback used" });
  }
}
