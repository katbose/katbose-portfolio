"use client";

import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function QRDialog({
  siteUrl,
  theme,
  onClose,
}: {
  siteUrl: string;
  theme: "light" | "dark";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close QR code"
        className="absolute inset-0 cursor-default bg-black/20 dark:bg-white/5 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR code for this site"
        className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 rounded-full bg-black dark:bg-white p-2 text-white dark:text-black transition-transform hover:scale-110"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="rounded-lg bg-white p-2">
          <QRCodeSVG
            value={`${siteUrl}?theme=${theme}`}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>
    </div>
  );
}
