import React from "react";
import { auth, googleProvider, signInWithPopup } from "../firebase";
import { Layout as LayoutIcon, LogIn } from "lucide-react";
import { motion } from "motion/react";

export const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center space-y-8"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <LayoutIcon size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Insight<span className="text-indigo-600">Fusion</span>
          </h1>
          <p className="text-slate-500 font-medium">
            The ultimate AI-powered data analysis and dashboard builder.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100"
          >
            <LogIn size={20} />
            <span>Sign in with Google</span>
          </button>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Securely powered by Firebase
          </p>
        </div>

        <div className="pt-6 border-t border-slate-50 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">100%</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Secure</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">AI</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Powered</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">Real-time</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Sync</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
