"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { MicErrorInfo } from "@/hooks/useVoiceCapture";

interface MicErrorBannerProps {
  error: MicErrorInfo | null;
}

export const MicErrorBanner: React.FC<MicErrorBannerProps> = ({ error }) => {
  if (!error) return null;

  const targetUrl =
    error.localhostUrl ||
    (typeof window !== "undefined" ? window.location.href : "http://localhost:3000/dashboard/ai");

  return (
    <div className="mt-3 max-w-lg px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
      <span>{error.message}</span>
      {(error.canOpenNewTab || error.localhostUrl) && (
        <a
          href={targetUrl}
          target={error.canOpenNewTab ? "_blank" : "_self"}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 transition-colors shrink-0"
        >
          <span>{error.localhostUrl ? "Switch to localhost" : "Open in Chrome"}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
