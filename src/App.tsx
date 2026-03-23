/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppProvider, useApp } from "./AppContext";
import { DataUpload } from "./components/DataUpload";
import { DataCleaning } from "./components/DataCleaning";
import { DataMerge } from "./components/DataMerge";
import { DashboardBuilder } from "./components/DashboardBuilder";
import { PublicDashboard } from "./components/PublicDashboard";
import { Login } from "./components/Login";
import { Reports } from "./components/Reports";
import { signOut, auth } from "./firebase";
import {
  Layout as LayoutIcon,
  Upload,
  Filter,
  GitMerge,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  Database,
  Search,
  Settings,
  HelpCircle,
  Edit2,
  Trash2,
  Check,
  FileText,
  LogOut,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AppContent: React.FC = () => {
  const { step, setStep, datasets, removeDataset, updateDataset, user, loading } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const handleStartEdit = (id: string, name: string) => {
    setEditingDatasetId(id);
    setTempName(name);
  };

  const handleSaveEdit = (id: string) => {
    if (tempName.trim()) {
      updateDataset(id, { name: tempName.trim() });
    }
    setEditingDatasetId(null);
  };

  const handleCancelEdit = () => {
    setEditingDatasetId(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Check for dashboardId in URL for public view
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardId = urlParams.get("dashboardId");

  if (dashboardId) {
    return <PublicDashboard dashboardId={dashboardId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing InsightFusion...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderStep = () => {
    switch (step) {
      case "upload":
        return <DataUpload />;
      case "clean":
        return <DataCleaning />;
      case "merge":
        return <DataMerge />;
      case "dashboard":
        return <DashboardBuilder />;
      case "reports":
        return <Reports />;
      default:
        return <DataUpload />;
    }
  };

  const steps = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "clean", label: "Clean", icon: Filter },
    { id: "merge", label: "Merge", icon: GitMerge },
    { id: "dashboard", label: "Analyze", icon: BarChart3 },
    { id: "reports", label: "AI Reports", icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm"
      >
        {/* Logo */}
        <div className="p-6 flex items-center space-x-3 border-b border-slate-50">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <LayoutIcon size={24} />
          </div>
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-black tracking-tight text-slate-900"
            >
              Insight<span className="text-indigo-600">Fusion</span>
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="mb-6">
            {isSidebarOpen && (
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Main Workflow
              </p>
            )}
            {steps.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id as any)}
                className={`
                  w-full flex items-center p-3 rounded-xl transition-all group relative
                  ${step === s.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <s.icon size={20} className={step === s.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} />
                {isSidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-sm">
                    {s.label}
                  </motion.span>
                )}
                {step === s.id && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full"
                  />
                )}
              </button>
            ))}
          </div>

          {isSidebarOpen && datasets.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Active Datasets
              </p>
              <div className="space-y-1">
                {datasets.map((d) => (
                  <div key={d.id} className="px-4 py-2 flex items-center justify-between group rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Database size={14} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
                      {editingDatasetId === d.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(d.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="w-full bg-white border border-indigo-200 rounded px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="truncate text-xs font-medium text-slate-600">{d.name}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      {editingDatasetId === d.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(d.id)} className="p-1 hover:text-green-600 text-slate-400">
                            <Check size={12} />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 hover:text-red-600 text-slate-400">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleStartEdit(d.id, d.name)} className="p-1 hover:text-indigo-600 text-slate-400">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => removeDataset(d.id)} className="p-1 hover:text-red-600 text-slate-400">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-50 space-y-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center p-3 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Sign Out</span>}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search datasets, charts..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ""} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user.displayName || user.email}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pro Analyst</p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
