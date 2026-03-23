/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { GitMerge, ArrowRight, Table as TableIcon, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { joinDatasets } from "../utils/dataProcessing";
import { JoinType, JoinConfig } from "../types";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "motion/react";

export const DataMerge: React.FC = () => {
  const { datasets, addDataset, setStep } = useApp();
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [leftKey, setLeftKey] = useState<string>("");
  const [rightKey, setRightKey] = useState<string>("");
  const [joinType, setJoinType] = useState<JoinType>(JoinType.INNER);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leftDataset = datasets.find((d) => d.id === leftId);
  const rightDataset = datasets.find((d) => d.id === rightId);

  const handleMerge = () => {
    if (!leftDataset || !rightDataset || !leftKey || !rightKey) {
      setError("Please select both datasets and their join keys.");
      return;
    }

    if (leftId === rightId) {
      setError("Cannot merge a dataset with itself.");
      return;
    }

    setIsMerging(true);
    setError(null);

    setTimeout(() => {
      try {
        const config: JoinConfig = {
          id: nanoid(),
          leftDatasetId: leftId,
          rightDatasetId: rightId,
          leftKey,
          rightKey,
          type: joinType,
        };

        const merged = joinDatasets(leftDataset, rightDataset, config);
        addDataset(merged);
        setIsMerging(false);
        setStep("dashboard");
      } catch (err) {
        console.error(err);
        setError("Failed to merge datasets. Please check your join keys.");
        setIsMerging(false);
      }
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Merge Datasets</h1>
        <p className="text-slate-500">Combine multiple datasets using a common key (VLOOKUP style).</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Join Builder UI */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-12">
            {/* Left Dataset Selection */}
            <div className="flex-1 space-y-4">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dataset A (Left)</label>
              <select
                value={leftId || ""}
                onChange={(e) => {
                  setLeftId(e.target.value);
                  setLeftKey("");
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              >
                <option value="">Select Dataset</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {leftDataset && (
                <select
                  value={leftKey || ""}
                  onChange={(e) => setLeftKey(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="">Select Join Key</option>
                  {leftDataset.columns
                    .filter((col) => !leftDataset.hiddenColumns?.includes(col.name))
                    .map((col) => (
                      <option key={col.id} value={col.name}>{col.name}</option>
                    ))}
                </select>
              )}
            </div>

            {/* Join Type Icon */}
            <div className="px-8 flex flex-col items-center space-y-4">
              <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 shadow-lg shadow-indigo-100">
                <GitMerge size={32} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Join Type</span>
                <select
                  value={joinType || JoinType.INNER}
                  onChange={(e) => setJoinType(e.target.value as JoinType)}
                  className="mt-2 text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border-none outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <option value={JoinType.INNER}>Inner Join</option>
                  <option value={JoinType.LEFT}>Left Join</option>
                  <option value={JoinType.FULL}>Full Join</option>
                </select>
              </div>
            </div>

            {/* Right Dataset Selection */}
            <div className="flex-1 space-y-4">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dataset B (Right)</label>
              <select
                value={rightId || ""}
                onChange={(e) => {
                  setRightId(e.target.value);
                  setRightKey("");
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              >
                <option value="">Select Dataset</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {rightDataset && (
                <select
                  value={rightKey || ""}
                  onChange={(e) => setRightKey(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="">Select Join Key</option>
                  {rightDataset.columns
                    .filter((col) => !rightDataset.hiddenColumns?.includes(col.name))
                    .map((col) => (
                      <option key={col.id} value={col.name}>{col.name}</option>
                    ))}
                </select>
              )}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-700"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleMerge}
                disabled={isMerging || !leftKey || !rightKey}
                className="px-12 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center space-x-3"
              >
                {isMerging ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Merging Datasets...</span>
                  </>
                ) : (
                  <>
                    <GitMerge size={20} />
                    <span>Execute Merge</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setStep("dashboard")}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center space-x-3"
              >
                <span>Skip to Dashboard</span>
                <ArrowRight size={20} />
              </button>
            </div>

            <div className="flex items-center space-x-2 text-slate-400">
              <Info size={16} />
              <p className="text-xs font-medium">Merging is optional. You can use individual datasets in the dashboard as well.</p>
            </div>
          </div>
        </div>

        {/* Dataset Overview */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Available Datasets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((d) => (
              <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <TableIcon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{d.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{d.rowCount} Rows</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep("dashboard")}
                  className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Use in Dashboard"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Join Type Explanation */}
        <div className="grid grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl border-2 transition-all ${joinType === JoinType.INNER ? "border-indigo-500 bg-indigo-50/30" : "border-slate-100 bg-white"}`}>
            <h4 className="font-bold text-slate-900 mb-2">Inner Join</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Only rows with matching keys in both datasets are kept. Perfect for strict relationships.</p>
          </div>
          <div className={`p-6 rounded-2xl border-2 transition-all ${joinType === JoinType.LEFT ? "border-indigo-500 bg-indigo-50/30" : "border-slate-100 bg-white"}`}>
            <h4 className="font-bold text-slate-900 mb-2">Left Join</h4>
            <p className="text-xs text-slate-500 leading-relaxed">All rows from Dataset A are kept. Dataset B data is added where keys match, otherwise null.</p>
          </div>
          <div className={`p-6 rounded-2xl border-2 transition-all ${joinType === JoinType.FULL ? "border-indigo-500 bg-indigo-50/30" : "border-slate-100 bg-white"}`}>
            <h4 className="font-bold text-slate-900 mb-2">Full Join</h4>
            <p className="text-xs text-slate-500 leading-relaxed">All rows from both datasets are kept. Missing matches on either side are filled with null.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
