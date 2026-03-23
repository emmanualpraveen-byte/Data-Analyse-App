/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
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
  ComposedChart,
  Area,
} from "recharts";
import { WidgetConfig, WidgetType, Dataset } from "../types";
import { aggregateData } from "../utils/dataProcessing";
import _ from "lodash";

export const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4"];

export const WidgetRenderer: React.FC<{ 
  widget: WidgetConfig; 
  datasets: Dataset[];
  globalFilters?: { column: string; operator: string; value: string }[];
  onDataPointClick?: (column: string, value: any) => void;
}> = ({ widget, datasets, globalFilters = [], onDataPointClick }) => {
  const dataset = datasets.find((d) => d.id === widget.datasetId);
  
  const { data, series } = useMemo(() => {
    if (!dataset || !widget.xAxis || widget.xAxis.length === 0 || !widget.yAxis?.[0]) return { data: [], series: [] };
    
    // Merge widget filters with global filters
    const allFilters = [...(widget.filters || []), ...globalFilters];
    
    return aggregateData(
      dataset.rows, 
      widget.xAxis, 
      widget.yAxis, 
      widget.aggregation || "sum",
      widget.groupBy,
      allFilters,
      widget.yAxisConfigs,
      widget.filterLogic || "and"
    );
  }, [dataset, widget, globalFilters]);

  if (!dataset) return <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">Select a dataset in settings</div>;
  if (!widget.xAxis || widget.xAxis.length === 0 || !widget.yAxis?.[0]) return <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">Configure fields in settings</div>;

  const handleBarClick = (data: any) => {
    if (onDataPointClick && widget.xAxis && widget.xAxis.length > 0) {
      onDataPointClick(widget.xAxis[0], data.name);
    }
  };

  const handlePieClick = (data: any) => {
    if (onDataPointClick && widget.xAxis && widget.xAxis.length > 0) {
      onDataPointClick(widget.xAxis[0], data.name);
    }
  };

  switch (widget.type) {
    case WidgetType.BAR_CHART:
    case WidgetType.LINE_CHART:
      return (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
            {series.map((s, i) => {
              const config = widget.yAxisConfigs?.find(c => c.column === s || (widget.groupBy && s.startsWith(`${widget.groupBy}:`)));
              const chartType = config?.type || widget.type;
              
              if (chartType === WidgetType.LINE_CHART) {
                return (
                  <Line 
                    key={s} 
                    type="monotone" 
                    dataKey={s} 
                    stroke={COLORS[i % COLORS.length]} 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: COLORS[i % COLORS.length], cursor: onDataPointClick ? 'pointer' : 'default' }}
                    onClick={(e: any) => {
                      if (onDataPointClick && widget.xAxis && widget.xAxis.length > 0 && e) {
                        onDataPointClick(widget.xAxis[0], e.activeLabel);
                      }
                    }}
                  />
                );
              }
              
              return (
                <Bar 
                  key={s} 
                  dataKey={s} 
                  fill={COLORS[i % COLORS.length]} 
                  radius={[4, 4, 0, 0]} 
                  onClick={handleBarClick}
                  style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      );
    case WidgetType.PIE_CHART:
      // For Pie, we usually want to see the breakdown of the first series
      const pieData = data.map(item => ({
        name: item.name,
        value: item[series[0]] || 0
      }));
      return (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
          <PieChart>
            <Pie
              data={pieData}
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={5}
              dataKey="value"
              onClick={handlePieClick}
              style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    case WidgetType.KPI_CARD:
      const total = _.sumBy(data, (item) => {
        return _.sum(series.map(s => item[s] || 0));
      });
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{widget.title}</span>
          <span className="text-4xl font-black text-slate-900 tracking-tight">
            {total.toLocaleString()}
          </span>
          <div className="mt-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
            +12.5% vs last period
          </div>
        </div>
      );
    case WidgetType.TABLE:
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-left text-[10px]">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th className="py-2 font-bold text-slate-400 border-b">Category</th>
                {series.map(s => (
                  <th key={s} className="py-2 font-bold text-slate-400 border-b text-right">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-slate-600 font-medium">{item.name}</td>
                  {series.map(s => (
                    <td key={s} className="py-2 text-slate-900 text-right">{(item[s] || 0).toLocaleString()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
};
