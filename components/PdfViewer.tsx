"use client";
import { autoTranslateTheme, autoTranslateDescription } from "@/lib/translate";
import { CRETIVOX_LOGO_BASE64 } from "@/lib/logoBase64";
import { downloadOrSharePdf } from "@/lib/pdfDownload";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
} from "lucide-react";

export interface PdfViewerHandle {
  downloadPdf: () => Promise<void>;
  generatePdfDataUrl: () => Promise<string | null>;
  generatePdfFile: (filename?: string) => Promise<File | null>;
}

interface A4DocumentViewerProps {
  fee?: number | string;
  contentTheme?: string;
  contentDescription?: string;
  publishedPlatforms?: string[];
  translatedTheme?: string;
  translatedDesc?: string;
  talentName?: string;
  notesHtml?: string;
  signatureImage?: string | null;
  currentDate?: string;
  isBlank?: boolean;
  twoPagesDefault?: boolean;
  maxHeight?: string;
  isModal?: boolean;
  onClose?: () => void;
  lang?: "ID" | "EN";
  initialZoom?: number;
  aiConsent?: boolean;
  cretivoxName?: string;
  cretivoxSignatureImage?: string | null;
  showDownload?: boolean;
  isLoading?: boolean;
}

// Ekstraksi array published platforms dari string HTML / deskripsi jika tersimpan via comment
function parsePublishedPlatforms(rawHtml?: string): string[] {
  if (!rawHtml) return [];
  const match = rawHtml.match(/<!--\s*published:\s*([\s\S]*?)\s*-->/i);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p).trim()).filter(Boolean);
    } catch {
      // fallback
    }
  }
  return [];
}

// Membersihkan komentar marker published dan prefix "Deskripsi Konten:" yang mungkin sudah terlanjur diketik manual
function cleanDescriptionText(raw?: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/<!--\s*published:\s*[\s\S]*?\s*-->/gi, "").trim();
  cleaned = cleaned.replace(/^(<p[^>]*>)?\s*(<strong>)?\s*(Deskripsi|Content)\s*(Konten|Description)\s*:?\s*(<\/strong>)?\s*(<\/p>)?/i, "").trim();
  return cleaned;
}

// Menghitung estimasi jumlah baris visual yang dirender (termasuk text-wrapping di kolom A4 selebar ~250px)
function estimateRenderedLines(text: string): number {
  if (!text || !text.trim()) return 0;
  const clean = text.replace(/<[^>]+>/g, "\n").replace(/\\n/g, "\n");
  const paragraphs = clean.split("\n").filter((p) => p.trim().length > 0);
  let totalLines = 0;
  for (const p of paragraphs) {
    const trimmed = p.trim();
    // Di kolom 2-kolom A4 (lebar ~250px), 1 baris rata-rata memuat 38-40 karakter
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
    const charsPerLine = isBullet ? 36 : 40;
    const linesInParagraph = Math.max(1, Math.ceil(trimmed.length / charsPerLine));
    totalLines += linesInParagraph;
  }
  return totalLines;
}

interface DescriptionChunk {
  isBullet: boolean;
  text: string;
  linesCount: number;
}

// Menghitung batas baris dan struktur halaman secara dinamis:
// - maxLines <= 10: 2 halaman (Pasal 1-7 muat di Halaman 1)
// - maxLines <= 26: 3 halaman (Halaman 1 muat seluruh deskripsi, Halaman 2 berisi Pasal 1-7)
// - maxLines <= 48: 3 halaman (Halaman 1 muat 26 baris pertama, Halaman 2 muat sisa deskripsi + Pasal 1-7)
// - maxLines > 48: 4+ halaman (Deskripsi berlanjut ke halaman baru seperti Microsoft Word)
function getPageLineLimits(maxLines: number, publishedCount: number = 0): {
  limits: number[];
  totalPages: number;
  clausesOnPage: number;
} {
  const publishedLines = publishedCount > 0 ? publishedCount + 2 : 0;
  const p1FullCapacity = Math.max(16, 36 - publishedLines);
  const p1WithClausesCapacity = Math.max(6, 13 - publishedLines);
  const middleFullCapacity = 45;
  const middleWithClausesCapacity = 26;

  // Case 1: Deskripsi pendek + Pasal 1-7 muat di Halaman 1 (Total 2 Halaman)
  if (maxLines <= p1WithClausesCapacity) {
    return {
      limits: [p1WithClausesCapacity],
      totalPages: 2,
      clausesOnPage: 1,
    };
  }

  // Case 2: Deskripsi muat penuh di Halaman 1, Pasal 1-7 di Halaman 2 (Total 3 Halaman)
  if (maxLines <= p1FullCapacity) {
    return {
      limits: [p1FullCapacity],
      totalPages: 3,
      clausesOnPage: 2,
    };
  }

  // Case 3: Deskripsi berlanjut ke halaman-halaman berikutnya
  const limits = [p1FullCapacity];
  let remaining = maxLines - p1FullCapacity;

  while (true) {
    // Jika sisa deskripsi bisa muat berdampingan dengan Pasal 1-7 di halaman yang sama
    if (remaining <= middleWithClausesCapacity) {
      limits.push(middleWithClausesCapacity);
      const clausesOnPage = limits.length;
      return {
        limits,
        totalPages: clausesOnPage + 1,
        clausesOnPage,
      };
    }

    // Jika sisa deskripsi bisa muat penuh di satu middle page tanpa pasal
    if (remaining <= middleFullCapacity) {
      limits.push(middleFullCapacity);
      const clausesOnPage = limits.length + 1;
      return {
        limits,
        totalPages: clausesOnPage + 1,
        clausesOnPage,
      };
    }

    // Jika deskripsi masih sangat panjang, penuhi middle page ini dan lanjutkan
    limits.push(middleFullCapacity);
    remaining -= middleFullCapacity;
  }
}

function formatInlineHtml(rawText: string = ""): string {
  if (!rawText) return "";
  return rawText
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^\*])\*(?!\*)(.+?)(?!\*)/g, "$1<i>$2</i>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}

// Memecah teks deskripsi menjadi potongan-potongan halaman sesuai batas baris (Word-like pagination)
function paginateDescription(
  text: string,
  pageLineLimits: number[]
): DescriptionChunk[][] {
  if (!text || !text.trim()) return [[]];

  const norm = text
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div\b[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p\b[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/?ul\b[^>]*>/gi, "\n")
    .replace(/<\/?ol\b[^>]*>/gi, "\n")
    .replace(/\\n/g, "\n");

  const rawParagraphs = norm.split("\n");
  const pages: DescriptionChunk[][] = [];
  let currentPageItems: DescriptionChunk[] = [];
  let currentLinesOnPage = 0;
  let pageIdx = 0;
  let maxLinesForCurrentPage = pageLineLimits[0] || 36;

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const isBullet =
      trimmed.startsWith("- ") ||
      trimmed.startsWith("• ") ||
      trimmed.startsWith("* ");
    const cleanText = isBullet ? trimmed.replace(/^[-•*]\s+/, "") : trimmed;
    const cpl = isBullet ? 40 : 45;

    const words = cleanText.split(/\s+/);
    let curSubLine = "";
    const wrappedLines: string[] = [];

    for (const w of words) {
      if (!curSubLine) {
        curSubLine = w;
      } else if ((curSubLine + " " + w).length <= cpl) {
        curSubLine += " " + w;
      } else {
        wrappedLines.push(curSubLine);
        curSubLine = w;
      }
    }
    if (curSubLine) wrappedLines.push(curSubLine);

    let lineCursor = 0;
    while (lineCursor < wrappedLines.length) {
      const remainingOnPage = maxLinesForCurrentPage - currentLinesOnPage;
      if (remainingOnPage <= 0) {
        pages.push(currentPageItems);
        currentPageItems = [];
        currentLinesOnPage = 0;
        pageIdx++;
        maxLinesForCurrentPage = pageLineLimits[pageIdx] || 45;
        continue;
      }

      const takeCount = Math.min(remainingOnPage, wrappedLines.length - lineCursor);
      const chunkLines = wrappedLines.slice(lineCursor, lineCursor + takeCount);
      const chunkText = chunkLines.join(" ");

      currentPageItems.push({
        isBullet,
        text: chunkText,
        linesCount: takeCount,
      });

      currentLinesOnPage += takeCount;
      lineCursor += takeCount;

      if (currentLinesOnPage >= maxLinesForCurrentPage && lineCursor < wrappedLines.length) {
        pages.push(currentPageItems);
        currentPageItems = [];
        currentLinesOnPage = 0;
        pageIdx++;
        maxLinesForCurrentPage = pageLineLimits[pageIdx] || 45;
      }
    }
  }

  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }

  return pages.length > 0 ? pages : [[]];
}

function renderDescriptionPage(chunks: DescriptionChunk[], prefixLabel?: string) {
  if (!chunks || chunks.length === 0) {
    if (prefixLabel) {
      return (
        <p className="text-black leading-relaxed text-justify [overflow-wrap:anywhere] break-words">
          <span className="font-semibold whitespace-nowrap mr-1">{prefixLabel}</span>
        </p>
      );
    }
    return null;
  }

  const nodes: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: number | string) => {
    if (currentList.length > 0) {
      nodes.push(
        <ul key={`list-${keyPrefix}`} className="space-y-0.5 my-1 pl-0 ml-0 list-none">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start text-black pl-0 ml-0 text-left [overflow-wrap:anywhere] break-words">
              <span className="inline-block shrink-0 font-bold mr-1.5 select-none">-</span>
              <span
                className="leading-snug [&_b]:font-semibold [&_i]:italic [&_u]:underline"
                dangerouslySetInnerHTML={{ __html: formatInlineHtml(item) }}
              />
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  chunks.forEach((chunk, idx) => {
    if (chunk.isBullet) {
      currentList.push(chunk.text);
    } else {
      flushList(idx);
      if (idx === 0 && prefixLabel) {
        nodes.push(
          <p
            key={`p-${idx}`}
            className="text-black leading-relaxed [&_b]:font-semibold [&_i]:italic [&_u]:underline text-justify [overflow-wrap:anywhere] break-words"
          >
            <span className="font-semibold whitespace-nowrap mr-1">{prefixLabel}</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineHtml(chunk.text) }} />
          </p>
        );
      } else {
        nodes.push(
          <p
            key={`p-${idx}`}
            className="text-black leading-relaxed [&_b]:font-semibold [&_i]:italic [&_u]:underline text-justify [overflow-wrap:anywhere] break-words"
            dangerouslySetInnerHTML={{ __html: formatInlineHtml(chunk.text) }}
          />
        );
      }
    }
  });

  flushList("end");

  if (prefixLabel && chunks.every((c) => c.isBullet)) {
    nodes.unshift(
      <p key="prefix-only" className="text-black leading-relaxed font-semibold text-left whitespace-nowrap">
        {prefixLabel}
      </p>
    );
  }

  return <div className="space-y-1 text-justify">{nodes}</div>;
}

interface AlignedSignatureSectionProps {
  currentDate?: string;
  isBlank?: boolean;
  talentName?: string;
  signatureImage?: string | null;
  cretivoxName?: string;
  cretivoxSignatureImage?: string | null;
  pageNumber?: string;
}

function AlignedSignatureSection({
  currentDate = "15 September 2026",
  isBlank = false,
  talentName = "",
  signatureImage = null,
  cretivoxName = "",
  cretivoxSignatureImage = null,
  pageNumber = "2 / 2",
}: AlignedSignatureSectionProps) {
  const hasName = !isBlank && Boolean(talentName?.trim());
  const hasSignature = !isBlank && Boolean(signatureImage);
  const hasCretivoxName = Boolean(cretivoxName?.trim());

  return (
    <div className="pt-2 flex flex-col w-full">
      {/* Date */}
      <div className="grid grid-cols-2 gap-8 mb-2 px-3">
        <div></div>
        <div className="text-center">
          <p className="text-[11.5px] text-black font-normal">
            Jakarta, {currentDate || "_____________________"}
          </p>
        </div>
      </div>

      {/* Two-column Signatures */}
      <div className="grid grid-cols-2 gap-8 px-3 items-start">
        {/* Left: Pihak Cretivox */}
        <div className="flex flex-col items-center">
          <div className="h-20 w-full flex items-end justify-center pb-0.5 relative">
            {cretivoxSignatureImage && (
              <img
                src={cretivoxSignatureImage}
                alt="Tanda Tangan Pihak Cretivox"
                className="max-h-19 max-w-48.75 object-contain"
                style={{ width: "auto", height: "auto" }}
                loading="eager"
                decoding="sync"
              />
            )}
          </div>
          <div className="flex items-end justify-between w-full max-w-55 min-h-7 pb-1 border-b border-black relative px-1">
            <span className="text-xs font-normal text-black select-none leading-normal">
              (
            </span>
            <span className="text-[12px] text-black font-medium px-1 text-center whitespace-nowrap overflow-visible leading-normal">
              {hasCretivoxName ? cretivoxName.trim() : ""}
            </span>
            <span className="text-xs font-normal text-black select-none leading-normal">
              )
            </span>
          </div>
          <div className="flex flex-col items-center justify-center pt-1.5">
            <p className="text-[12.5px] text-black font-semibold select-none">
              Pihak Cretivox
            </p>
          </div>
        </div>

        {/* Right: Talent Cretivox */}
        <div className="flex flex-col items-center">
          <div className="h-20 w-full flex items-end justify-center pb-0.5 relative">
            {hasSignature && (
              <img
                src={signatureImage!}
                alt="Tanda Tangan Talent"
                className="max-h-19 max-w-48.75 object-contain"
                style={{ width: "auto", height: "auto" }}
                loading="eager"
                decoding="sync"
              />
            )}
          </div>
          <div className="flex items-end justify-between w-full max-w-55 min-h-7 pb-1 border-b border-black relative px-1">
            <span className="text-xs font-normal text-black select-none leading-normal">
              (
            </span>
            <span className="text-[12px] text-black font-medium px-1 text-center whitespace-nowrap overflow-visible leading-normal">
              {hasName ? talentName.trim() : ""}
            </span>
            <span className="text-xs font-normal text-black select-none leading-normal">
              )
            </span>
          </div>
          <div className="flex flex-col items-center justify-center pt-1.5">
            <p className="text-[12.5px] text-black font-semibold select-none">
              Talent Cretivox
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const PdfViewer = forwardRef<PdfViewerHandle, A4DocumentViewerProps>(
  function PdfViewer(
    {
      contentTheme = "",
      contentDescription = "",
      publishedPlatforms = [],
      translatedTheme: propTranslatedTheme,
      translatedDesc: propTranslatedDesc,
      fee = 500000,
      talentName = "",
      notesHtml = "",
      signatureImage = null,
      currentDate = "15 September 2026",
      isBlank = false,
      twoPagesDefault = true,
      maxHeight = "540px",
      isModal = false,
      onClose,
      lang = "ID",
      initialZoom,
      aiConsent = true,
      cretivoxName = "",
      cretivoxSignatureImage = null,
      showDownload,
      isLoading = false,
    },
    ref
  ) {
    // Resolve platforms from props or extracted comment in description
    const effectivePlatforms = useMemo(() => {
      if (publishedPlatforms && publishedPlatforms.length > 0) return publishedPlatforms;
      return parsePublishedPlatforms(contentDescription);
    }, [publishedPlatforms, contentDescription]);

    const cleanedContentDesc = useMemo(() => cleanDescriptionText(contentDescription), [contentDescription]);

    const [translatedDesc, setTranslatedDesc] = useState<string>(
      propTranslatedDesc || autoTranslateDescription(cleanedContentDesc)
    );
    const [translatedThemeText, setTranslatedThemeText] = useState<string>(
      propTranslatedTheme || autoTranslateTheme(contentTheme)
    );
    const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

    const isViewerLoading = isLoading || isLoadingPreview || !contentTheme;

    useEffect(() => {
      if (propTranslatedDesc) {
        setTranslatedDesc(cleanDescriptionText(propTranslatedDesc));
      } else if (cleanedContentDesc) {
        setTranslatedDesc(autoTranslateDescription(cleanedContentDesc));
      }
    }, [propTranslatedDesc, cleanedContentDesc]);

    useEffect(() => {
      if (propTranslatedTheme) {
        setTranslatedThemeText(propTranslatedTheme);
      } else if (contentTheme) {
        setTranslatedThemeText(autoTranslateTheme(contentTheme));
      }
    }, [propTranslatedTheme, contentTheme]);

    useEffect(() => {
      let isMounted = true;
      const needsDescTrans = Boolean(cleanedContentDesc && !propTranslatedDesc);
      const needsThemeTrans = Boolean(contentTheme && !propTranslatedTheme);

      if (needsDescTrans || needsThemeTrans) {
        setIsLoadingPreview(true);
        const transPromises: Promise<any>[] = [];

        if (needsDescTrans) {
          transPromises.push(
            fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: cleanedContentDesc }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (isMounted && d?.translatedText) {
                  setTranslatedDesc(cleanDescriptionText(d.translatedText));
                }
              })
              .catch(() => {})
          );
        }
        if (needsThemeTrans) {
          transPromises.push(
            fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: contentTheme }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (isMounted && d?.translatedText) {
                  setTranslatedThemeText(d.translatedText);
                }
              })
              .catch(() => {})
          );
        }

        Promise.race([
          Promise.all(transPromises),
          new Promise((res) => setTimeout(res, 3500)),
        ]).finally(() => {
          if (isMounted) setIsLoadingPreview(false);
        });
      }

      return () => {
        isMounted = false;
      };
    }, [cleanedContentDesc, contentTheme, propTranslatedDesc, propTranslatedTheme]);

    // Dynamic Multi-Page Logic (including published platform lines)
    const linesId = useMemo(
      () => estimateRenderedLines(cleanedContentDesc),
      [cleanedContentDesc]
    );
    const linesEn = useMemo(
      () =>
        estimateRenderedLines(
          cleanDescriptionText(translatedDesc || autoTranslateDescription(cleanedContentDesc))
        ),
      [cleanedContentDesc, translatedDesc]
    );
    const maxDescLines = Math.max(linesId, linesEn);

    const pageConfig = useMemo(
      () => getPageLineLimits(maxDescLines, effectivePlatforms.length),
      [maxDescLines, effectivePlatforms.length]
    );
    const totalNumPages = pageConfig.totalPages;
    const clausesOnPage = pageConfig.clausesOnPage;

    const idDescPages = useMemo(() => {
      return paginateDescription(cleanedContentDesc, pageConfig.limits);
    }, [cleanedContentDesc, pageConfig.limits]);

    const enDescPages = useMemo(() => {
      const enText = cleanDescriptionText(translatedDesc || autoTranslateDescription(cleanedContentDesc));
      return paginateDescription(enText, pageConfig.limits);
    }, [cleanedContentDesc, translatedDesc, pageConfig.limits]);

    const renderPublishedList = (isEn: boolean) => {
      if (effectivePlatforms.length === 0) return null;
      return (
        <div className="pt-1.5 space-y-0.5">
          <p className="text-black leading-snug">
            {isEn
              ? "The content will be published on several platforms, namely:"
              : "Konten akan dipublikasikan di beberapa platform, yaitu:"}
          </p>
          <ul className="space-y-0.5 pl-0 ml-0 list-none">
            {effectivePlatforms.map((plat, pIdx) => (
              <li key={pIdx} className="flex items-start text-black pl-0 ml-0">
                <span className="inline-block shrink-0 font-bold mr-1.5 select-none">-</span>
                <span className="leading-snug">{plat}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    };

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [zoomLevel, setZoomLevel] = useState<number>(() => {
      if (initialZoom) return initialZoom;
      if (isModal) return 100;
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        const available = window.innerWidth - 32;
        return Math.min(75, Math.max(35, Math.floor((available / 680) * 100)));
      }
      return 65;
    });

    const containerRef = useRef<HTMLDivElement | null>(null);
    const scaledWrapperRef = useRef<HTMLDivElement | null>(null);
    const targetScrollRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
    const pageElementsRef = useRef<(HTMLDivElement | null)[]>([]);

    const useIsomorphicLayoutEffect =
      typeof window !== "undefined" ? React.useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
      if (targetScrollRef.current && containerRef.current) {
        containerRef.current.scrollLeft = targetScrollRef.current.scrollLeft;
        containerRef.current.scrollTop = targetScrollRef.current.scrollTop;
        targetScrollRef.current = null;
      }
    }, [zoomLevel]);

    const formattedFee = fee ? `Rp${Number(fee).toLocaleString("id-ID")}` : "Rp500.000";
    const formattedFeeEn = fee ? `IDR ${Number(fee).toLocaleString("en-US")}` : "IDR 500,000";

    const hasName = !isBlank && Boolean(talentName?.trim());
    const shouldShowDownload = showDownload !== undefined ? showDownload : !isBlank;

    // Track container width for safe-start alignment
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateWidth = () => {
        if (container.clientWidth > 0) {
          setContainerWidth(container.clientWidth);
        }
      };
      updateWidth();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWidth) : null;
      if (ro) ro.observe(container);
      window.addEventListener("resize", updateWidth);
      return () => {
        if (ro) ro.disconnect();
        window.removeEventListener("resize", updateWidth);
      };
    }, []);

    // Auto-fit viewer zoom on resize and after loading finishes
    useEffect(() => {
      if (initialZoom) return;
      const container = containerRef.current;
      if (!container) return;

      const adjustFit = () => {
        const containerWidth = container.clientWidth || (typeof window !== "undefined" ? window.innerWidth - 32 : 0);
        if (containerWidth > 0) {
          const padding = containerWidth < 450 ? 16 : containerWidth < 600 ? 24 : 36;
          const availableWidth = containerWidth - padding;
          const calculatedZoom = Math.floor((availableWidth / 680) * 100);
          const maxZoom = isModal ? 100 : 75;
          const minZoom = 35;
          setZoomLevel(Math.min(maxZoom, Math.max(minZoom, calculatedZoom)));
        }
      };

      adjustFit();
      const raf = requestAnimationFrame(adjustFit);
      const timer1 = setTimeout(adjustFit, 80);

      const ro =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => adjustFit())
          : null;
      if (ro) ro.observe(container);

      window.addEventListener("resize", adjustFit);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer1);
        if (ro) ro.disconnect();
        window.removeEventListener("resize", adjustFit);
      };
    }, [isModal, initialZoom, isViewerLoading, contentTheme]);

    const zoomLevelRef = useRef(zoomLevel);
    zoomLevelRef.current = zoomLevel;

    // Mobile Focal Pinch-to-Zoom & Trackpad Pinch Handler
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let isPinching = false;
      let startDist = 0;
      let startZoom = 65;
      let focalNormX = 340;
      let focalNormY = 481;
      let rafId: number | null = null;

      const getTouchDistance = (t1: Touch, t2: Touch) => {
        return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = getTouchDistance(t1, t2);
          if (dist > 10) {
            isPinching = true;
            startDist = dist;
            startZoom = zoomLevelRef.current;

            const wrapper = scaledWrapperRef.current;
            if (wrapper) {
              const midX = (t1.clientX + t2.clientX) / 2;
              const midY = (t1.clientY + t2.clientY) / 2;
              const wrapperRect = wrapper.getBoundingClientRect();
              const currentScale = zoomLevelRef.current / 100;

              // Normalized coordinates on unscaled document
              focalNormX = Math.max(0, Math.min(680, (midX - wrapperRect.left) / currentScale));
              focalNormY = Math.max(0, (midY - wrapperRect.top) / currentScale);
            }
          }
        } else {
          isPinching = false;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isPinching || e.touches.length !== 2) return;
        if (e.cancelable) e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = getTouchDistance(t1, t2);
        if (startDist <= 0) return;

        const wrapper = scaledWrapperRef.current;
        if (!wrapper) return;

        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const containerRect = container.getBoundingClientRect();
        const currentViewX = midX - containerRect.left;
        const currentViewY = midY - containerRect.top;

        const factor = dist / startDist;
        const targetZoom = Math.round(startZoom * factor);
        const clampedZoom = Math.min(160, Math.max(35, targetZoom));

        const newScale = clampedZoom / 100;
        const newScaledWidth = Math.round(680 * newScale);
        const paddingLeft = container.clientWidth < 640 ? 12 : 16;
        const paddingTop = container.clientWidth < 640 ? 16 : 32;
        const newWrapperX =
          newScaledWidth < container.clientWidth
            ? Math.max(paddingLeft, (container.clientWidth - newScaledWidth) / 2)
            : paddingLeft;
        const newWrapperY = paddingTop;

        const targetScrollLeft = Math.round(newWrapperX + focalNormX * newScale - currentViewX);
        const targetScrollTop = Math.round(newWrapperY + focalNormY * newScale - currentViewY);

        targetScrollRef.current = { scrollLeft: targetScrollLeft, scrollTop: targetScrollTop };

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          if (Math.abs(clampedZoom - zoomLevelRef.current) >= 1) {
            setZoomLevel(clampedZoom);
          } else {
            container.scrollLeft = targetScrollLeft;
            container.scrollTop = targetScrollTop;
          }
        });
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          isPinching = false;
          if (rafId) cancelAnimationFrame(rafId);
        }
      };

      // Laptop Trackpad Pinch (Ctrl + Wheel) with focal point zooming
      const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const wrapper = scaledWrapperRef.current;
          if (!wrapper) return;

          const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
          const currentZoom = zoomLevelRef.current;
          const clampedZoom = Math.min(160, Math.max(35, Math.round(currentZoom * zoomFactor)));
          if (clampedZoom === currentZoom) return;

          const wrapperRect = wrapper.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const currentScale = currentZoom / 100;
          const normX = Math.max(0, Math.min(680, (e.clientX - wrapperRect.left) / currentScale));
          const normY = Math.max(0, (e.clientY - wrapperRect.top) / currentScale);

          const newScale = clampedZoom / 100;
          const newScaledWidth = Math.round(680 * newScale);
          const paddingLeft = container.clientWidth < 640 ? 12 : 16;
          const paddingTop = container.clientWidth < 640 ? 16 : 32;
          const newWrapperX =
            newScaledWidth < container.clientWidth
              ? Math.max(paddingLeft, (container.clientWidth - newScaledWidth) / 2)
              : paddingLeft;
          const newWrapperY = paddingTop;

          const currentViewX = e.clientX - containerRect.left;
          const currentViewY = e.clientY - containerRect.top;

          const targetScrollLeft = Math.round(newWrapperX + normX * newScale - currentViewX);
          const targetScrollTop = Math.round(newWrapperY + normY * newScale - currentViewY);

          targetScrollRef.current = { scrollLeft: targetScrollLeft, scrollTop: targetScrollTop };
          setZoomLevel(clampedZoom);
        }
      };

      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
      container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      container.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
        container.removeEventListener("wheel", handleWheel);
      };
    }, []);

    // Initialize scroll position to top and center horizontally ONLY when document loading completes
    useEffect(() => {
      if (isViewerLoading) return;
      const container = containerRef.current;
      if (!container) return;

      const initScroll = () => {
        container.scrollTop = 0;
        setCurrentPage(1);
        if (container.scrollWidth > container.clientWidth) {
          container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
        } else {
          container.scrollLeft = 0;
        }
      };

      initScroll();
      const timer = setTimeout(initScroll, 60);
      return () => clearTimeout(timer);
    }, [isViewerLoading]);

    // Track active page on scroll
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleScroll = () => {
        if (container.scrollTop <= 15) {
          setCurrentPage(1);
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const triggerY = containerRect.top + containerRect.height * 0.45;

        for (let i = pageElementsRef.current.length - 1; i >= 0; i--) {
          const el = pageElementsRef.current[i];
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= triggerY) {
              setCurrentPage(i + 1);
              return;
            }
          }
        }
        setCurrentPage(1);
      };

      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }, [totalNumPages]);

    const scrollToPage = (pageNumber: number) => {
      const target = Math.max(1, Math.min(totalNumPages, pageNumber));
      setCurrentPage(target);
      const container = containerRef.current;
      if (!container) return;

      const targetEl = pageElementsRef.current[target - 1];
      if (targetEl) {
        const containerRect = container.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: scrollOffset, behavior: "smooth" });
      }
    };

    const [isDownloading, setIsDownloading] = useState(false);

    const scaledWidth = Math.round(680 * (zoomLevel / 100));
    const scaledHeight = Math.round(
      (962 * totalNumPages + 32 * (totalNumPages - 1)) * (zoomLevel / 100)
    );

    const preparePageImages = async (pageEl: HTMLElement): Promise<void> => {
      const images = Array.from(pageEl.querySelectorAll("img"));
      if (images.length === 0) return;
      await Promise.all(
        images.map(async (img) => {
          if (!img.complete) {
            await new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            });
          }
          if (typeof img.decode === "function") {
            try {
              await img.decode();
            } catch {
              // Ignore decoding errors if already painted
            }
          }
        })
      );
    };

    const handleDownloadPdf = async () => {
      const pages = pageElementsRef.current.filter(Boolean) as HTMLDivElement[];
      if (pages.length === 0) return;

      try {
        setIsDownloading(true);

        const { toPng } = await import("html-to-image");
        const { jsPDF } = await import("jspdf");

        const currentZoom = zoomLevel;
        if (currentZoom !== 100) {
          setZoomLevel(100);
          await new Promise((r) => setTimeout(r, 120));
        }

        if (document.fonts) {
          await document.fonts.ready;
        }

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          await preparePageImages(pages[i]);
          const imgData = await toPng(pages[i], {
            pixelRatio: 2.2,
            backgroundColor: "#ffffff",
            style: { boxShadow: "none", borderRadius: "0px", border: "none", transform: "none" },
          });
          pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
        }

        if (currentZoom !== 100) {
          setZoomLevel(currentZoom);
        }

        const filename = hasName
          ? `Consent Form - ${talentName.trim()}.pdf`
          : "Consent Form - Cretivox.pdf";
        const pdfBlob = pdf.output("blob");
        await downloadOrSharePdf(pdfBlob, filename);
      } catch (error) {
        console.error("Failed to generate PDF:", error);
      } finally {
        setIsDownloading(false);
      }
    };

    const generatePdfDataUrl = async (): Promise<string | null> => {
      const pages = pageElementsRef.current.filter(Boolean) as HTMLDivElement[];
      if (pages.length === 0) return null;

      try {
        const { toPng } = await import("html-to-image");
        const { jsPDF } = await import("jspdf");

        const currentZoom = zoomLevel;
        if (currentZoom !== 100) {
          setZoomLevel(100);
          await new Promise((r) => setTimeout(r, 120));
        }

        if (document.fonts) {
          await document.fonts.ready;
        }

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          await preparePageImages(pages[i]);
          const imgData = await toPng(pages[i], {
            pixelRatio: 2.2,
            backgroundColor: "#ffffff",
            style: { boxShadow: "none", borderRadius: "0px", border: "none", transform: "none" },
          });
          pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
        }

        if (currentZoom !== 100) {
          setZoomLevel(currentZoom);
        }

        return pdf.output("datauristring");
      } catch (err) {
        console.error("Failed to generate PDF data URL:", err);
        return null;
      }
    };

    const generatePdfFile = async (filename: string = "Consent_Form.pdf"): Promise<File | null> => {
      const pages = pageElementsRef.current.filter(Boolean) as HTMLDivElement[];
      if (pages.length === 0) return null;

      try {
        const { toPng } = await import("html-to-image");
        const { jsPDF } = await import("jspdf");

        const currentZoom = zoomLevel;
        if (currentZoom !== 100) {
          setZoomLevel(100);
          await new Promise((r) => setTimeout(r, 120));
        }

        if (document.fonts) {
          await document.fonts.ready;
        }

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          await preparePageImages(pages[i]);
          const imgData = await toPng(pages[i], {
            pixelRatio: 2.2,
            backgroundColor: "#ffffff",
            style: { boxShadow: "none", borderRadius: "0px", border: "none", transform: "none" },
          });
          pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
        }

        if (currentZoom !== 100) {
          setZoomLevel(currentZoom);
        }

        const pdfBlob = pdf.output("blob");
        return new File([pdfBlob], filename, { type: "application/pdf" });
      } catch (err) {
        console.error("Failed to generate PDF file:", err);
        return null;
      }
    };

    useImperativeHandle(ref, () => ({
      downloadPdf: handleDownloadPdf,
      generatePdfDataUrl,
      generatePdfFile,
    }));

    const handleZoomIn = () => {
      const container = containerRef.current;
      const wrapper = scaledWrapperRef.current;
      const currentZoom = zoomLevelRef.current;
      const newZoom = Math.min(currentZoom + 10, 160);
      if (newZoom === currentZoom) return;

      if (container && wrapper) {
        const containerRect = container.getBoundingClientRect();
        const midX = containerRect.left + container.clientWidth / 2;
        const midY = containerRect.top + container.clientHeight / 2;
        const wrapperRect = wrapper.getBoundingClientRect();
        const currentScale = currentZoom / 100;

        const normX = Math.max(0, Math.min(680, (midX - wrapperRect.left) / currentScale));
        const normY = Math.max(0, (midY - wrapperRect.top) / currentScale);

        const newScale = newZoom / 100;
        const newScaledWidth = Math.round(680 * newScale);
        const paddingLeft = container.clientWidth < 640 ? 12 : 16;
        const paddingTop = container.clientWidth < 640 ? 16 : 32;
        const newWrapperX =
          newScaledWidth < container.clientWidth
            ? Math.max(paddingLeft, (container.clientWidth - newScaledWidth) / 2)
            : paddingLeft;
        const newWrapperY = paddingTop;

        const targetScrollLeft = Math.round(newWrapperX + normX * newScale - container.clientWidth / 2);
        const targetScrollTop = Math.round(newWrapperY + normY * newScale - container.clientHeight / 2);

        targetScrollRef.current = { scrollLeft: targetScrollLeft, scrollTop: targetScrollTop };
      }
      setZoomLevel(newZoom);
    };

    const handleZoomOut = () => {
      const container = containerRef.current;
      const wrapper = scaledWrapperRef.current;
      const currentZoom = zoomLevelRef.current;
      const newZoom = Math.max(currentZoom - 10, 35);
      if (newZoom === currentZoom) return;

      if (container && wrapper) {
        const containerRect = container.getBoundingClientRect();
        const midX = containerRect.left + container.clientWidth / 2;
        const midY = containerRect.top + container.clientHeight / 2;
        const wrapperRect = wrapper.getBoundingClientRect();
        const currentScale = currentZoom / 100;

        const normX = Math.max(0, Math.min(680, (midX - wrapperRect.left) / currentScale));
        const normY = Math.max(0, (midY - wrapperRect.top) / currentScale);

        const newScale = newZoom / 100;
        const newScaledWidth = Math.round(680 * newScale);
        const paddingLeft = container.clientWidth < 640 ? 12 : 16;
        const paddingTop = container.clientWidth < 640 ? 16 : 32;
        const newWrapperX =
          newScaledWidth < container.clientWidth
            ? Math.max(paddingLeft, (container.clientWidth - newScaledWidth) / 2)
            : paddingLeft;
        const newWrapperY = paddingTop;

        const targetScrollLeft = Math.round(newWrapperX + normX * newScale - container.clientWidth / 2);
        const targetScrollTop = Math.round(newWrapperY + normY * newScale - container.clientHeight / 2);

        targetScrollRef.current = { scrollLeft: targetScrollLeft, scrollTop: targetScrollTop };
      }
      setZoomLevel(newZoom);
    };
    const handleResetZoom = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          const padding = w < 450 ? 16 : w < 600 ? 24 : 36;
          const availableWidth = w - padding;
          const calculatedZoom = Math.floor((availableWidth / 680) * 100);
          setZoomLevel(
            isModal
              ? Math.min(100, Math.max(35, calculatedZoom))
              : Math.min(75, Math.max(35, calculatedZoom))
          );
          setTimeout(() => {
            if (containerRef.current) {
              if (containerRef.current.scrollWidth > containerRef.current.clientWidth) {
                containerRef.current.scrollLeft = (containerRef.current.scrollWidth - containerRef.current.clientWidth) / 2;
              } else {
                containerRef.current.scrollLeft = 0;
              }
            }
          }, 30);
          return;
        }
      }
      setZoomLevel(isModal ? 100 : 65);
    };

    // Shared Indonesian Clauses 1-7 (Compact, standard font)
    const renderClausesId = () => (
      <div className="pt-1.5 space-y-1">
        <div>
          <p className="text-black leading-snug font-medium">
            Dengan menandatangani lembar ini, saya setuju dengan pertanyaan-pernyataan di bawah ini:
          </p>
        </div>

        <ol className="list-decimal pl-4 space-y-0.5 text-black text-justify leading-snug">
          <li>
            Setiap perkataan dan perbuatan berasal sepenuhnya dari diri saya sendiri, tanpa paksaan dari pihak manapun.
          </li>
          <li>
            Saya memiliki hak penuh untuk menentukan konten yang saya ucapkan.
          </li>
          <li>
            Saya bertanggung jawab terhadap konten yang saya berikan.
          </li>
          <li>
            Konten yang saya bagikan adalah milik Cretivox.
          </li>
          <li>
            Proses wawancara direkam oleh Cretivox.
          </li>
          <li>
            Saya memberikan wewenang penuh kepada Cretivox untuk mempublikasikan rekaman di seluruh platform Cretivox.
          </li>
          <li>
            {isBlank ? (
              <span>
                Saya ________________ <em>(bersedia / tidak bersedia)</em> memberikan wewenang kepada Cretivox untuk menggunakan teknologi AI guna memodifikasi atau mereplikasi wajah, suara, penampilan fisik, dan ucapan saya secara digital di dalam konten.
              </span>
            ) : aiConsent ? (
              <span>
                Saya <span className="font-bold underline">bersedia</span> memberikan wewenang kepada Cretivox untuk menggunakan teknologi AI guna memodifikasi atau mereplikasi wajah, suara, penampilan fisik, dan ucapan saya secara digital di dalam konten.
              </span>
            ) : (
              <span>
                Saya <span className="font-bold underline">tidak bersedia</span> memberikan wewenang kepada Cretivox untuk menggunakan teknologi AI guna memodifikasi atau mereplikasi wajah, suara, penampilan fisik, dan ucapan saya secara digital di dalam konten.
              </span>
            )}
          </li>
        </ol>
      </div>
    );

    // Shared English Clauses 1-7 (Compact, standard font)
    const renderClausesEn = () => (
      <div className="pt-1.5 space-y-1">
        <div>
          <p className="text-black leading-snug font-medium">
            By signing this form, I agree to the following statements:
          </p>
        </div>

        <ol className="list-decimal pl-4 space-y-0.5 text-black text-justify leading-snug">
          <li>
            Every word and action fully originated from myself, without coercion from any party.
          </li>
          <li>
            I have full rights to determine the content that I express.
          </li>
          <li>
            I am fully responsible for the content I provide.
          </li>
          <li>
            The content recorded belongs exclusively to Cretivox.
          </li>
          <li>
            The entire shooting process is officially recorded by Cretivox.
          </li>
          <li>
            I grant Cretivox full authority to publish the footage across all their media platforms.
          </li>
          <li>
            {isBlank ? (
              <span>
                I ________________ <em>(authorize / do not authorize)</em> Cretivox to use AI technology to modify or replicate my face, voice, physical appearance, and speech digitally within the content.
              </span>
            ) : aiConsent ? (
              <span>
                I <span className="font-bold underline">authorize</span> Cretivox to use AI technology to modify or replicate my face, voice, physical appearance, and speech digitally within the content.
              </span>
            ) : (
              <span>
                I <span className="font-bold underline">do not authorize</span> Cretivox to use AI technology to modify or replicate my face, voice, physical appearance, and speech digitally within the content.
              </span>
            )}
          </li>
        </ol>
      </div>
    );

    return (
      <div className="w-full flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm font-sans select-none">
        {/* Document Top Toolbar */}
        <div className="w-full bg-white border-b border-gray-200 px-2.5 sm:px-4 py-2 flex flex-wrap items-center justify-between text-xs text-gray-700 gap-1.5 sm:gap-2 select-none shadow-2xs z-10">
          <div className="flex items-center gap-2 min-w-fit">
            <div className="w-6 h-6 rounded bg-zinc-800 text-white flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-xs tracking-tight truncate max-w-32.5 sm:max-w-60">
                {hasName ? `Consent Form - ${talentName.trim()}.pdf` : "Consent Form - Cretivox.pdf"}
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">
                Format A4 (210 × 297 mm)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Active Page Indicator */}
            <div className="flex items-center bg-gray-50 rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 border border-gray-200 text-xs text-gray-700">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => scrollToPage(currentPage - 1)}
                className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={lang === "ID" ? "Ke Halaman Sebelumnya" : "Previous Page"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-gray-700 font-medium text-[11px] select-none whitespace-nowrap">
                <strong className="text-gray-900 font-bold">{currentPage}</strong>
                <span className="text-gray-400">/</span>{totalNumPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalNumPages}
                onClick={() => scrollToPage(currentPage + 1)}
                className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={lang === "ID" ? "Ke Halaman Selanjutnya" : "Next Page"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg px-1 py-0.5 border border-gray-200 text-xs text-gray-600">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                title={lang === "ID" ? "Perkecil Tampilan" : "Zoom Out"}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1 sm:px-1.5 text-[10.5px] sm:text-[11px] font-mono hover:text-black cursor-pointer select-none"
                title={lang === "ID" ? "Reset Zoom" : "Reset Zoom"}
                suppressHydrationWarning
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                title={lang === "ID" ? "Perbesar Tampilan" : "Zoom In"}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download Button */}
            {shouldShowDownload && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-black text-white px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-medium transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Download"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Document Scroll Canvas */}
        <div
          ref={containerRef}
          className="relative bg-zinc-100/90 overflow-auto"
          style={{
            maxHeight,
            minHeight: isModal ? "450px" : "380px",
            height: isModal ? "82vh" : "540px",
            scrollbarWidth: "thin",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {isViewerLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-115 p-8 text-zinc-600 animate-in fade-in duration-200">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                <FileText className="w-5 h-5 text-zinc-800 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">
                Menyiapkan Dokumen PDF...
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Memproses data template dan pratinjau dokumen A4
              </p>
            </div>
          ) : (
            <div
              className="py-4 sm:py-8 px-3 sm:px-4"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "max-content",
                minWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                ref={scaledWrapperRef}
                style={{
                  width: `${scaledWidth}px`,
                  minWidth: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                  minHeight: `${scaledHeight}px`,
                  position: "relative",
                  margin: "0 auto",
                  flexShrink: 0,
                  WebkitTransform: "translateZ(0)",
                  transform: "translateZ(0)",
                }}
              >
                <div
                  style={{
                    width: "680px",
                    minWidth: "680px",
                    transform: `scale(${zoomLevel / 100})`,
                    WebkitTransform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    willChange: "transform",
                    WebkitBackfaceVisibility: "hidden",
                    backfaceVisibility: "hidden",
                  }}
                  className="flex flex-col items-center gap-8 py-2 shrink-0"
                >
                  {/* ========================================================
                      PAGE 1 (LEMBAR A4 - HALAMAN 1)
                      ======================================================== */}
                  <div
                    ref={(el) => {
                      pageElementsRef.current[0] = el;
                    }}
                    className="w-[680px] h-[962px] min-w-[680px] min-h-[962px] max-w-[680px] max-h-[962px] bg-white text-black shadow-md shadow-zinc-400/30 border border-zinc-200/90 rounded-xs font-sans text-[11.2px] leading-[1.4] select-text flex flex-col justify-start shrink-0 box-border overflow-hidden"
                    style={{
                      paddingTop: "40px",
                      paddingLeft: "60px",
                      paddingRight: "60px",
                      paddingBottom: "60px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div className="flex flex-col">
                      {/* Header */}
                      <div className="flex justify-between items-start pb-1 mb-1.5">
                        <div className="pt-0.5">
                          <img
                            src={CRETIVOX_LOGO_BASE64}
                            alt="Cretivox Logo"
                            style={{ width: "145px", height: "auto" }}
                            className="block object-contain"
                            loading="eager"
                            decoding="sync"
                          />
                        </div>
                        <div className="text-right text-[9px] text-black leading-tight space-y-0.5">
                          <p>Jl. Balap Sepeda No.6, RT. 15/RW. 1,</p>
                          <p>Jati, Kec. Pulo Gadung, Kota Jakarta Timur,</p>
                          <p>Daerah Khusus Ibukota Jakarta 13220</p>
                          <p className="font-semibold text-black pt-0.5">www.cretivox.com</p>
                        </div>
                      </div>

                      {/* Document Title */}
                      <div className="text-center my-1.5">
                        <h1 className="text-[16px] font-bold text-black tracking-wide">
                          Consent Form
                        </h1>
                      </div>

                      {/* Two Column Content (Indonesian & English) */}
                      <div className="grid grid-cols-2 gap-5 pt-0.5 text-black text-justify text-[11.2px] leading-[1.4]">
                        {/* Left Column (Bahasa Indonesia) */}
                        <div className="space-y-1.5 text-justify">
                          <p className="text-black leading-snug">
                            Terima kasih atas ketersediaan anda untuk menjadi <em>talent</em> Cretivox.
                          </p>

                          <p className="text-black leading-snug">
                            Cretivox adalah sebuah <em>Multi-Platform Entertainment Media</em> untuk
                            berbagi dan mendengar cerita sekitar kehidupan, yang diharapkan mampu
                            memberikan kebahagiaan, serta menambah wawasan dan sudut pandang kepada mereka
                            yang ingin terus berkembang.
                          </p>

                          <p className="text-black leading-snug">
                            Saya,{" "}
                            {hasName ? (
                              <span className="font-bold">
                                {talentName.trim()}
                              </span>
                            ) : (
                              <span>________________________</span>
                            )}
                            , bersedia untuk menjadi <em>talent</em> Cretivox untuk <em>content</em> berikut.
                          </p>

                          <div>
                            <p className="text-black font-semibold text-left">
                              Tema konten : {contentTheme}
                            </p>
                          </div>

                          {/* Published Platforms (di atas deskripsi konten) */}
                          {effectivePlatforms.length > 0 && (
                            <div className="pt-0.5 space-y-0.5 text-black text-left">
                              <p className="text-black leading-snug font-medium text-left">
                                Konten akan dipublikasikan di beberapa platform, yaitu:
                              </p>
                              <ul className="space-y-0.5 pl-0 ml-0 list-none text-left">
                                {effectivePlatforms.map((plat, pIdx) => (
                                  <li key={pIdx} className="flex items-start text-black pl-0 ml-0 text-left">
                                    <span className="inline-block shrink-0 font-bold mr-1.5 select-none">-</span>
                                    <span className="leading-snug">{plat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="text-justify [overflow-wrap:anywhere] break-words">
                            {renderDescriptionPage(idDescPages[0], "Deskripsi Konten :")}
                          </div>

                          {/* Render clauses on Page 1 if clausesOnPage === 1 */}
                          {clausesOnPage === 1 && renderClausesId()}
                        </div>

                        {/* Right Column (English) */}
                        <div className="space-y-1.5 text-justify">
                          <p className="text-black leading-snug">
                            Thank you for your willingness to partake as a talent of Cretivox.
                          </p>

                          <p className="text-black leading-snug">
                            Cretivox is a Multi-Platform Entertainment Media where one can share and
                            listen to stories about life, which are expected to provide happiness, as
                            well as insight and perspective to those who want to continue to develop.
                          </p>

                          <p className="text-black leading-snug">
                            I,{" "}
                            {hasName ? (
                              <span className="font-bold">
                                {talentName.trim()}
                              </span>
                            ) : (
                              <span>________________________</span>
                            )}
                            , agree to take part as a talent of Cretivox for the content described below.
                          </p>

                          <div>
                            <p className="text-black font-semibold text-left">
                              Content theme: {translatedThemeText || autoTranslateTheme(contentTheme)}
                            </p>
                          </div>

                          {/* Published Platforms (above content description) */}
                          {effectivePlatforms.length > 0 && (
                            <div className="pt-0.5 space-y-0.5 text-black text-left">
                              <p className="text-black leading-snug font-medium text-left">
                                The content will be published on several platforms, namely:
                              </p>
                              <ul className="space-y-0.5 pl-0 ml-0 list-none text-left">
                                {effectivePlatforms.map((plat, pIdx) => (
                                  <li key={pIdx} className="flex items-start text-black pl-0 ml-0 text-left">
                                    <span className="inline-block shrink-0 font-bold mr-1.5 select-none">-</span>
                                    <span className="leading-snug">{plat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="text-justify [overflow-wrap:anywhere] break-words">
                            {renderDescriptionPage(enDescPages[0], "Content Description :")}
                          </div>

                          {/* Render clauses on Page 1 if clausesOnPage === 1 */}
                          {clausesOnPage === 1 && renderClausesEn()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================
                      MIDDLE PAGES (PAGES 2 TO totalNumPages - 1)
                      Dynamic continuation of description & clauses
                      ======================================================== */}
                  {totalNumPages > 2 &&
                    Array.from({ length: totalNumPages - 2 }).map((_, middleIdx) => {
                      const pageIdx = middleIdx + 1; // 0-indexed page index (1 = Page 2, 2 = Page 3...)
                      const pageNum = pageIdx + 1;

                      return (
                        <div
                          key={`middle-page-${pageNum}`}
                          ref={(el) => {
                            pageElementsRef.current[pageIdx] = el;
                          }}
                          className="w-[680px] h-[962px] min-w-[680px] min-h-[962px] max-w-[680px] max-h-[962px] bg-white text-black shadow-md shadow-zinc-400/30 border border-zinc-200/90 rounded-xs font-sans text-[11.8px] leading-normal select-text flex flex-col justify-start shrink-0 box-border overflow-hidden"
                          style={{
                            paddingTop: "40px",
                            paddingLeft: "60px",
                            paddingRight: "60px",
                            paddingBottom: "60px",
                            boxSizing: "border-box",
                          }}
                        >
                          <div className="flex flex-col">
                            {/* Header */}
                            <div className="flex justify-between items-start pb-1 mb-2">
                              <div className="pt-0.5">
                                <img
                                  src={CRETIVOX_LOGO_BASE64}
                                  alt="Cretivox Logo"
                                  style={{ width: "155px", height: "auto" }}
                                  className="block object-contain"
                                  loading="eager"
                                  decoding="sync"
                                />
                              </div>
                              <div className="text-right text-[9.5px] text-black leading-tight space-y-0.5">
                                <p>Jl. Balap Sepeda No.6, RT. 15/RW. 1,</p>
                                <p>Jati, Kec. Pulo Gadung, Kota Jakarta Timur,</p>
                                <p>Daerah Khusus Ibukota Jakarta 13220</p>
                                <p className="font-semibold text-black pt-0.5">www.cretivox.com</p>
                              </div>
                            </div>

                            {/* Document Title */}
                            <div className="text-center my-2">
                              <h1 className="text-[17px] font-bold text-black tracking-wide">
                                Consent Form
                              </h1>
                            </div>

                            {/* Description Continuation on this page */}
                            {((idDescPages[pageIdx] && idDescPages[pageIdx].length > 0) ||
                              (enDescPages[pageIdx] && enDescPages[pageIdx].length > 0)) && (
                              <div className="grid grid-cols-2 gap-6 pt-0.5 text-black text-justify text-[11.2px] leading-[1.4] mb-2">
                                <div className="space-y-1.5 text-justify">
                                  {renderDescriptionPage(idDescPages[pageIdx])}
                                </div>
                                <div className="space-y-1.5 text-justify">
                                  {renderDescriptionPage(enDescPages[pageIdx])}
                                </div>
                              </div>
                            )}

                            {/* Two Column Clauses (Indonesian & English) if this is clausesOnPage */}
                            {clausesOnPage === pageNum && (
                              <div className="grid grid-cols-2 gap-6 pt-1 text-black text-justify text-[12px] leading-normal border-t border-zinc-100 mt-1">
                                <div className="space-y-2 text-justify">
                                  {renderClausesId()}
                                </div>
                                <div className="space-y-2 text-justify">
                                  {renderClausesEn()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* ========================================================
                      FINAL PAGE (SURAT PERJANJIAN & TANDA TANGAN)
                      Strict A4 paper (680 x 962 px)
                      Always the last page (Page totalNumPages)
                      ======================================================== */}
                  <div
                    ref={(el) => {
                      pageElementsRef.current[totalNumPages - 1] = el;
                    }}
                    className="w-[680px] h-[962px] min-w-[680px] min-h-[962px] max-w-[680px] max-h-[962px] bg-white text-black shadow-md shadow-zinc-400/30 border border-zinc-200/90 rounded-xs font-sans text-[12.5px] leading-[1.6] select-text flex flex-col justify-between shrink-0 box-border"
                    style={{
                      paddingTop: "50px",
                      paddingLeft: "60px",
                      paddingRight: "60px",
                      paddingBottom: "60px",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Top of Page: Official Kop Surat */}
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start pb-1 mb-3.5">
                        <div className="pt-0.5">
                          <img
                            src={CRETIVOX_LOGO_BASE64}
                            alt="Cretivox Logo"
                            style={{ width: "155px", height: "auto" }}
                            className="block object-contain"
                            loading="eager"
                            decoding="sync"
                          />
                        </div>
                        <div className="text-right text-[9.5px] text-black leading-tight space-y-0.5">
                          <p>Jl. Balap Sepeda No.6, RT. 15/RW. 1,</p>
                          <p>Jati, Kec. Pulo Gadung, Kota Jakarta Timur,</p>
                          <p>Daerah Khusus Ibukota Jakarta 13220</p>
                          <p className="font-semibold text-black pt-0.5">www.cretivox.com</p>
                        </div>
                      </div>

                      {/* Two-Column Fee & Compensation Clause */}
                      <div className="grid grid-cols-2 gap-6 text-black mb-7 text-justify text-[12.5px] leading-[1.6]">
                        <div>
                          <p className="text-black leading-relaxed text-justify">
                            Untuk pekerjaan ini, Pihak Kedua berhak mendapatkan imbalan (fee) sebesar {formattedFee} yang dibayarkan oleh pihak pertama dengan ketentuan, Pembayaran secara penuh, maksimal h+3 setelah content tayang.
                          </p>
                        </div>
                        <div>
                          <p className="text-black leading-relaxed text-justify">
                            For this assignment, the Second Party is entitled to a compensation (fee) of {formattedFeeEn}, to be paid in full by the First Party no later than three (3) business day after the content is published.
                          </p>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-2 mb-4">
                        <p className="font-bold text-black text-xs">Notes:</p>
                        <div className="min-h-40 pt-1 text-black">
                          {!isBlank && notesHtml && notesHtml.trim() && notesHtml !== "<br>" ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: notesHtml }}
                              className="text-black leading-relaxed rich-text-content text-[12.5px]"
                            />
                          ) : (
                            <div className="space-y-4 pt-1">
                              <div className="border-b border-dotted border-gray-300 h-5"></div>
                              <div className="border-b border-dotted border-gray-300 h-5"></div>
                              <div className="border-b border-dotted border-gray-300 h-5"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Signatures */}
                    <div className="flex flex-col">
                      <AlignedSignatureSection
                        currentDate={currentDate}
                        isBlank={isBlank}
                        talentName={talentName}
                        signatureImage={signatureImage}
                        cretivoxName={cretivoxName}
                        cretivoxSignatureImage={cretivoxSignatureImage}
                        pageNumber={`${totalNumPages} / ${totalNumPages}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default PdfViewer;
