import React, { useState } from "react";
import { useApp } from "../AppContext";
import { GoogleGenAI } from "@google/genai";
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  Database,
  Download,
  Share2,
  MessageSquare,
  Send,
  X,
  Filter,
  Layout as LayoutIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { nanoid } from "nanoid";
import { WidgetRenderer } from "./WidgetRenderer";

export const Reports: React.FC = () => {
  const { datasets, reports, dashboards, addReport, removeReport, updateDashboard } = useApp();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const selectedDashboard = dashboards.find(d => d.id === selectedDashboardId);
  const activeReport = reports.find(r => r.id === activeReportId);

  const handleDataPointClick = (column: string, value: any) => {
    if (!selectedDashboard) return;
    
    const currentFilters = selectedDashboard.globalFilters || [];
    const existingFilterIndex = currentFilters.findIndex(f => f.column === column);
    
    let newFilters = [...currentFilters];
    if (existingFilterIndex > -1) {
      newFilters[existingFilterIndex] = { column, operator: "equals", value: String(value) };
    } else {
      newFilters.push({ column, operator: "equals", value: String(value) });
    }
    
    updateDashboard(selectedDashboard.id, { globalFilters: newFilters });
  };

  const clearGlobalFilter = (column: string) => {
    if (!selectedDashboard) return;
    const newFilters = (selectedDashboard.globalFilters || []).filter(f => f.column !== column);
    updateDashboard(selectedDashboard.id, { globalFilters: newFilters });
  };

  const clearAllGlobalFilters = () => {
    if (!selectedDashboard) return;
    updateDashboard(selectedDashboard.id, { globalFilters: [] });
  };

  const handleGenerateReport = async () => {
    if (!selectedDataset) return;
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prepare data for Gemini (limit rows to avoid token limits)
      let filteredRows = selectedDataset.rows;
      if (selectedDashboard?.globalFilters && selectedDashboard.globalFilters.length > 0) {
        filteredRows = selectedDataset.rows.filter(row => {
          return selectedDashboard.globalFilters!.every(filter => {
            return String(row[filter.column]) === String(filter.value);
          });
        });
      }

      const totalRows = filteredRows.length;
      const sampleRows = filteredRows.slice(0, 50);
      const dataSummary = JSON.stringify(sampleRows);
      const columns = selectedDataset.columns.map(c => c.name).join(", ");

      let dashboardContext = "";
      if (selectedDashboard) {
        const widgetsInfo = selectedDashboard.widgets.map(w => `- ${w.title} (${w.type})`).join("\n");
        const activeFilters = selectedDashboard.globalFilters?.map(f => `${f.column} = ${f.value}`).join(", ") || "None";
        
        dashboardContext = `
        The user has also selected a dashboard named "${selectedDashboard.name}" for this data.
        The dashboard includes the following visualizations:
        ${widgetsInfo}
        
        ACTIVE GLOBAL FILTERS: ${activeFilters}
        Please analyze the data specifically within the context of these filters if any are active.
        `;
      }

      const prompt = `
        You are a professional data analyst. Analyze the following dataset and generate a comprehensive report.
        
        Dataset Name: ${selectedDataset.name}
        Total Records in Dataset: ${totalRows}
        Columns: ${columns}
        Data Sample (First 50 rows): ${dataSummary}
        
        ${dashboardContext}
        
        ${userPrompt ? `User Instructions: ${userPrompt}` : "The report should include: 1. Executive Summary, 2. Key Insights and Trends, 3. Data Quality Observations, 4. Recommendations for Action."}
        
        IMPORTANT: Use the total record count (${totalRows}) for your high-level overview, not just the sample size.
        
        Format the report in clean Markdown. Use bold headings and bullet points.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      const content = response.text || "Failed to generate report content.";
      
      const reportTitle = selectedDashboard 
        ? `Analysis: ${selectedDataset.name} (${selectedDashboard.name})`
        : `Analysis: ${selectedDataset.name}`;

      const newReport = {
        id: nanoid(),
        title: reportTitle,
        content,
        datasetId: selectedDataset.id,
        dashboardId: selectedDashboard?.id || null,
        createdAt: new Date().toISOString(),
        authorUid: "", // Will be set by addReport
      };

      await addReport(newReport);
      setActiveReportId(newReport.id);
      setUserPrompt(""); // Clear prompt after generation
    } catch (error) {
      console.error("Failed to generate report", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-select dataset if dashboard is selected
  React.useEffect(() => {
    if (selectedDashboard && !selectedDatasetId && selectedDashboard.widgets.length > 0) {
      setSelectedDatasetId(selectedDashboard.widgets[0].datasetId);
    }
  }, [selectedDashboardId, selectedDatasetId]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">AI Reports</h1>
          <p className="text-slate-500 font-medium">Generate deep insights from your data and dashboards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Dataset</span>
            <select
              value={selectedDatasetId || ""}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[180px]"
            >
              <option value="">Select Dataset</option>
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Dashboard (Optional)</span>
            <select
              value={selectedDashboardId || ""}
              onChange={(e) => setSelectedDashboardId(e.target.value)}
              className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[180px]"
            >
              <option value="">Select Dashboard</option>
              {dashboards.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              {dashboards.length === 0 && (
                <option disabled>No dashboards created</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Reports List & Chat Box */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Chat Box */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
              <MessageSquare size={16} className="text-indigo-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Instructions</span>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ask Gemini to focus on specific trends, compare columns, or analyze dashboard widgets..."
                className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
              />
              <button
                onClick={handleGenerateReport}
                disabled={!selectedDatasetId || isGenerating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>{isGenerating ? "Generating..." : "Generate Report"}</span>
              </button>
            </div>
          </div>

          {/* Dashboard Preview Section */}
          <AnimatePresence>
            {selectedDashboard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <LayoutIcon size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dashboard Context</span>
                  </div>
                  {selectedDashboard.globalFilters && selectedDashboard.globalFilters.length > 0 && (
                    <button 
                      onClick={clearAllGlobalFilters}
                      className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                  {/* Global Filters Bar */}
                  {selectedDashboard.globalFilters && selectedDashboard.globalFilters.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedDashboard.globalFilters.map((filter) => (
                        <div 
                          key={filter.column}
                          className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-[10px] font-bold"
                        >
                          <span>{filter.column}: {filter.value}</span>
                          <button onClick={() => clearGlobalFilter(filter.column)}>
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
                    {selectedDashboard.widgets.map((widget) => (
                      <div key={widget.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{widget.title}</h4>
                        <div className="h-40">
                          <WidgetRenderer 
                            widget={widget} 
                            datasets={datasets} 
                            globalFilters={selectedDashboard.globalFilters}
                            onDataPointClick={handleDataPointClick}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Saved Reports</h2>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                  <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No reports generated yet.</p>
                </div>
              ) : (
                reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveReportId(r.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all group ${
                      activeReportId === r.id 
                        ? "border-indigo-600 bg-indigo-50/50" 
                        : "border-white bg-white hover:border-slate-100 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{r.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center space-x-1">
                            <Calendar size={10} />
                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Database size={10} />
                            <span>{datasets.find(d => d.id === r.datasetId)?.name || "Unknown"}</span>
                          </span>
                          {r.dashboardId && (
                            <span className="flex items-center space-x-1 text-indigo-500">
                              <LayoutIcon size={10} />
                              <span>{dashboards.find(d => d.id === r.dashboardId)?.name || "Dashboard"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className={`shrink-0 transition-transform ${activeReportId === r.id ? "text-indigo-600 translate-x-1" : "text-slate-300"}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Report Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeReport ? (
              <motion.div
                key={activeReport.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col h-[700px]"
              >
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{activeReport.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">Generated on {new Date(activeReport.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => removeReport(activeReport.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Report"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Share2 size={20} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Download size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto prose prose-slate max-w-none">
                  <div className="markdown-body">
                    <Markdown>{activeReport.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[700px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 text-center p-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <Sparkles size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Select a report to view</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Choose a report from the list on the left or generate a new one using the AI Instructions box.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
