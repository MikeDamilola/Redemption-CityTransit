import React from 'react';
import { Bus, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onSignIn: () => void;
}

export default function AuthScreen({ onSignIn }: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm text-center space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200">
            <Bus className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">CityTransit</h1>
            <p className="text-neutral-500">Fast, secure, and cashless transport payments for city residents.</p>
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <button
            onClick={onSignIn}
            className="w-full h-14 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center gap-3 font-semibold text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
          
          <p className="text-xs text-neutral-400 px-8">
            By continuing, you agree to CityTransit's Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
