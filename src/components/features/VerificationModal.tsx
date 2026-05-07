import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, updateProfile } = useAuth();

  const handleSendOtp = async () => {
    if (!email.endsWith('@kristujayanti.com') && !email.endsWith('@kjc.edu.in')) {
      setError('Please use your official college email ID.');
      return;
    }
    setLoading(true);
    setError(null);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    // Simulate verification - in a real app, you'd verify the OTP on the server
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const otpValue = otp.join('');
    if (otpValue === '123456') { // Static OTP for demo
      await updateProfile({
        collegeEmail: email,
        verifiedStatus: 'verified'
      });
      setStep('success');
    } else {
      setError('Invalid verification code. Use 123456 for demo.');
    }
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-kjc-black/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-kjc-black w-full max-w-md rounded-[56px] p-10 sm:p-12 shadow-pro-lg border border-white/10 overflow-hidden glass-card"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-kjc-accent/10 rounded-full blur-[80px] -translate-y-20 translate-x-10" />
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 hover:text-white transition-all active:scale-90 border border-white/5"
          >
            <X size={20} />
          </button>

          {step === 'email' && (
            <div className="space-y-10 pt-4 relative z-10">
              <div className="w-20 h-20 bg-kjc-accent/10 rounded-[32px] flex items-center justify-center text-kjc-accent border border-kjc-accent/30 shadow-[0_15px_35px_rgba(139,92,246,0.2)]">
                <ShieldCheck size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl pro-heading tracking-tighter mb-3">Identity <span className="text-kjc-accent italic">Verification</span></h2>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.25em] leading-relaxed">
                  Join the exclusive network of KJC. Establish your academic authority.
                </p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="email"
                    placeholder="campus.id@kristujayanti.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-pro pl-14"
                  />
                </div>
                {error && <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest pl-4">{error}</p>}
                
                <button 
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  className="w-full bg-kjc-accent text-white py-6 rounded-[32px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-kjc-accent/90 transition-all shadow-[0_20px_50px_rgba(139,92,246,0.25)] disabled:opacity-40 disabled:grayscale"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Request Security Code'}
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-10 pt-4 relative z-10">
              <div>
                <h2 className="text-3xl pro-heading tracking-tighter mb-3">Mail <span className="text-kjc-accent italic">Intercepted</span></h2>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.25em] leading-relaxed">
                  Enter the 6-digit access token sent to 
                  <span className="text-white block mt-2 text-[11px] lowercase tracking-normal font-bold opacity-100">{email}</span>
                </p>
              </div>

              <div className="flex justify-between gap-3">
                {otp.map((digit, idx) => (
                  <input 
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-black text-white focus:border-kjc-accent focus:bg-white/10 outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

              <div className="space-y-4">
                <button 
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.some(d => !d)}
                  className="w-full bg-kjc-accent text-white py-6 rounded-[32px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-kjc-accent/90 transition-all shadow-[0_20px_50px_rgba(139,92,246,0.3)] disabled:opacity-40"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Handshake'}
                </button>
                <button 
                  onClick={() => setStep('email')}
                  className="w-full py-4 text-white/20 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                  Recalibrate Email
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-10 py-10 relative z-10">
              <motion.div 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[40px] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_20px_40px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 size={48} strokeWidth={2.5} />
              </motion.div>
              <div>
                <h2 className="text-4xl pro-heading tracking-tighter mb-3">Identity <span className="text-emerald-500 italic">Established</span></h2>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] leading-relaxed px-4">
                  Security protocols cleared. You have been granted full permissions within the network.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-kjc-accent text-white py-6 rounded-[32px] font-black uppercase tracking-[0.3em] text-[10px] hover:scale-105 active:scale-[0.97] transition-all shadow-pro-lg"
              >
                Enter Platform
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
