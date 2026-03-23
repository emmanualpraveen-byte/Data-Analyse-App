/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { Trash2, Check, Filter, RefreshCw, Layers, Table as TableIcon, ChevronRight, ChevronDown, Plus, Settings } from "lucide-react";
import { cleanDataset, transformDataset } from "../utils/dataProcessing";
import { Dataset, ColumnType } from "../types";
import { motion, AnimatePresence } from "motion/react";

export const DataCleaning: React.FC = () => {
  const { datasets, setDatasets, setStep } = useApp();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    datasets.length > 0 ? datasets[0].id : null
  );
  const [isCleaning, setIsCleaning] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColFormula, setNewColFormula] = useState("");
  const [showFormulaInput, setShowFormulaInput] = useState(false);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  const handleClean = (options: {
    removeDuplicates?: boolean;
    handleMissing?: "remove" | "fill_zero" | "none";
    trimSpaces?: boolean;
  }) => {
    if (!selectedDataset) return;
    setIsCleaning(true);

    setTimeout(() => {
      const cleaned = cleanDataset(selectedDataset, options);
      setDatasets((prev) =>
        prev.map((d) => (d.id === selectedDatasetId ? cleaned : d))
      );
      setIsCleaning(false);
    }, 500);
  };

  const handleToggleColumn = (colName: string) => {
    if (!selectedDataset) return;
    const currentHidden = selectedDataset.hiddenColumns || [];
    let newHidden: string[];
    if (currentHidden.includes(colName)) {
      newHidden = currentHidden.filter((c) => c !== colName);
    } else {
      newHidden = [...currentHidden, colName];
    }
    
    // Don't allow hiding all columns
    if (newHidden.length >= selectedDataset.columns.length) return;

    setDatasets((prev) =>
      prev.map((d) => (d.id === selectedDatasetId ? { ...d, hiddenColumns: newHidden } : d))
    );
  };

  const handleAddFormulaColumn = () => {
    if (!selectedDataset || !newColName || !newColFormula) return;
    setIsCleaning(true);

    setTimeout(() => {
      const transformed = transformDataset(selectedDataset, {
        newColumns: [{ name: newColName, formula: newColFormula }],
      });
      setDatasets((prev) =>
        prev.map((d) => (d.id === selectedDatasetId ? transformed : d))
      );
      setNewColName("");
      setNewColFormula("");
      setShowFormulaInput(false);
      setIsCleaning(false);
    }, 500);
  };

  const removeDataset = (id: string) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    if (selectedDatasetId === id) {
      setSelectedDatasetId(datasets.length > 1 ? datasets[0].id : null);
    }
  };

  const visibleColumns = selectedDataset?.columns.filter(col => !selectedDataset.hiddenColumns?.includes(col.name)) || [];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clean & Transform</h1>
          <p className="text-slate-500 mt-1">Prepare your data for analysis and merging.</p>
        </div>
        <button
          onClick={() => setStep("merge")}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
        >
          Next: Merge Data
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar: Dataset List */}
        <div className="col-span-3 space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datasets</h3>
          <div className="space-y-2">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                onClick={() => setSelectedDatasetId(dataset.id)}
                className={`
                  group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                  ${selectedDatasetId === dataset.id ? "bg-indigo-50 border border-indigo-100 text-indigo-700" : "hover:bg-slate-50 border border-transparent text-slate-600"}
                `}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <TableIcon size={18} className={selectedDatasetId === dataset.id ? "text-indigo-600" : "text-slate-400"} />
                  <span className="text-sm font-medium truncate">{dataset.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDataset(dataset.id);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {datasets.length === 0 && (
              <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 italic">No datasets uploaded yet.</p>
                <button
                  onClick={() => setStep("upload")}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Go back to upload
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Cleaning Tools & Preview */}
        <div className="col-span-9 space-y-8">
          {selectedDataset ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Cleaning Tools */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center space-x-2">
                  <Filter size={20} className="text-indigo-600" />
                  <span>Cleaning Actions</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleClean({ removeDuplicates: true })}
                    className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <Layers size={24} className="text-slate-400 group-hover:text-indigo-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Remove Duplicates</span>
                  </button>
                  <button
                    onClick={() => handleClean({ trimSpaces: true })}
                    className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <RefreshCw size={24} className="text-slate-400 group-hover:text-indigo-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Trim Spaces</span>
                  </button>
                  <button
                    onClick={() => handleClean({ handleMissing: "remove" })}
                    className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <Trash2 size={24} className="text-slate-400 group-hover:text-indigo-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Remove Missing</span>
                  </button>
                </div>
              </div>

              {/* Column Customization */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                    <Settings size={20} className="text-indigo-600" />
                    <span>Customize Columns</span>
                  </h3>
                  <button
                    onClick={() => setShowFormulaInput(!showFormulaInput)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all"
                  >
                    <Plus size={18} />
                    <span>Add Formula Column</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showFormulaInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Column Name</label>
                          <input
                            type="text"
                            value={newColName || ""}
                            onChange={(e) => setNewColName(e.target.value)}
                            placeholder="e.g. Total Price"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Formula</label>
                          <input
                            type="text"
                            value={newColFormula || ""}
                            onChange={(e) => setNewColFormula(e.target.value)}
                            placeholder="e.g. [Price] * [Quantity]"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 italic">
                          Use [Column Name] to reference other columns. Supports basic JS arithmetic.
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowFormulaInput(false)}
                            className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddFormulaColumn}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            Add Column
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedDataset.columns.map((col) => {
                    const isHidden = selectedDataset.hiddenColumns?.includes(col.name);
                    return (
                      <div
                        key={col.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isHidden ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 hover:border-indigo-200 shadow-sm"}`}
                      >
                        <div className="overflow-hidden flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${col.type === ColumnType.NUMBER ? "bg-emerald-400" : col.type === ColumnType.DATE ? "bg-amber-400" : "bg-indigo-400"}`} />
                          <div className="overflow-hidden">
                            <p className={`text-sm font-bold truncate ${isHidden ? "text-slate-400 line-through" : "text-slate-700"}`}>{col.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{col.type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleColumn(col.name)}
                          className={`p-1.5 rounded-lg transition-all ${isHidden ? "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" : "text-slate-300 hover:text-red-600 hover:bg-red-50"}`}
                          title={isHidden ? "Show Column" : "Hide Column"}
                        >
                          {isHidden ? <Check size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-slate-900">Data Preview</h3>
                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {selectedDataset.rowCount} rows
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr>
                        {visibleColumns.map((col) => (
                          <th
                            key={col.id}
                            className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50"
                          >
                            <div className="flex flex-col">
                              <span>{col.name}</span>
                              <span className="text-[10px] font-medium text-indigo-400 normal-case">{col.type}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedDataset.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          {visibleColumns.map((col) => (
                            <td key={col.id} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {row[col.name]?.toString() || <span className="text-slate-300 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedDataset.rowCount > 10 && (
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 italic">Showing first 10 rows of {selectedDataset.rowCount}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <TableIcon size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Select a dataset to begin cleaning</p>
            </div>
          )}
        </div>
      </div>

      {isCleaning && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-semibold text-slate-900">Cleaning Data...</p>
          </div>
        </div>
      )}
    </div>
  );
};
