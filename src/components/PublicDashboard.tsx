/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { WidgetRenderer } from "./WidgetRenderer";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Layout as LayoutIcon, BarChart3, Loader2 } from "lucide-react";
import { db, doc, getDoc, collection, getDocs, query, where } from "../firebase";
import { Dashboard, Dataset } from "../types";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const PublicDashboard: React.FC<{ dashboardId: string }> = ({ dashboardId }) => {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Dashboard
        const dashDoc = await getDoc(doc(db, "dashboards", dashboardId));
        if (!dashDoc.exists()) {
          setError("Dashboard not found");
          return;
        }
        const dashData = dashDoc.data() as Dashboard;
        if (!dashData.isPublic) {
          setError("This dashboard is private");
          return;
        }
        setDashboard(dashData);

        // Fetch associated datasets
        const datasetIds = Array.from(new Set(dashData.widgets.map(w => w.datasetId)));
        const fetchedDatasets: Dataset[] = [];
        
        for (const id of datasetIds) {
          const dsDoc = await getDoc(doc(db, "datasets", id));
          if (dsDoc.exists()) {
            fetchedDatasets.push(dsDoc.data() as Dataset);
          }
        }
        setDatasets(fetchedDatasets);
      } catch (err) {
        console.error("Error fetching public dashboard:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Public Dashboard...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
          <BarChart3 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{error || "Dashboard Not Found"}</h1>
        <p className="text-slate-500 max-w-md">
          The dashboard you are looking for does not exist, is private, or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutIcon size={18} />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Insight<span className="text-indigo-600">Fusion</span>
          </span>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <h1 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{dashboard.name}</h1>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Public View
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: dashboard.widgets.map((w) => ({ i: w.id, ...w.layout })) }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            isDraggable={false}
            isResizable={false}
          >
            {dashboard.widgets.map((widget) => (
              <div key={widget.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-700 truncate">{widget.title}</h3>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <WidgetRenderer widget={widget} datasets={datasets} />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-400 text-[10px] font-medium uppercase tracking-widest">
        Powered by InsightFusion Analytics
      </footer>
    </div>
  );
};
