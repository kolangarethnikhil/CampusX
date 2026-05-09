/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Shell from './components/layout/Shell';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function App() {
  const [bypassKey, setBypassKey] = useState(false);

  if (!hasValidKey && !bypassKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-kjc-black p-6">
        <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-3xl rounded-[56px] p-12 border border-white/10 text-center glass-card">
          <div className="w-20 h-20 bg-kjc-accent/10 rounded-[32px] flex items-center justify-center text-kjc-accent mx-auto mb-8 border border-kjc-accent/20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <h2 className="text-3xl pro-heading text-white mb-4 tracking-tighter uppercase">Maps <span className="text-kjc-accent italic">Authorization</span></h2>
          
          <div className="space-y-6 text-left mb-10">
            <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] leading-relaxed text-center">
              A Google Maps API Key is required for high-precision campus navigation and address validation.
            </p>
            
            <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4">
              <p className="text-[10px] font-black text-kjc-accent uppercase tracking-[0.3em]">Quick Setup</p>
              <ul className="text-[11px] text-white/60 space-y-3 font-medium">
                <li className="flex gap-3">
                  <span className="text-kjc-accent font-black">01</span>
                  <span>Open <strong>Settings</strong> (⚙️ bottom left)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-kjc-accent font-black">02</span>
                  <span>Select <strong>Secrets</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-kjc-accent font-black">03</span>
                  <span>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <a 
              href="https://console.cloud.google.com/google/maps-apis/start" 
              target="_blank" 
              rel="noopener"
              className="block w-full bg-kjc-accent text-white py-6 rounded-[32px] font-black uppercase tracking-[0.3em] text-[10px] hover:bg-kjc-accent/90 transition-all shadow-lg shadow-kjc-accent/20"
            >
              Get API Key
            </a>
            <button 
              onClick={() => setBypassKey(true)}
              className="w-full py-4 text-white/20 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              Skip for now (Manual Location)
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

function OptionalAPIProvider({ children, apiKey }: { children: React.ReactNode, apiKey: string }) {
  if (!apiKey || apiKey === 'YOUR_API_KEY') {
    return <>{children}</>;
  }
  return (
    <APIProvider apiKey={apiKey} version="weekly">
      {children}
    </APIProvider>
  );
}
