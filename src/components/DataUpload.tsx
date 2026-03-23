/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Table as TableIcon, X, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { nanoid } from "nanoid";
import { Dataset, ColumnType } from "../types";
import { detectColumnTypes } from "../utils/dataProcessing";
import { useApp } from "../AppContext";
import { motion, AnimatePresence } from "motion/react";

export const DataUpload: React.FC = () => {
  const { addDataset, setStep } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const data = e.target?.result;
        let rows: any[] = [];

        if (file.name.endsWith(".csv")) {
          const text = data as string;
          const result = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
          rows = result.data;
        } else {
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet);
        }

        if (rows.length === 0) {
          throw new Error("The file is empty or could not be parsed.");
        }

        const types = detectColumnTypes(rows);
        const columns = Object.keys(rows[0]).map((key) => ({
          id: nanoid(),
          name: key,
          originalName: key,
          type: types[key] || ColumnType.TEXT,
        }));

        const dataset: Dataset = {
          id: nanoid(),
          name: file.name,
          columns,
          rows,
          rowCount: rows.length,
          createdAt: new Date().toISOString(),
        };

        addDataset(dataset);
        setIsProcessing(false);
        setStep("dashboard"); // Automatically move to Analyze step
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to process file. Please ensure it's a valid CSV or Excel file.");
      setIsProcessing(false);
    }
  }, [addDataset]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(processFile);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
          Upload Your Data
        </h1>
        <p className="text-lg text-slate-600">
          Drag and drop your CSV or Excel files to start analyzing.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 transition-all duration-200 cursor-pointer
          ${isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"}
          ${isProcessing ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-indigo-100 rounded-full text-indigo-600">
            <Upload size={32} />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900">
              {isDragActive ? "Drop files here" : "Click or drag files to upload"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Supports .csv, .xlsx, .xls
            </p>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-600">Processing file...</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3 text-red-700"
          >
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex justify-center">
        <button
          onClick={() => setStep("clean")}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          Continue to Cleaning
        </button>
      </div>
    </div>
  );
};
