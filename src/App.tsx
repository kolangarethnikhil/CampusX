import React, { useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { AuthProvider } from "./contexts/AuthContext";
import Shell from "./components/layout/Shell";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY";

export default function App() {
  const [bypassKey, setBypassKey] = useState(false);

  if (!hasValidKey && !bypassKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="rounded-[44px] border border-white/10 bg-white/[0.03] p-10 text-center shadow-pro-lg">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[32px] border border-kjc-accent/20 bg-kjc-accent/10 text-kjc-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>

          <h2 className="mb-4 text-3xl pro-heading uppercase tracking-tighter text-white">
            Maps <span className="text-kjc-accent italic">Authorization</span>
          </h2>

          <p className="mb-8 max-w-sm text-center text-[11px] font-black uppercase leading-relaxed tracking-[0.2em] text-white/40">
            Google Maps API key is needed for location selection and housing map view.
          </p>

          <div className="mb-8 rounded-[28px] border border-white/5 bg-white/5 p-6 text-left">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-kjc-accent">
              Required env variable
            </p>

            <code className="block rounded-2xl bg-black px-4 py-3 text-[11px] font-bold text-white/70">
              VITE_GOOGLE_MAPS_API_KEY=your_key
            </code>

            <p className="mt-4 text-[10px] font-bold leading-relaxed text-white/35">
              Add this in Vercel Environment Variables and local `.env.local`.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="https://console.cloud.google.com/google/maps-apis/start"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-[28px] bg-kjc-accent py-5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-kjc-accent/20 transition-all hover:bg-kjc-accent/90"
            >
              Get Google Maps API Key
            </a>

            <button
              type="button"
              onClick={() => setBypassKey(true)}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-white"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <OptionalAPIProvider apiKey={API_KEY}>
        <Shell />
      </OptionalAPIProvider>
    </AuthProvider>
  );
}

function OptionalAPIProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey: string;
}) {
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      {children}
    </APIProvider>
  );
}