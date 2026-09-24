"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  RotateCcw,
  PenTool,
  FileCheck,
  Check,
  FileText,
  Eye,
  X,
  Download,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import PdfViewer, { PdfViewerHandle } from "./PdfViewer";
import { decodeHashId } from "@/lib/hashId";
import { autoTranslateTheme, autoTranslateDescription } from "@/lib/translate";
import { downloadOrSharePdf } from "@/lib/pdfDownload";

export type Lang = "ID" | "EN";

const content = {
  ID: {
    headerDesc:
      "Formulir ini merupakan bentuk persetujuan resmi atas partisipasi Anda sebagai talent dalam produksi konten Cretivox. Silakan tinjau dokumen di bawah ini dan lengkapi data Anda.",
    docSheetTitle: "Lembar Dokumen Consent Form (PDF)",
    openPdf: "Buka File PDF",
    openPdfTitle: "Buka PDF di tab baru",
    docSheetDesc:
      "Silakan baca seluruh isi lembaran persetujuan di bawah ini sebelum mengisi data Anda.",
    fullNameLabel: "Nama Lengkap",
    filledBadge: "Terisi",
    namePlaceholder: "Masukkan nama lengkap",
    nameSentencePrefix: "Nama ini akan mengisi kalimat:",
    nameSentenceQuote: (name: string) =>
      `"Saya, ${name || "________________________"}, bersedia untuk menjadi talent..."`,
    notesLabel: "Catatan Tambahan",
    notesPlaceholder:
      "Tulis catatan di sini... Gunakan tombol toolbar untuk Bold, Italic, atau Bullet points. Tekan Enter untuk baris baru.",
    signatureLabel: "Tanda Tangan KOL",
    clearSignature: "Hapus Tanda Tangan",
    signPrompt: "Bubuhkan tanda tangan di area ini",
    signDeviceHint: "(Gunakan mouse atau sentuhan layar ponsel/tablet)",
    signatureNote: "Tanda tangan ini akan dicantumkan pada lembar persetujuan",
    readyBadge: "Siap",
    previewBtn: "Preview Consent Form Terisi",
    previewBadge: "✓ Data Siap Ditinjau",
    submitBtn: "Submit & Agree",
    formIncompleteNote: "Lengkapi data wajib (*): nama & tanda tangan KOL serta Pihak Cretivox.",
    // Success State
    successTitle: "Persetujuan Berhasil Terkirim!",
    successDesc: (name: string, time: string) =>
      `Terima kasih, ${name}. Lembar consent form telah ditandatangani dan diverifikasi pada ${time}.`,
    talentNameRow: "Nama Talent:",
    statusRow: "Status Dokumen:",
    statusApproved: "Disetujui & Bertanda Tangan",
    notesRow: "Catatan Tambahan:",
    aiConsentLabel: "Persetujuan Penggunaan AI (Poin 7)",
    aiConsentDesc: "Saya memberikan wewenang kepada Cretivox untuk menggunakan teknologi AI guna memodifikasi atau mereplikasi wajah, suara, penampilan fisik, dan ucapan saya secara digital di dalam konten.",
    aiConsentYes: "Bersedia",
    aiConsentNo: "Tidak Bersedia",
    aiConsentSentencePrefix: "Pilihan ini akan mengisi kalimat:",
    aiConsentSentenceQuote: (consent: boolean) =>
      `"Saya ${consent ? "bersedia" : "tidak bersedia"} memberikan wewenang kepada Cretivox untuk menggunakan teknologi AI guna memodifikasi atau mereplikasi wajah, suara, penampilan fisik, dan ucapan saya secara digital di dalam konten."`,
    aiConsentRow: "AI Usage Consent:",
    btnReset: "Isi Ulang",
    cretivoxSectionTitle: "Pihak Cretivox",
    cretivoxNameLabel: "Nama Pihak Cretivox",
    cretivoxNamePlaceholder: "Masukkan nama perwakilan Cretivox",
    cretivoxSignatureLabel: "Pihak Cretivox",
    cretivoxClearSignature: "Hapus Tanda Tangan",
    cretivoxSignPrompt: "Bubuhkan tanda tangan perwakilan Cretivox di area ini",
    cretivoxSignatureNote: "Tanda tangan ini akan dicantumkan pada kolom Pihak Cretivox di lembar persetujuan",
    cretivoxNameRow: "Pihak Cretivox:",
    btnDownloadFilled: "Unduh Dokumen PDF",
    downloadingPdf: "Menyiapkan PDF...",
    btnPrint: "Cetak Lembar",
    // Modal
    modalHeader: "Pratinjau Dokumen Consent Form (A4)",
    tabFilled: "Dokumen Terisi Lengkap",
    tabBlank: "Dokumen Kosong (Template)",
    closeModalTitle: "Tutup (Esc)",
  },
  EN: {
    headerDesc:
      "This form serves as an official agreement for your participation as a talent in Cretivox's content production. Please review the document below and complete your details.",
    docSheetTitle: "Consent Form Document Sheet (PDF)",
    openPdf: "Open PDF File",
    openPdfTitle: "Open PDF in new tab",
    docSheetDesc:
      "Please review the entire agreement document below before completing your details.",
    fullNameLabel: "Full Name",
    filledBadge: "Filled",
    namePlaceholder: "Enter full name",
    nameSentencePrefix: "This name will fill the clause:",
    nameSentenceQuote: (name: string) =>
      `"I, ${name || "________________________"}, hereby agree to participate as a talent..."`,
    notesLabel: "Additional Notes",
    notesPlaceholder:
      "Write notes here... Use toolbar buttons for Bold, Italic, or Bullet points. Press Enter for line breaks.",
    signatureLabel: "KOL Signature",
    clearSignature: "Clear Signature",
    signPrompt: "Provide your signature in this area",
    signDeviceHint: "(Use mouse or touch on mobile/tablet screen)",
    signatureNote: "This signature will be placed on the agreement sheet",
    readyBadge: "Ready",
    previewBtn: "Preview Filled Consent Form",
    previewBadge: "✓ Data Ready for Review",
    submitBtn: "Submit & Agree",
    formIncompleteNote: "Please complete required fields (*): KOL and Cretivox representative name & signature.",
    // Success State
    successTitle: "Agreement Successfully Submitted!",
    successDesc: (name: string, time: string) =>
      `Thank you, ${name}. The consent form has been signed and verified on ${time}.`,
    talentNameRow: "Talent Name:",
    statusRow: "Document Status:",
    statusApproved: "Approved & Signed",
    notesRow: "Additional Notes:",
    aiConsentLabel: "AI Usage Consent (Point 7)",
    aiConsentDesc: "I authorize Cretivox to use AI technology to modify or replicate my face, voice, physical appearance, and speech digitally within the content.",
    aiConsentYes: "Authorized",
    aiConsentNo: "Do Not Authorize",
    aiConsentSentencePrefix: "This choice will fill the clause:",
    aiConsentSentenceQuote: (consent: boolean) =>
      `"I ${consent ? "authorize" : "do not authorize"} Cretivox to use AI technology to modify or replicate my face, voice, physical appearance, and speech digitally within the content."`,
    aiConsentRow: "AI Authorization (Point 7):",
    btnReset: "Fill Again",
    cretivoxSectionTitle: "Cretivox Representative",
    cretivoxNameLabel: "Cretivox Representative Name",
    cretivoxNamePlaceholder: "Enter Cretivox representative name",
    cretivoxSignatureLabel: "Cretivox Representative",
    cretivoxClearSignature: "Clear Signature",
    cretivoxSignPrompt: "Provide Cretivox representative signature in this area",
    cretivoxSignatureNote: "This signature will be placed in the Cretivox Representative column on the agreement sheet",
    cretivoxNameRow: "Cretivox Representative:",
    btnDownloadFilled: "Download Filled PDF Document",
    downloadingPdf: "Preparing PDF...",
    btnPrint: "Print Sheet",
    // Modal
    modalHeader: "Consent Form Document Preview (A4)",
    tabFilled: "Complete Filled Document",
    tabBlank: "Blank Document (Template)",
    closeModalTitle: "Close (Esc)",
  },
};

export interface TalentConsentFormProps {
  templateId?: string | number;
}

export default function TalentConsentForm({ templateId }: TalentConsentFormProps = {}) {
  const [lang, setLang] = useState<Lang>("ID");

  const [contentTheme, setContentTheme] = useState<string>("");
  const [contentDescription, setContentDescription] = useState<string>("");
  const [translatedTheme, setTranslatedTheme] = useState<string>("");
  const [translatedDesc, setTranslatedDesc] = useState<string>("");
  const [fee, setFee] = useState<number | string>(500000);
  const [publishedPlatforms, setPublishedPlatforms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [linkError, setLinkError] = useState<"invalid" | "not_found" | null>(null);

  useEffect(() => {
    const fetchActiveThemeAndFee = async () => {
      try {
        setIsLoadingData(true);
        setLinkError(null);
        const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const rawTargetId = templateId || searchParams?.get("id");

        if (!rawTargetId) {
          // No hash was provided. Form can only be accessed via valid hash.
          setLinkError("invalid");
          setIsLoadingData(false);
          return;
        }

        const resolvedTargetId = decodeHashId(rawTargetId);
        if (!resolvedTargetId) {
          setLinkError("invalid");
          setIsLoadingData(false);
          return;
        }

        // 1. Direct single fetch by hashId or resolvedTargetId (fastest, minimal payload)
        let activeThemeItem: any = null;
        try {
          const singleRes = await fetch(`/api/contenttheme/${rawTargetId}`).then((r) => r.json()).catch(() => null);
          if (singleRes && (singleRes.data || singleRes.content_theme)) {
            activeThemeItem = singleRes.data || singleRes;
          }
        } catch { }

        // Fallback to full list only if direct fetch didn't find the item
        if (!activeThemeItem) {
          try {
            const listRes = await fetch("/api/contenttheme").then((r) => r.json()).catch(() => null);
            const themeList = Array.isArray(listRes) ? listRes : Array.isArray(listRes?.data) ? listRes.data : null;
            if (themeList && themeList.length > 0) {
              activeThemeItem = themeList.find((t: any) => String(t.id) === String(resolvedTargetId));
            }
          } catch { }
        }

        if (!activeThemeItem) {
          setLinkError("not_found");
          setIsLoadingData(false);
          return;
        }

        let rawTheme = activeThemeItem.content_theme || "";
        let rawDesc = activeThemeItem.content_description || "";
        let extractedFee: number | string | null = null;
        let extractedPublished: string[] = [];

        // 1. Extract published platforms from activeThemeItem.published if available
        if (Array.isArray(activeThemeItem.published)) {
          extractedPublished = activeThemeItem.published.map((p: any) => String(p).trim()).filter(Boolean);
        } else if (typeof activeThemeItem.published === "string" && activeThemeItem.published.trim()) {
          try {
            const parsed = JSON.parse(activeThemeItem.published);
            if (Array.isArray(parsed)) {
              extractedPublished = parsed.map((p: any) => String(p).trim()).filter(Boolean);
            }
          } catch {
            extractedPublished = [activeThemeItem.published.trim()];
          }
        }

        // 2. Extract published platforms comment marker from rawDesc: <!-- published: [...] -->
        const pubMatch = rawDesc.match(/<!--\s*published:\s*([\s\S]*?)\s*-->/i);
        if (pubMatch && pubMatch[1]) {
          try {
            const parsed = JSON.parse(pubMatch[1]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              extractedPublished = parsed.map((p: any) => String(p).trim()).filter(Boolean);
            }
          } catch { }
          rawDesc = rawDesc.replace(/<!--\s*published:\s*[\s\S]*?\s*-->/gi, "").trim();
        }

        if (extractedPublished.length > 0) {
          setPublishedPlatforms(extractedPublished);
        }

        // Extract fee metadata if embedded: <!-- fee: 500000 -->
        const feeMatch = rawDesc.match(/<!--\s*fee:\s*(\d+)\s*-->/i);
        if (feeMatch) {
          extractedFee = Number(feeMatch[1]);
          rawDesc = rawDesc.replace(/<!--\s*fee:\s*\d+\s*-->/gi, "").trim();
        } else if (activeThemeItem.fee) {
          extractedFee = activeThemeItem.fee;
        }

        if (extractedFee !== null) {
          setFee(extractedFee);
        }

        // Populate theme, desc, and fast local translations
        if (rawTheme) {
          setContentTheme(rawTheme);
          setTranslatedTheme(autoTranslateTheme(rawTheme));
        }
        if (rawDesc) {
          setContentDescription(rawDesc);
          setTranslatedDesc(autoTranslateDescription(rawDesc));
        }

        // Translation refinement: wait for translation so UI is already in English when loading finishes
        const transPromises: Promise<void>[] = [];

        if (rawTheme) {
          transPromises.push(
            fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: rawTheme }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d?.translatedText) setTranslatedTheme(d.translatedText);
              })
              .catch(() => { })
          );
        }

        if (rawDesc) {
          transPromises.push(
            fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: rawDesc }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d?.translatedText) setTranslatedDesc(d.translatedText);
              })
              .catch(() => { })
          );
        }

        // Wait for translation to complete with a 3.5s safety timeout so loading never hangs
        if (transPromises.length > 0) {
          await Promise.race([
            Promise.all(transPromises),
            new Promise((res) => setTimeout(res, 3500)),
          ]);
        }
      } catch (err) {
        console.warn("Failed to fetch active theme & fee from API:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchActiveThemeAndFee();
  }, [templateId]);

  const [talentName, setTalentName] = useState("");
  const [notesHtml, setNotesHtml] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [aiConsent, setAiConsent] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTime, setSubmittedTime] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [cretivoxName, setCretivoxName] = useState("");
  const [cretivoxSignatureImage, setCretivoxSignatureImage] = useState<string | null>(null);
  const [hasCretivoxSignature, setHasCretivoxSignature] = useState(false);
  const [currentDateString, setCurrentDateString] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const cretivoxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCretivoxDrawing = useRef(false);

  const downloadViewerRef = useRef<PdfViewerHandle | null>(null);
  const [isDownloadingFilledPdf, setIsDownloadingFilledPdf] = useState(false);
  const [submittedPdfFile, setSubmittedPdfFile] = useState<File | null>(null);

  const hasSignatureRef = useRef(hasSignature);
  const hasCretivoxSignatureRef = useRef(hasCretivoxSignature);
  hasSignatureRef.current = hasSignature;
  hasCretivoxSignatureRef.current = hasCretivoxSignature;

  const t = content[lang];

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    const now = new Date();
    // Format: "15 September 2026" (day month year)
    setCurrentDateString(
      now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  // Setup canvas resolution and drawing context cleanly with DPR scaling
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    // Only assign width/height if dimensions changed, because assigning canvas.width clears canvas buffer!
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const setupCretivoxCanvas = () => {
    const canvas = cretivoxCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    // Only assign width/height if dimensions changed, because assigning canvas.width clears canvas buffer!
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (!isSubmitted) {
      const timer = setTimeout(() => {
        setupCanvas();
        setupCretivoxCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted]);

  useEffect(() => {
    const handleResize = () => {
      if (!hasSignatureRef.current) {
        setupCanvas();
      }
      if (!hasCretivoxSignatureRef.current) {
        setupCretivoxCanvas();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = rect.width > 0 ? (canvas.width / (window.devicePixelRatio || 1)) / rect.width : 1;
    const scaleY = rect.height > 0 ? (canvas.height / (window.devicePixelRatio || 1)) / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getCretivoxCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = cretivoxCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = rect.width > 0 ? (canvas.width / (window.devicePixelRatio || 1)) / rect.width : 1;
    const scaleY = rect.height > 0 ? (canvas.height / (window.devicePixelRatio || 1)) / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Safety check: ensure canvas dimensions match rendered rect on mobile
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);
    if (rect.width > 0 && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
      setupCanvas();
    }

    isDrawing.current = true;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  // Crop transparent whitespace around drawn signature to maximize natural visibility on document
  const getTrimmedSignature = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    const width = canvas.width;
    const height = canvas.height;

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      let hasInk = false;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 15) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hasInk = true;
          }
        }
      }

      if (!hasInk) {
        return canvas.toDataURL("image/png");
      }

      const padding = 10;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2);
      const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2);

      const trimmedCanvas = document.createElement("canvas");
      trimmedCanvas.width = cropWidth;
      trimmedCanvas.height = cropHeight;

      const trimmedCtx = trimmedCanvas.getContext("2d");
      if (!trimmedCtx) return canvas.toDataURL("image/png");

      trimmedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      return trimmedCanvas.toDataURL("image/png");
    } catch {
      return canvas.toDataURL("image/png");
    }
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.closePath();
      setSignatureImage(getTrimmedSignature(canvas));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset hardware transformation, clear entire bitmap buffer, and reset active path
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width + 100, canvas.height + 100);
    ctx.beginPath();

    // Re-setup scale and stroke context cleanly
    setupCanvas();

    setHasSignature(false);
    setSignatureImage(null);
  };

  const startCretivoxDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = cretivoxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Safety check: ensure canvas dimensions match rendered rect on mobile
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);
    if (rect.width > 0 && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
      setupCretivoxCanvas();
    }

    isCretivoxDrawing.current = true;
    const coords = getCretivoxCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const drawCretivox = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isCretivoxDrawing.current) return;
    e.preventDefault();
    const canvas = cretivoxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCretivoxCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    if (!hasCretivoxSignature) {
      setHasCretivoxSignature(true);
    }
  };

  const stopCretivoxDrawing = () => {
    if (!isCretivoxDrawing.current) return;
    isCretivoxDrawing.current = false;
    const canvas = cretivoxCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.closePath();
      setCretivoxSignatureImage(getTrimmedSignature(canvas));
    }
  };

  const clearCretivoxSignature = () => {
    const canvas = cretivoxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width + 100, canvas.height + 100);
    ctx.beginPath();
    setupCretivoxCanvas();

    setHasCretivoxSignature(false);
    setCretivoxSignatureImage(null);
  };

  const isFormValid =
    talentName.trim().length > 0 &&
    hasSignature &&
    cretivoxName.trim().length > 0 &&
    hasCretivoxSignature;
  const hasAnyInput = Boolean(
    talentName.trim().length > 0 ||
    hasSignature ||
    cretivoxName.trim().length > 0 ||
    hasCretivoxSignature ||
    (notesHtml && notesHtml.trim().length > 0 && notesHtml !== "<br>" && notesHtml !== "<div><br></div>")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleanName = talentName.trim().replace(/\s+/g, "_");
      const pdfFilename = `Consent_Form_${cleanName}.pdf`;

      // Safety: extract signature directly from canvas if state is not yet populated
      let currentTalentSig = signatureImage;
      if ((!currentTalentSig || currentTalentSig === "") && canvasRef.current && hasSignature) {
        currentTalentSig = getTrimmedSignature(canvasRef.current);
        setSignatureImage(currentTalentSig);
      }
      let currentCretivoxSig = cretivoxSignatureImage;
      if ((!currentCretivoxSig || currentCretivoxSig === "") && cretivoxCanvasRef.current && hasCretivoxSignature) {
        currentCretivoxSig = getTrimmedSignature(cretivoxCanvasRef.current);
        setCretivoxSignatureImage(currentCretivoxSig);
      }

      // Small tick to ensure React flushes updated signature props to hidden PDF renderer
      await new Promise((r) => setTimeout(r, 120));

      let pdfFile: File | null = null;
      let pdfDataUrl: string = "";

      if (downloadViewerRef.current) {
        if (downloadViewerRef.current.generatePdfFile) {
          pdfFile = await downloadViewerRef.current.generatePdfFile(pdfFilename);
        } else if (downloadViewerRef.current.generatePdfDataUrl) {
          pdfDataUrl = (await downloadViewerRef.current.generatePdfDataUrl()) || "";
        }
      }

      const now = new Date();
      const formattedDate = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const formatNotesToSemicolonSeparated = (html: string): string => {
        if (!html) return "-";
        let text = html;

        // Pisahkan item list (bullet point / numbered list) dengan titik koma ( ; )
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, p1) => {
          const clean = p1.replace(/<[^>]*>/g, "").trim();
          return clean ? clean + " ; " : "";
        });

        // Pisahkan tag block baris baru (p, div, br) dengan titik koma ( ; )
        text = text.replace(/<br\s*[\/]?>/gi, " ; ");
        text = text.replace(/<\/p>/gi, " ; ");
        text = text.replace(/<\/div>/gi, " ; ");

        // Hilangkan tag HTML tersisa (bold, italic, underline, ul, ol, dll)
        text = text.replace(/<[^>]*>/g, " ");

        // Decode entitas HTML umum jika ada
        text = text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");

        // Rapikan spasi dan titik koma berlebih
        text = text.replace(/\s+/g, " ");
        text = text.replace(/;\s*;+/g, ";");
        text = text.replace(/\s*;\s*/g, " ; ");
        text = text.trim();
        text = text.replace(/^;\s*/, "").replace(/;\s*$/, "").trim();

        return text || "-";
      };

      const plainNotes = formatNotesToSemicolonSeparated(notesHtml);

      const formData = new FormData();
      formData.append("talent_name", talentName.trim());
      formData.append("cretivox_name", cretivoxName.trim());
      formData.append("AI_content_approval", String(aiConsent));
      formData.append("talent_notes", plainNotes || notesHtml || "-");
      formData.append("fee", String(fee));
      formData.append("date", formattedDate);
      formData.append("content_theme", contentTheme);
      formData.append("content_description", contentDescription);
      if (publishedPlatforms && publishedPlatforms.length > 0) {
        formData.append("published", JSON.stringify(publishedPlatforms));
      }

      if (pdfFile) {
        formData.append("pdf_consent_form", pdfFile, pdfFilename);
      } else if (pdfDataUrl) {
        formData.append("pdf_consent_form", pdfDataUrl);
      }

      let res = await fetch("/api/consentform", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Fallback JSON POST if server expects JSON
        res = await fetch("/api/consentform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            talent_name: talentName.trim(),
            cretivox_name: cretivoxName.trim(),
            AI_content_approval: Boolean(aiConsent),
            talent_notes: plainNotes || notesHtml || "-",
            fee: String(fee),
            date: formattedDate,
            pdf_consent_form: pdfDataUrl || (pdfFile ? pdfFile.name : ""),
            content_theme: contentTheme,
            content_description: contentDescription,
            published: publishedPlatforms && publishedPlatforms.length > 0 ? JSON.stringify(publishedPlatforms) : null,
          }),
        });
      }

      if (pdfFile) {
        setSubmittedPdfFile(pdfFile);
      }

      setSubmittedTime(
        now.toLocaleDateString(lang === "ID" ? "id-ID" : "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting consent form to API:", err);
      alert("Gagal mengirim data ke server. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTalentName("");
    setNotesHtml("");
    setHasSignature(false);
    setSignatureImage(null);
    setCretivoxName("");
    setHasCretivoxSignature(false);
    setCretivoxSignatureImage(null);
    setAiConsent(true);
    setSubmittedPdfFile(null);
    setIsSubmitted(false);

    // Re-initialize both signature canvases after form view remounts
    setTimeout(() => {
      clearSignature();
      clearCretivoxSignature();
      setupCanvas();
      setupCretivoxCanvas();
    }, 50);
  };

  const handleDownloadFilledPdf = async () => {
    try {
      setIsDownloadingFilledPdf(true);
      const filename = talentName.trim()
        ? `Consent Form - ${talentName.trim()}.pdf`
        : "Consent Form - Cretivox.pdf";

      if (submittedPdfFile) {
        // Direct download or native iOS Share Sheet ("Save to Files" / AirDrop / WhatsApp)
        // using the already-generated PDF file from submission (0ms delay, preserves user gesture)
        await downloadOrSharePdf(submittedPdfFile, filename);
      } else if (downloadViewerRef.current) {
        // Fallback re-generating via viewer handle
        await downloadViewerRef.current.downloadPdf();
      }
    } catch (err) {
      console.error("Failed to download filled PDF:", err);
    } finally {
      setIsDownloadingFilledPdf(false);
    }
  };


  return (
    <main className="min-h-dvh bg-zinc-50 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-size-[16px_16px] px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-10 flex flex-col items-center justify-center font-sans antialiased text-zinc-900 selection:bg-zinc-900/20 relative">
      {/* Language Switcher Pill matching user design (hidden when link is disabled/invalid) */}
      {!linkError && (
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-20">
          <div className="inline-flex items-center border border-zinc-200 bg-white rounded-full p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setLang("ID")}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-tight transition-all cursor-pointer ${lang === "ID"
                ? "bg-zinc-950 text-white"
                : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang("EN")}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-tight transition-all cursor-pointer ${lang === "EN"
                ? "bg-zinc-950 text-white"
                : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              EN
            </button>
          </div>
        </div>
      )}

      {linkError ? (
        /* Minimalist Error Screen matching Cretivox Invalid Emoticon design */
        <div className="fixed inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 select-none z-10">
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center">
              <img
                src="/logo-cretivox-black.png"
                alt="CRETIVOX"
                style={{ height: "clamp(42px, 7vh, 88px)" }}
                className="w-auto object-contain pointer-events-none select-none drop-shadow-xs"
              />
            </div>
            <div
              style={{
                width: "min(82vw, clamp(200px, 35vh, 370px))",
                height: "min(82vw, clamp(200px, 35vh, 370px))",
                marginTop: "clamp(-36px, -4.5vh, -18px)",
              }}
              className="relative flex items-center justify-center"
            >
              <img
                src="/Invalid Emoticon.png"
                alt="Sorry, Invalid URL :("
                className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
              />
            </div>

            <p
              style={{
                fontSize: "clamp(20px, 3vh, 36px)",
                marginTop: "clamp(-8px, -1vh, 2px)",
              }}
              className="font-extrabold text-zinc-950 tracking-tight"
            >
              Sorry, Invalid URL :(
            </p>
          </div>
        </div>
      ) : (
        /* Main Content Column (Matching FormKOL max-w-xl container) */
        <div className="w-full max-w-xl my-auto">
          <div className="transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-2">
            {/* Header Section (Logo, Title, & Description matching FormKOL layout & size) */}
            <div className="mb-4 sm:mb-8 flex flex-col items-center justify-center text-center">
              <div className="flex justify-center items-center w-full mb-2">
                <img
                  src="/src/logo-cretivox.png"
                  alt="Cretivox Logo"
                  className="h-24 sm:h-28 object-contain drop-shadow-xs filter contrast-125 pointer-events-none select-none"
                />
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-3">
                Consent Form
              </h1>

              <p className="text-xs sm:text-base text-zinc-600 max-w-lg mb-2 sm:mb-6 leading-relaxed px-1">
                {t.headerDesc}
              </p>
            </div>

            {/* Form / Result Card (Matching FormKOL rounded-3xl, borders, and shadows) */}
            {isSubmitted ? (
              /* Success State */
              <div className="relative space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-2xl shadow-zinc-200/50 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-2 flex items-center justify-center">
                  <img
                    src="/Character Berhasil.png"
                    alt="Persetujuan Berhasil"
                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-md animate-in zoom-in-75 duration-300"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-950 mb-1">
                    {t.successTitle}
                  </h2>
                  <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
                    {t.successDesc(talentName, submittedTime)}
                  </p>
                </div>

                <div className="w-full rounded-2xl bg-zinc-50 border border-zinc-200 p-5 text-left space-y-3 text-xs sm:text-sm text-zinc-700">
                  <div className="flex justify-between border-b border-zinc-200 pb-2">
                    <span className="text-zinc-500">{t.talentNameRow}</span>
                    <span className="font-semibold text-zinc-900">{talentName}</span>
                  </div>
                  {cretivoxName.trim() && (
                    <div className="flex justify-between border-b border-zinc-200 pb-2">
                      <span className="text-zinc-500">{t.cretivoxNameRow}</span>
                      <span className="font-semibold text-zinc-900">{cretivoxName.trim()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <span className="text-zinc-500">{t.aiConsentRow}</span>
                    <span
                      className={`font-semibold ${aiConsent ? "text-emerald-600" : "text-zinc-600"
                        }`}
                    >
                      {aiConsent ? t.aiConsentYes : t.aiConsentNo}
                    </span>
                  </div>
                  {notesHtml && (
                    <div className="border-b border-zinc-200 pb-3 pt-0.5">
                      <span className="text-zinc-500 block mb-1.5">{t.notesRow}</span>
                      <div
                        dangerouslySetInnerHTML={{ __html: notesHtml }}
                        className="bg-white p-3.5 rounded-xl border border-zinc-200 text-zinc-800 text-xs leading-relaxed rich-text-content [&_b]:font-semibold [&_i]:italic [&_u]:underline"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-zinc-500">{t.statusRow}</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> {t.statusApproved}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-2.5">
                  <button
                    type="button"
                    disabled={isDownloadingFilledPdf}
                    onClick={handleDownloadFilledPdf}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 font-bold text-sm text-white enabled:hover:bg-zinc-800 transition-all shadow-md shadow-zinc-950/20 enabled:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDownloadingFilledPdf ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t.downloadingPdf}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{t.btnDownloadFilled}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 text-center px-1">
                    <span>💡</span>
                    <span>
                      {lang === "ID"
                        ? "Pada iPhone / iPad, pilih \"Simpan ke File\" (Save to Files) pada menu berbagi untuk mengunduh PDF."
                        : "On iPhone / iPad, select \"Save to Files\" from the share menu to save the PDF."}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full h-11 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    {t.btnReset}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="relative space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-2xl shadow-zinc-200/50"
              >
                {/* SECTION: DIRECT CONSENT FORM DOCUMENT SHEET */}
                <section className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-900" />
                      <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                        {t.docSheetTitle}
                      </h2>
                    </div>


                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {t.docSheetDesc}
                  </p>

                  {/* Multi-page PDF Viewer with localized lang */}
                  <PdfViewer
                    fee={fee}
                    contentTheme={contentTheme}
                    contentDescription={contentDescription}
                    publishedPlatforms={publishedPlatforms}
                    translatedTheme={translatedTheme}
                    translatedDesc={translatedDesc}
                    isBlank={true}
                    showDownload={false}
                    currentDate={currentDateString || "15 September 2026"}
                    maxHeight="520px"
                    twoPagesDefault={true}
                    lang={lang}
                    isLoading={isLoadingData}
                  />
                </section>

                {/* SECTION: INTERACTIVE INPUTS */}
                <section className="space-y-5 border-t border-zinc-100 pt-5">
                  {/* 1. Dynamic Name Input */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="talentName"
                      className="text-sm font-semibold text-zinc-800 flex items-center justify-between"
                    >
                      <span>
                        {t.fullNameLabel} <span className="text-rose-500">*</span>
                      </span>
                      {talentName.trim().length > 0 && (
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {t.filledBadge}
                        </span>
                      )}
                    </label>
                    <input
                      id="talentName"
                      type="text"
                      required
                      value={talentName}
                      onChange={(e) => setTalentName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition-all placeholder-zinc-400 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    />
                    {/* Dynamic feedback sentence */}
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t.nameSentencePrefix}{" "}
                      <span className="font-semibold text-zinc-800 italic">
                        {t.nameSentenceQuote(talentName.trim())}
                      </span>
                    </p>
                  </div>

                  {/* 2. AI Technology Consent (Point 7) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs sm:text-sm font-semibold text-zinc-800">
                        <span>
                          {t.aiConsentLabel} <span className="text-rose-500">*</span>
                        </span>
                      </label>
                      <span
                        className={`shrink-0 whitespace-nowrap text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full transition-colors ${aiConsent
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                      >
                        {aiConsent ? t.aiConsentYes : t.aiConsentNo}
                      </span>
                    </div>

                    {/* Interactive card matching reference */}
                    <div
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={aiConsent}
                      onClick={() => setAiConsent((prev) => !prev)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          setAiConsent((prev) => !prev);
                        }
                      }}
                      className={`relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${aiConsent
                        ? "border-zinc-900 bg-zinc-50/70 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                        }`}
                    >
                      {/* Black checkbox box */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${aiConsent
                          ? "bg-zinc-950 text-white"
                          : "border-2 border-zinc-400 bg-white"
                          }`}
                      >
                        {aiConsent && <Check className="w-3.5 h-3.5 stroke-3" />}
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-normal">
                        {t.aiConsentDesc}
                      </p>
                    </div>

                    {/* Dynamic feedback sentence */}
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t.aiConsentSentencePrefix}{" "}
                      <span className="font-semibold text-zinc-800 italic">
                        {t.aiConsentSentenceQuote(aiConsent)}
                      </span>
                    </p>
                  </div>

                  {/* 3. Notes Input with Rich Text Editor */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-zinc-800">
                      {t.notesLabel}
                    </label>

                    <RichTextEditor
                      value={notesHtml}
                      onChange={setNotesHtml}
                      placeholder={t.notesPlaceholder}
                      minHeight="110px"
                      maxLength={3000}
                    />
                  </div>

                  {/* 3. Signature Area */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between min-h-7">
                      <label className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5 shrink-0">
                        <PenTool className="w-4 h-4 text-zinc-600" />
                        <span>
                          {t.signatureLabel} <span className="text-rose-500">*</span>
                        </span>
                      </label>
                      {hasSignature && (
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t.clearSignature}
                        </button>
                      )}
                    </div>

                    {/* Canvas Container */}
                    <div className="relative w-full h-44 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 overflow-hidden flex flex-col justify-center items-center select-none group touch-none">
                      {!hasSignature && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400 transition-opacity px-6 sm:px-10 text-center">
                          <PenTool className="w-6 h-6 mb-1.5 text-zinc-400 stroke-1 shrink-0" />
                          <span className="text-xs font-medium text-zinc-600 max-w-70 sm:max-w-xs leading-relaxed">
                            {t.signPrompt}
                          </span>
                          <span className="text-[11px] text-zinc-400 mt-1 max-w-65">
                            {t.signDeviceHint}
                          </span>
                        </div>
                      )}
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        onTouchCancel={stopDrawing}
                        className="block w-full h-full cursor-crosshair relative z-10 touch-none select-none"
                      />
                    </div>

                    {/* Status row below canvas */}
                    <div className="flex justify-between items-center px-1 text-xs text-zinc-400">
                      <span>{t.signatureNote}</span>
                      {hasSignature && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {t.readyBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5. Pihak Cretivox (Nama & Tanda Tangan) */}
                  <div className="pt-4 border-t border-zinc-200/80 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {t.cretivoxSectionTitle}
                      </span>
                    </div>

                    {/* Input Nama Pihak Cretivox */}
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="cretivoxName"
                        className="text-sm font-semibold text-zinc-800 flex items-center justify-between"
                      >
                        <span>
                          {t.cretivoxNameLabel} <span className="text-rose-500">*</span>
                        </span>
                        {cretivoxName.trim().length > 0 && (
                          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {t.filledBadge}
                          </span>
                        )}
                      </label>
                      <input
                        id="cretivoxName"
                        type="text"
                        required
                        value={cretivoxName}
                        onChange={(e) => setCretivoxName(e.target.value)}
                        placeholder={t.cretivoxNamePlaceholder}
                        className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition-all placeholder-zinc-400 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      />
                    </div>

                    {/* Tanda Tangan Pihak Cretivox */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between min-h-7">
                        <label className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5 shrink-0">
                          <PenTool className="w-4 h-4 text-zinc-600" />
                          <span>
                            {t.cretivoxSignatureLabel} <span className="text-rose-500">*</span>
                          </span>
                        </label>
                        {hasCretivoxSignature && (
                          <button
                            type="button"
                            onClick={clearCretivoxSignature}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t.cretivoxClearSignature}
                          </button>
                        )}
                      </div>

                      {/* Canvas Container */}
                      <div className="relative w-full h-44 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 overflow-hidden flex flex-col justify-center items-center select-none group touch-none">
                        {!hasCretivoxSignature && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400 transition-opacity px-6 sm:px-10 text-center">
                            <PenTool className="w-6 h-6 mb-1.5 text-zinc-400 stroke-1 shrink-0" />
                            <span className="text-xs font-medium text-zinc-600 max-w-70 sm:max-w-xs leading-relaxed">
                              {t.cretivoxSignPrompt}
                            </span>
                            <span className="text-[11px] text-zinc-400 mt-1 max-w-65">
                              {t.signDeviceHint}
                            </span>
                          </div>
                        )}
                        <canvas
                          ref={cretivoxCanvasRef}
                          onMouseDown={startCretivoxDrawing}
                          onMouseMove={drawCretivox}
                          onMouseUp={stopCretivoxDrawing}
                          onMouseLeave={stopCretivoxDrawing}
                          onTouchStart={startCretivoxDrawing}
                          onTouchMove={drawCretivox}
                          onTouchEnd={stopCretivoxDrawing}
                          onTouchCancel={stopCretivoxDrawing}
                          className="block w-full h-full cursor-crosshair relative z-10 touch-none select-none"
                        />
                      </div>

                      <div className="flex justify-between items-center px-1 text-xs text-zinc-400">
                        <span>{t.cretivoxSignatureNote}</span>
                        {hasCretivoxSignature && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {t.readyBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION: PREVIEW BUTTON & SUBMIT BUTTON (Matching FormKOL button aesthetics) */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white font-bold text-sm text-zinc-800 hover:bg-zinc-50 transition-all shadow-xs cursor-pointer gap-2"
                  >
                    <Eye className="w-4 h-4 text-zinc-800" />
                    <span>{t.previewBtn}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-xl enabled:bg-zinc-900 px-8 text-base font-bold enabled:text-white transition-all enabled:hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/20 enabled:shadow-xl enabled:shadow-zinc-900/20 enabled:cursor-pointer disabled:cursor-not-allowed disabled:border disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      <span>{isSubmitting ? "Mengirim..." : t.submitBtn}</span>
                    </span>
                  </button>
                </div>
                {!isFormValid && (
                  <p className="text-center text-xs text-zinc-400 -mt-1">
                    {t.formIncompleteNote}
                  </p>
                )}
              </form>
            )}

            {/* Footer info */}
            <footer className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs text-zinc-400 select-none pb-2">
              {/* Powered by CreTech */}
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-medium tracking-wide text-zinc-400 lowercase">
                  powered by
                </span>
                <img
                  src="/logo cretech.png"
                  alt="CreTech"
                  className="h-5 sm:h-5.5 w-auto object-contain select-none pointer-events-none opacity-90"
                />
              </div>

              <p className="text-[11px] text-zinc-400">
                © {new Date().getFullYear()} Cretivox Broadcasting Network. All rights reserved.
              </p>
            </footer>
          </div>
        </div>
      )}

      {/* POP-UP MODAL PREVIEW (DOCUMENT VIEWER) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-zinc-200 text-xs select-none">
              <div className="flex items-center gap-2">
                <img
                  src="/src/logo-cretivox.png"
                  alt="Cretivox"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-zinc-300">|</span>
                <span className="font-semibold text-zinc-800 text-xs">
                  {t.modalHeader}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                title={t.closeModalTitle}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Viewer in Modal */}
            <PdfViewer
              fee={fee}
              contentTheme={contentTheme}
              contentDescription={contentDescription}
              publishedPlatforms={publishedPlatforms}
              translatedTheme={translatedTheme}
              translatedDesc={translatedDesc}
              isBlank={false}
              talentName={talentName}
              notesHtml={notesHtml}
              signatureImage={signatureImage}
              cretivoxName={cretivoxName}
              cretivoxSignatureImage={cretivoxSignatureImage}
              currentDate={currentDateString || "15 September 2026"}
              maxHeight="78vh"
              isModal={true}
              onClose={() => setIsModalOpen(false)}
              twoPagesDefault={true}
              lang={lang}
              aiConsent={aiConsent}
            />
          </div>
        </div>
      )}
      {/* Off-screen document renderer used for direct filled PDF download upon submission (fixed at 0,0 with tiny opacity so mobile browsers decode all image textures) */}
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 pointer-events-none select-none overflow-hidden"
        style={{ width: "750px", height: "1100px", opacity: 0.005, zIndex: -9999 }}
      >
        <PdfViewer
          fee={fee}
          contentTheme={contentTheme}
          contentDescription={contentDescription}
          publishedPlatforms={publishedPlatforms}
          ref={downloadViewerRef}
          isBlank={false}
          talentName={talentName}
          notesHtml={notesHtml}
          signatureImage={signatureImage}
          cretivoxName={cretivoxName}
          cretivoxSignatureImage={cretivoxSignatureImage}
          currentDate={currentDateString || "15 September 2026"}
          lang={lang}
          initialZoom={100}
          twoPagesDefault={true}
          aiConsent={aiConsent}
        />
      </div>

      {/* FULL-SCREEN SUBMITTING LOADING OVERLAY - MATCHING PROTOTYPE */}
      {isSubmitting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[2px] transition-all animate-in fade-in duration-300 select-none px-4"
        >
          <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
            {/* Character Face Icon */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-4 flex items-center justify-center">
              <img
                src="/Character Loading.png"
                alt="Loading character"
                className="w-full h-full object-contain drop-shadow-2xl select-none pointer-events-none"
              />
            </div>

            {/* Typography with Animated Sequential Dots */}
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md flex items-baseline justify-center">
              <span>Tunggu sebentar ya</span>
              <span className="inline-flex w-8 text-left font-black tracking-wider ml-0.5 select-none">
                <span className="loading-dot-1 inline-block">.</span>
                <span className="loading-dot-2 inline-block">.</span>
                <span className="loading-dot-3 inline-block">.</span>
              </span>
            </h3>
          </div>
        </div>
      )}
    </main>
  );
}
