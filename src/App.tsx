/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider } from './contexts/AuthContext';
import Shell from './components/layout/Shell';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function App() {
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-kjc-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-kjc-slate-200 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <h2 className="text-2xl font-black text-kjc-slate-900 mb-4 tracking-tight uppercase">Google Maps API Key Required</h2>
          <div className="space-y-4 text-left mb-8">
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              <strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="underline text-blue-600">Get an API Key</a>
            </p>
            <div className="p-4 bg-kjc-slate-50 rounded-2xl border border-kjc-slate-100">
              <p className="text-xs font-black text-kjc-slate-900 mb-2 uppercase tracking-tight">Step 2: Add to AI Studio Secrets</p>
              <ul className="text-[11px] text-slate-500 space-y-2 font-medium">
                <li>• Open <strong>Settings</strong> (⚙️ gear icon)</li>
                <li>• Select <strong>Secrets</strong></li>
                <li>• Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                <li>• Paste your key and press <strong>Enter</strong></li>
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">The app rebuilds automatically</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <APIProvider apiKey={API_KEY} version="weekly">
        <Shell />
      </APIProvider>
    </AuthProvider>
  );
}
