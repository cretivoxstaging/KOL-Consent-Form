"use client";
import { autoTranslateTheme, autoTranslateDescription } from "@/lib/translate";
import React from "react";
import Image from "next/image";

interface ConsentDocumentSheetProps {
  contentTheme?: string;
  contentDescription?: string;
  translatedTheme?: string;
  translatedDesc?: string;
  publishedPlatforms?: string[];
  isBlank?: boolean;
  talentName?: string;
  notesHtml?: string;
  signatureImage?: string | null;
  currentDate?: string;
  forcePageMode?: "auto" | "single" | "two";
}

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

function cleanDescriptionText(raw?: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/<!--\s*published:\s*[\s\S]*?\s*-->/gi, "").trim();
  cleaned = cleaned.replace(/^(<p[^>]*>)?\s*(<strong>)?\s*(Deskripsi|Content)\s*(Konten|Description)\s*:?\s*(<\/strong>)?\s*(<\/p>)?/i, "").trim();
  return cleaned;
}

export default function ConsentDocumentSheet({
  contentTheme = "Food Review",
  contentDescription = "Konten review makanan dengan storytelling",
  translatedTheme = "",
  translatedDesc = "",
  publishedPlatforms = [],
  isBlank = false,
  talentName = "",
  notesHtml = "",
  signatureImage = null,
  currentDate = "24 June 2026",
  forcePageMode = "auto",
}: ConsentDocumentSheetProps) {
  const effectivePlatforms = React.useMemo(() => {
    if (publishedPlatforms && publishedPlatforms.length > 0) return publishedPlatforms;
    return parsePublishedPlatforms(contentDescription);
  }, [publishedPlatforms, contentDescription]);

  const cleanedDesc = React.useMemo(() => cleanDescriptionText(contentDescription), [contentDescription]);
  const isFilled = !isBlank && Boolean(talentName?.trim());

  // Detect if notes content is substantial enough to warrant a 2nd A4 sheet
  const plainNotes = notesHtml ? notesHtml.replace(/<[^>]*>/g, "").trim() : "";
  const listItemsCount = (notesHtml?.match(/<li/g) || []).length;
  const paragraphsCount = (notesHtml?.match(/<p/g) || []).length;

  const autoExceedsA4 =
    plainNotes.length > 170 || listItemsCount >= 3 || paragraphsCount >= 4;

  const isTwoPages =
    forcePageMode === "two"
      ? true
      : forcePageMode === "single"
        ? false
        : autoExceedsA4;

  return (
    <div className="w-full flex flex-col items-center gap-8 py-2">
      {/* ========================================================
          PAGE 1 (Halaman 1)
          ======================================================== */}
      <div className="w-full max-w-170 min-h-240 aspect-210/297 bg-white text-black p-6 sm:p-10 md:p-12 shadow-xl border border-gray-300 rounded-xs font-sans text-[11px] sm:text-[11.5px] leading-[1.6] select-text flex flex-col justify-between shrink-0 print:shadow-none print:border-none print:m-0 print:p-8 break-after-page">
        {/* Top & Agreement Clauses */}
        <div className="flex flex-col">
          {/* Header: Logo & Address */}
          <div className="flex justify-between items-start pb-1 mb-2">
            <div className="w-36 sm:w-44 pt-0.5">
              <Image
                src="/logo-cretivox-black.png"
                alt="Cretivox Logo"
                width={180}
                height={44}
                priority
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
            <div className="text-right text-[9.5px] sm:text-[10px] text-black leading-tight space-y-0.5">
              <p>Jl. Balap Sepeda No.6, RT. 15/RW. 1,</p>
              <p>Jati, Kec. Pulo Gadung, Kota Jakarta Timur,</p>
              <p>Daerah Khusus Ibukota Jakarta 13220</p>
              <p className="font-semibold text-black pt-0.5">www.cretivox.com</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-2">
            <h1 className="text-sm sm:text-base font-semibold text-black">
              Consent Form
            </h1>
          </div>

          {/* Two Columns Bilingual Clauses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-7 pt-1 text-black text-justify">
            {/* Left Column (Bahasa Indonesia) */}
            <div className="space-y-2.5 sm:space-y-3 text-justify">
              <p className="text-black">
                Terima kasih atas ketersediaan anda untuk menjadi{" "}
                <span className="italic">talent</span> Cretivox.
              </p>

              <p className="text-black leading-relaxed">
                Cretivox adalah sebuah{" "}
                <span className="italic">Multi-Platform Entertainment Media</span> untuk berbagi
                dan mendengar cerita sekitar kehidupan, yang diharapkan mampu memberikan
                kebahagiaan, serta menambah wawasan dan sudut pandang kepada mereka yang
                ingin terus berkembang.
              </p>

              <p className="text-black leading-relaxed">
                Saya,{" "}
                {isFilled ? (
                  <span className="font-bold underline decoration-black decoration-1 underline-offset-2">
                    {talentName.trim()}
                  </span>
                ) : (
                  <span>________________________</span>
                )}
                , bersedia untuk menjadi <span className="italic">talent</span> Cretivox untuk
                content berikut.
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

              <div>
                <p className="text-black leading-relaxed text-justify">
                  <span className="font-semibold">Deskripsi Konten : </span>
                  <span dangerouslySetInnerHTML={{ __html: cleanedDesc }} />
                </p>
              </div>

              <div>
                <p className="text-black">
                  Dengan menandatangani lembar ini, saya setuju dengan pernyataan-pernyataan
                  di bawah ini:
                </p>
              </div>

              <p className="text-black leading-relaxed">
                Saya menyatakan bahwa seluruh perkataan dan tindakan saya dilakukan atas
                kehendak sendiri tanpa paksaan, di mana saya memegang hak penuh serta
                tanggung jawab atas konten yang saya sampaikan. Saya menyetujui bahwa proses
                syuting akan direkam oleh Cretivox dan hasilnya menjadi hak milik mereka,
                serta memberikan wewenang penuh kepada Cretivox untuk mempublikasikan
                rekaman tersebut di seluruh platform media mereka.
              </p>

              {/* Notes on Page 1 */}
              <div className="pt-1.5">
                <p className="font-bold text-black mb-0.5">Notes:</p>
                {isTwoPages ? (
                  <p className="text-[10.5px] text-gray-500 italic">
                    (Rincian catatan talent lengkap dilampirkan pada Lembar 2)
                  </p>
                ) : !isBlank && notesHtml && notesHtml.trim() && notesHtml !== "<br>" ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: notesHtml }}
                    className="text-black leading-relaxed rich-text-content [&>p]:mb-1 text-[11px] sm:text-[11.5px]"
                  />
                ) : (
                  <div className="h-4"></div>
                )}
              </div>
            </div>

            {/* Right Column (English) */}
            <div className="space-y-2.5 sm:space-y-3 text-justify">
              <p className="text-black">
                Thank you for your willingness to partake as a talent of Cretivox.
              </p>

              <p className="text-black leading-relaxed">
                Cretivox is a Multi-Platform Entertainment Media where one can share and
                listen to stories about life, which are expected to provide happiness, as
                well as insight and perspective to those who want to continue to develop.
              </p>

              <p className="text-black leading-relaxed">
                I,{" "}
                {isFilled ? (
                  <span className="font-bold underline decoration-black decoration-1 underline-offset-2">
                    {talentName.trim()}
                  </span>
                ) : (
                  <span>________________________</span>
                )}
                , agree to take part as a talent of Cretivox for the content described below.
              </p>

              <div>
                <p className="text-black font-semibold text-left">
                  Content theme: {translatedTheme || autoTranslateTheme(contentTheme)}
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

              <div>
                <p className="text-black leading-relaxed text-justify">
                  <span className="font-semibold">Content Description : </span>
                  <span dangerouslySetInnerHTML={{ __html: translatedDesc || autoTranslateDescription(cleanedDesc) }} />
                </p>
              </div>

              <div>
                <p className="text-black">
                  By signing this form, I agree to the following statements:
                </p>
              </div>

              <p className="text-black leading-relaxed">
                I declare that all my words and actions are entirely voluntary and without
                coercion, and I assume full responsibility for the content I express. I
                acknowledge that the content belongs to Cretivox, consent to the recording
                process, and grant Cretivox full authority to publish the footage across all
                their media platforms.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom of Page 1: Signatures (if single page) */}
        {!isTwoPages && (
          <SignatureAndDateSection
            currentDate={currentDate}
            isBlank={isBlank}
            isFilled={isFilled}
            talentName={talentName}
            signatureImage={signatureImage}
          />
        )}
      </div>

      {/* ========================================================
          PAGE 2 (Halaman 2 - Jika Teks/Notes Melebihi A4)
          ======================================================== */}
      {isTwoPages && (
        <div className="w-full max-w-170 min-h-240 aspect-210/297 bg-white text-black p-6 sm:p-10 md:p-12 shadow-xl border border-gray-300 rounded-xs font-sans text-[11px] sm:text-[11.5px] leading-[1.6] select-text flex flex-col justify-between shrink-0 print:shadow-none print:border-none print:m-0 print:p-8 break-before-page">
          {/* Top: Header & Full Notes */}
          <div className="flex flex-col">
            {/* Header Page 2 */}
            <div className="flex justify-between items-start pb-1 mb-3 sm:mb-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-cretivox-black.png"
                  alt="Cretivox Logo"
                  width={140}
                  height={34}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div className="text-right text-[9.5px] text-gray-600 leading-tight">
                <p>Jakarta, {currentDate}</p>
                <p className="font-semibold text-black">www.cretivox.com</p>
              </div>
            </div>

            {/* Title Section Page 2 */}
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-black tracking-tight mb-1">
                Lampiran Catatan Tambahan (Notes)
              </h2>
              <p className="text-xs text-gray-600">
                Catatan khusus dan rincian teknis dari talent untuk kegiatan syuting Cretivox:
              </p>
            </div>

            {/* Notes Section - Polosan on clean A4 page */}
            <div className="py-3 px-1 min-h-55">
              {!isBlank && notesHtml && notesHtml.trim() && notesHtml !== "<br>" ? (
                <div
                  dangerouslySetInnerHTML={{ __html: notesHtml }}
                  className="text-black leading-relaxed rich-text-content [&>p]:mb-2 text-xs sm:text-sm"
                />
              ) : (
                <p className="text-xs text-gray-400 italic">
                  - (Tidak ada catatan tambahan yang diisi)
                </p>
              )}
            </div>
          </div>

          {/* Bottom of Page 2: Signatures & Page 2 Footer */}
          <SignatureAndDateSection
            currentDate={currentDate}
            isBlank={isBlank}
            isFilled={isFilled}
            talentName={talentName}
            signatureImage={signatureImage}
            pageLabel="Halaman 2 dari 2"
          />
        </div>
      )}
    </div>
  );
}

{/* ========================================================
    REUSABLE SIGNATURE & DATE COMPONENT WITH 100% PRECISION
    ======================================================== */}
interface SignatureSectionProps {
  currentDate: string;
  isBlank: boolean;
  isFilled: boolean;
  talentName: string;
  signatureImage: string | null;
  pageLabel?: string;
}

function SignatureAndDateSection({
  currentDate,
  isBlank,
  isFilled,
  talentName,
  signatureImage,
  pageLabel,
}: SignatureSectionProps) {
  return (
    <div className="pt-6 sm:pt-8 mt-auto flex flex-col w-full">
      {/* Date - aligned strictly above the Right signature column */}
      <div className="grid grid-cols-2 gap-8 sm:gap-12 mb-3 px-2 sm:px-4">
        <div></div>
        <div className="text-center">
          <p className="text-[11px] sm:text-xs text-black font-normal">
            Jakarta, {currentDate}
          </p>
        </div>
      </div>

      {/* Two-column Signatures: 100% Symmetric, Equal Baselines, Equal Heights */}
      <div className="grid grid-cols-2 gap-8 sm:gap-12 px-2 sm:px-4 items-start">
        {/* Left: Pihak Cretivox */}
        <div className="flex flex-col items-center">
          {/* Drawing area: exactly 56px height */}
          <div className="h-14 w-full flex items-end justify-center pb-0.5"></div>

          {/* Line container: exact 24px height with baseline border */}
          <div className="flex items-center w-full max-w-55 h-6 border-b border-black relative">
            <span className="absolute left-0 -bottom-0.5 text-xs font-normal text-black select-none">
              (
            </span>
            <div className="w-full"></div>
            <span className="absolute right-0 -bottom-0.5 text-xs font-normal text-black select-none">
              )
            </span>
          </div>

          {/* Label: exact same height, font-size, and font-weight (font-bold) */}
          <div className="flex flex-col items-center justify-center mt-2">
            <p className="text-[11px] sm:text-xs text-black text-center font-bold">
              Pihak Cretivox
            </p>
          </div>
        </div>

        {/* Right: Talent Cretivox */}
        <div className="flex flex-col items-center">
          {/* Drawing area: exactly 56px height, aligns signature at the bottom close to line */}
          <div className="h-14 w-full flex items-end justify-center pb-0.5">
            {!isBlank && signatureImage ? (
              <img
                src={signatureImage}
                alt="Tanda Tangan Talent"
                className="max-h-13 max-w-45 object-contain"
              />
            ) : null}
          </div>

          {/* Line container: exact same 24px height with identical baseline border */}
          <div className="flex items-center w-full max-w-55 h-6 border-b border-black relative">
            <span className="absolute left-0 -bottom-0.5 text-xs font-normal text-black select-none">
              (
            </span>
            <div className="w-full"></div>
            <span className="absolute right-0 -bottom-0.5 text-xs font-normal text-black select-none">
              )
            </span>
          </div>

          {/* Label: exact same height, font-size, and font-weight (font-bold) */}
          <div className="flex flex-col items-center justify-center mt-2">
            <p className="text-[11px] sm:text-xs text-black text-center font-bold">
              Talent Cretivox
            </p>
            {isFilled && talentName.trim() && (
              <p className="text-[11px] sm:text-xs text-black font-normal mt-0.5 text-center">
                {talentName.trim()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
