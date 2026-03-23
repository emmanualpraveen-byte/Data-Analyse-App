/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { WidgetRenderer, COLORS } from "./WidgetRenderer";
import {
  Share2,
  Globe,
  Filter,
  X,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Settings,
  Layout as LayoutIcon,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table as TableIcon,
  CreditCard,
  Maximize2,
  Download,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { WidgetConfig, WidgetType, Dataset, ColumnType } from "../types";
import { aggregateData, transformDataset } from "../utils/dataProcessing";
import { nanoid } from "nanoid";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import _ from "lodash";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardBuilder: React.FC = () => {
  const { datasets, setDatasets, dashboards, setDashboards, activeDashboardId, setActiveDashboardId, addDashboard, updateDashboard, togglePublish } = useApp();
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDataPointClick = (column: string, value: any) => {
    if (!activeDashboard) return;
    
    const currentFilters = activeDashboard.globalFilters || [];
    const existingFilterIndex = currentFilters.findIndex(f => f.column === column);
    
    let newFilters = [...currentFilters];
    if (existingFilterIndex > -1) {
      newFilters[existingFilterIndex] = { column, operator: "equals", value: String(value) };
    } else {
      newFilters.push({ column, operator: "equals", value: String(value) });
    }
    
    updateDashboard(activeDashboard.id, { globalFilters: newFilters });
  };

  const clearGlobalFilter = (column: string) => {
    if (!activeDashboard) return;
    const newFilters = (activeDashboard.globalFilters || []).filter(f => f.column !== column);
    updateDashboard(activeDashboard.id, { globalFilters: newFilters });
  };

  const clearAllGlobalFilters = () => {
    if (!activeDashboard) return;
    updateDashboard(activeDashboard.id, { globalFilters: [] });
  };

  // Set default dataset when opening modal
  useEffect(() => {
    if (isAddingWidget && !selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [isAddingWidget, datasets, selectedDatasetId]);

  // Automatically create a default dashboard if none exist
  useEffect(() => {
    if (dashboards.length === 0 && datasets.length > 0) {
      const newDashboard = {
        id: nanoid(),
        name: "My Dashboard",
        widgets: [],
        createdAt: new Date().toISOString(),
      };
      addDashboard(newDashboard);
    }
  }, [dashboards.length, datasets.length]);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) || dashboards[0];

  const publicUrl = activeDashboard?.slug 
    ? `${window.location.origin}${window.location.pathname}?dashboardId=${activeDashboard.id}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddWidget = async (type: WidgetType) => {
    if (!activeDashboard) {
      const newDashboard = {
        id: nanoid(),
        name: "My Dashboard",
        widgets: [],
        createdAt: new Date().toISOString(),
      };
      await addDashboard(newDashboard);
      return;
    }

    const newWidget: WidgetConfig = {
      id: nanoid(),
      type,
      title: `New ${type.replace("_", " ")}`,
      datasetId: selectedDatasetId || datasets[0]?.id || "",
      xAxis: [],
      yAxis: [],
      groupBy: "",
      aggregation: "sum",
      filters: [],
      layout: { x: 0, y: Infinity, w: 4, h: 4 },
    };

    await addDashboard({
      ...activeDashboard,
      widgets: [...activeDashboard.widgets, newWidget],
    });
    setIsAddingWidget(false);
    setEditingWidgetId(newWidget.id);
  };

  const removeWidget = async (id: string) => {
    if (!activeDashboard) return;
    await addDashboard({
      ...activeDashboard,
      widgets: activeDashboard.widgets.filter((w) => w.id !== id),
    });
  };

  const updateWidget = async (id: string, updates: Partial<WidgetConfig>) => {
    if (!activeDashboard) return;
    await addDashboard({
      ...activeDashboard,
      widgets: activeDashboard.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    });
  };

  const exportData = (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    if (!dataset) return;

    const ws = XLSX.utils.json_to_sheet(dataset.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `${dataset.name}_export.xlsx`);
  };

  const exportPDF = async () => {
    const input = document.getElementById("dashboard-canvas");
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${activeDashboard?.name || "dashboard"}.pdf`);
  };

  const createNewDashboard = () => {
    const newDashboard = {
      id: nanoid(),
      name: `Dashboard ${dashboards.length + 1}`,
      widgets: [],
      createdAt: new Date().toISOString(),
    };
    addDashboard(newDashboard);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Dashboard Header */}
      <div className="px-8 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <LayoutIcon size={20} />
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <select
                value={activeDashboardId || ""}
                onChange={(e) => setActiveDashboardId(e.target.value)}
                className="appearance-none pl-3 pr-10 py-2 text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer hover:border-indigo-300 hover:bg-white transition-all focus:ring-2 focus:ring-indigo-500/20"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                {dashboards.length === 0 && <option value="">No Dashboards</option>}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronRight size={18} className="rotate-90" />
              </div>
            </div>
            <button
              onClick={createNewDashboard}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all"
              title="Create New Dashboard"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-all"
          >
            <Globe size={18} />
            <span>Publish</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <button
            onClick={() => setIsAddingWidget(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} />
            <span>Add Widget</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <button
            onClick={exportPDF}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
            title="Export PDF"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => activeDashboard && exportData(activeDashboard.widgets[0]?.datasetId)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
            title="Export Data"
          >
            <FileSpreadsheet size={20} />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-8" id="dashboard-canvas">
        {/* Global Filters Bar */}
        <AnimatePresence>
          {activeDashboard?.globalFilters && activeDashboard.globalFilters.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 flex flex-wrap items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-center space-x-2 mr-2 text-slate-400">
                <Filter size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Active Filters:</span>
              </div>
              {activeDashboard.globalFilters.map((filter) => (
                <div 
                  key={filter.column}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 text-xs font-bold"
                >
                  <span>{filter.column}: {filter.value}</span>
                  <button 
                    onClick={() => clearGlobalFilter(filter.column)}
                    className="hover:text-indigo-900 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={clearAllGlobalFilters}
                className="ml-auto text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {activeDashboard && activeDashboard.widgets.length > 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: activeDashboard.widgets.map((w) => ({ i: w.id, ...w.layout })) }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            draggableHandle=".drag-handle"
            onLayoutChange={async (currentLayout) => {
              if (!activeDashboard) return;
              const updatedWidgets = activeDashboard.widgets.map((w) => {
                const l = currentLayout.find((item: any) => item.i === w.id);
                if (l) {
                  return {
                    ...w,
                    layout: { x: l.x, y: l.y, w: l.w, h: l.h },
                  };
                }
                return w;
              });
              await addDashboard({ ...activeDashboard, widgets: updatedWidgets });
            }}
          >
            {activeDashboard.widgets.map((widget) => (
              <div key={widget.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm group overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between drag-handle cursor-move bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-700 truncate">{widget.title}</h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingWidgetId(widget.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={() => removeWidget(widget.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4 min-h-0 overflow-hidden relative">
                  <WidgetRenderer 
                    widget={widget} 
                    datasets={datasets} 
                    globalFilters={activeDashboard?.globalFilters}
                    onDataPointClick={handleDataPointClick}
                  />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-6 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
            <div className="p-6 bg-slate-100 rounded-full text-slate-300">
              <LayoutIcon size={64} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">Your Canvas is Empty</h3>
              <p className="text-slate-500 mt-2">Start by adding a widget to visualize your data.</p>
            </div>
            <button
              onClick={() => setIsAddingWidget(true)}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Add First Widget
            </button>
          </div>
        )}
      </div>

      {/* Publish Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Publish Dashboard</h2>
                <button
                  onClick={() => setIsPublishModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <Trash2 size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${activeDashboard?.isPublic ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                      <span className="text-sm font-bold text-slate-700">
                        {activeDashboard?.isPublic ? "Publicly Accessible" : "Private (Draft)"}
                      </span>
                    </div>
                    <button
                      onClick={() => activeDashboard && togglePublish(activeDashboard.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeDashboard?.isPublic 
                          ? "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" 
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {activeDashboard?.isPublic ? "Unpublish" : "Publish Now"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When published, anyone with the link can view your dashboard in real-time. No login required.
                  </p>
                </div>

                {activeDashboard?.isPublic && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Public Link</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600 truncate font-mono">
                        {publicUrl}
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                      </button>
                    </div>
                    <a 
                      href={publicUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full py-3 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <ExternalLink size={18} />
                      <span>Open Public View</span>
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Widget Modal */}
      <AnimatePresence>
        {isAddingWidget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Add New Widget</h2>
                <button
                  onClick={() => setIsAddingWidget(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <Trash2 size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 1: Select Dataset</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {datasets.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDatasetId(d.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedDatasetId === d.id 
                            ? "border-indigo-600 bg-indigo-50/50" 
                            : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${selectedDatasetId === d.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                            <TableIcon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{d.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{d.rowCount} Rows</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 2: Choose Widget Type</label>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { type: WidgetType.BAR_CHART, icon: BarChart3, label: "Bar Chart" },
                      { type: WidgetType.LINE_CHART, icon: LineChartIcon, label: "Line Chart" },
                      { type: WidgetType.PIE_CHART, icon: PieChartIcon, label: "Pie Chart" },
                      { type: WidgetType.TABLE, icon: TableIcon, label: "Data Table" },
                      { type: WidgetType.KPI_CARD, icon: CreditCard, label: "KPI Card" },
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleAddWidget(item.type)}
                        disabled={!selectedDatasetId}
                        className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <item.icon size={32} className="text-slate-400 group-hover:text-indigo-600 mb-3" />
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Widget Settings Sidebar */}
      <AnimatePresence>
        {editingWidgetId && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWidgetId(null)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-96 bg-white h-full shadow-2xl border-l border-slate-200 p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-900">Widget Settings</h2>
                <button
                  onClick={() => setEditingWidgetId(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <Trash2 size={20} className="text-slate-400" />
                </button>
              </div>

              {activeDashboard?.widgets.find((w) => w.id === editingWidgetId) && (
                <WidgetSettings
                  widget={activeDashboard.widgets.find((w) => w.id === editingWidgetId)!}
                  datasets={datasets}
                  setDatasets={setDatasets}
                  onUpdate={(updates) => updateWidget(editingWidgetId, updates)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WidgetSettings: React.FC<{
  widget: WidgetConfig;
  datasets: Dataset[];
  setDatasets: (datasets: Dataset[] | ((prev: Dataset[]) => Dataset[])) => void;
  onUpdate: (updates: Partial<WidgetConfig>) => void;
}> = ({ widget, datasets, setDatasets, onUpdate }) => {
  const dataset = datasets.find((d) => d.id === widget.datasetId);
  const [newColName, setNewColName] = useState("");
  const [newColFormula, setNewColFormula] = useState("");
  const [showFormulaInput, setShowFormulaInput] = useState(false);

  const handleAddCalculatedColumn = () => {
    if (!dataset || !newColName || !newColFormula) return;

    const updatedDataset = transformDataset(dataset, {
      newColumns: [{ name: newColName, formula: newColFormula }],
    });

    setDatasets((prev) =>
      prev.map((d) => (d.id === dataset.id ? updatedDataset : d))
    );

    setNewColName("");
    setNewColFormula("");
    setShowFormulaInput(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Widget Title</label>
        <input
          type="text"
          value={widget.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dataset</label>
        <select
          value={widget.datasetId || ""}
          onChange={(e) => onUpdate({ datasetId: e.target.value, xAxis: [], yAxis: [] })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select Dataset</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {dataset && (
        <>
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calculated Columns</label>
              <button
                onClick={() => setShowFormulaInput(!showFormulaInput)}
                className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                title="Add Calculated Column"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <AnimatePresence>
              {showFormulaInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3 overflow-hidden"
                >
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Column Name (e.g. Profit)"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                    placeholder="Formula (e.g. [Revenue] - [Cost])"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowFormulaInput(false)}
                      className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCalculatedColumn}
                      className="px-3 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">X-Axis (Category)</label>
            <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              {dataset.columns
                .filter((col) => !dataset.hiddenColumns?.includes(col.name))
                .map((col) => {
                  const isSelected = widget.xAxis?.includes(col.name);
                  return (
                    <label key={col.id} className="flex items-center space-x-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const current = widget.xAxis || [];
                          let next;
                          if (e.target.checked) {
                            next = [...current, col.name];
                          } else {
                            next = current.filter((c) => c !== col.name);
                          }
                          onUpdate({ xAxis: next });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{col.name}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Y-Axis (Values)</label>
            <div className="max-h-60 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              {dataset.columns
                .filter((col) => !dataset.hiddenColumns?.includes(col.name))
                .map((col) => {
                  const isSelected = widget.yAxis?.includes(col.name);
                  const config = widget.yAxisConfigs?.find(c => c.column === col.name);
                  
                  return (
                    <div key={col.id} className={`space-y-2 p-2 rounded-lg border transition-all ${isSelected ? "bg-white border-indigo-100 shadow-sm" : "bg-transparent border-transparent"}`}>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = widget.yAxis || [];
                            const currentConfigs = widget.yAxisConfigs || [];
                            
                            let next;
                            let nextConfigs;
                            
                            if (e.target.checked) {
                              next = [...current, col.name];
                              nextConfigs = [...currentConfigs, { column: col.name, aggregation: widget.aggregation || "sum" }];
                            } else {
                              next = current.filter((c) => c !== col.name);
                              nextConfigs = currentConfigs.filter((c) => c.column !== col.name);
                            }
                            
                            onUpdate({ yAxis: next, yAxisConfigs: nextConfigs });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{col.name}</span>
                      </label>
                      
                      {isSelected && (
                        <div className="space-y-2 pl-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Agg:</span>
                            <select
                              value={config?.aggregation || widget.aggregation || "sum"}
                              onChange={(e) => {
                                const currentConfigs = widget.yAxisConfigs || [];
                                let nextConfigs;
                                if (currentConfigs.find(c => c.column === col.name)) {
                                  nextConfigs = currentConfigs.map(c => 
                                    c.column === col.name ? { ...c, aggregation: e.target.value as any } : c
                                  );
                                } else {
                                  nextConfigs = [...currentConfigs, { column: col.name, aggregation: e.target.value as any }];
                                }
                                onUpdate({ yAxisConfigs: nextConfigs });
                              }}
                              className="flex-1 p-1 bg-slate-50 border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="sum">Sum</option>
                              <option value="avg">Average</option>
                              <option value="count">Count</option>
                              <option value="min">Min</option>
                              <option value="max">Max</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Type:</span>
                            <select
                              value={config?.type || widget.type}
                              onChange={(e) => {
                                const currentConfigs = widget.yAxisConfigs || [];
                                const newType = e.target.value as WidgetType;
                                let nextConfigs;
                                if (currentConfigs.find(c => c.column === col.name)) {
                                  nextConfigs = currentConfigs.map(c => 
                                    c.column === col.name ? { ...c, type: newType } : c
                                  );
                                } else {
                                  nextConfigs = [...currentConfigs, { column: col.name, aggregation: widget.aggregation || "sum", type: newType }];
                                }
                                onUpdate({ yAxisConfigs: nextConfigs });
                              }}
                              className="flex-1 p-1 bg-slate-50 border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value={WidgetType.BAR_CHART}>Bar Chart</option>
                              <option value={WidgetType.LINE_CHART}>Line Chart</option>
                              <option value={WidgetType.PIE_CHART}>Pie Chart</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group By (Optional)</label>
            <select
              value={widget.groupBy || ""}
              disabled={widget.yAxis && widget.yAxis.length > 1}
              onChange={(e) => onUpdate({ groupBy: e.target.value })}
              className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${widget.yAxis && widget.yAxis.length > 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <option value="">None</option>
              {dataset.columns
                .filter((col) => !dataset.hiddenColumns?.includes(col.name))
                .map((col) => (
                  <option key={col.id} value={col.name}>{col.name}</option>
                ))}
            </select>
            {widget.yAxis && widget.yAxis.length > 1 && (
              <p className="text-[10px] text-amber-500 italic">Grouping is disabled when multiple Y-axes are selected.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Aggregation</label>
            <select
              value={widget.aggregation || "sum"}
              onChange={(e) => onUpdate({ aggregation: e.target.value as any })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
            <p className="text-[10px] text-slate-400 italic">Used for columns without a specific aggregation setting.</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filters</label>
              <div className="flex items-center space-x-2">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => onUpdate({ filterLogic: "and" })}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      (widget.filterLogic || "and") === "and" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => onUpdate({ filterLogic: "or" })}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      widget.filterLogic === "or" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    OR
                  </button>
                </div>
                <button
                  onClick={() => {
                    const filters = widget.filters || [];
                    onUpdate({ filters: [...filters, { column: dataset.columns[0].name, operator: "equals", value: "" }] });
                  }}
                  className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {widget.filters?.map((filter, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group">
                  <button
                    onClick={() => {
                      const next = [...(widget.filters || [])];
                      next.splice(index, 1);
                      onUpdate({ filters: next });
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                  
                  <select
                    value={filter.column || ""}
                    onChange={(e) => {
                      const next = [...(widget.filters || [])];
                      next[index].column = e.target.value;
                      onUpdate({ filters: next });
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {dataset.columns.map(col => (
                      <option key={col.id} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filter.operator || ""}
                    onChange={(e) => {
                      const next = [...(widget.filters || [])];
                      next[index].operator = e.target.value;
                      onUpdate({ filters: next });
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                  </select>
                  
                  <input
                    type="text"
                    value={filter.value || ""}
                    placeholder="Value..."
                    onChange={(e) => {
                      const next = [...(widget.filters || [])];
                      next[index].value = e.target.value;
                      onUpdate({ filters: next });
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              {(!widget.filters || widget.filters.length === 0) && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No filters applied.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
