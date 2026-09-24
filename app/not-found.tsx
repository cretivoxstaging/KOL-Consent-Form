"use client";

import React from "react";

export default function NotFound() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 select-none z-50 bg-zinc-50 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-size-[16px_16px]">
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
  );
}
