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
  ScatterChart,
  Scatter,
  ZAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Funnel,
  FunnelChart as RechartsFunnelChart,
  LabelList,
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

  const renderTitle = () => {
    if (widget.showTitle === false) return null;
    return (
      <div className="text-center mb-2">
        <h3 className="text-sm font-bold text-slate-700">{widget.title}</h3>
      </div>
    );
  };

  const renderChart = () => {
    switch (widget.type) {
      case WidgetType.BAR_CHART:
      case WidgetType.LINE_CHART:
      case WidgetType.AREA_CHART:
      case WidgetType.COMBO_CHART:
        return (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              {widget.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
              {widget.showXAxis !== false && (
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  label={widget.xAxisLabel ? { value: widget.xAxisLabel, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' } : undefined}
                />
              )}
              {widget.showYAxis !== false && (
                <YAxis 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  label={widget.yAxisLabel ? { value: widget.yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' } : undefined}
                />
              )}
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                formatter={(value: any, name: string) => {
                  const config = widget.yAxisConfigs?.find(c => c.column === name || (widget.groupBy && name.startsWith(`${widget.groupBy}:`)));
                  return [value.toLocaleString(), config?.label || name];
                }}
              />
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign={widget.legendPosition === 'bottom' ? 'bottom' : 'top'} 
                  align={widget.legendPosition === 'left' ? 'left' : 'right'} 
                  layout={widget.legendPosition === 'left' || widget.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }}
                  formatter={(value: string) => {
                    const config = widget.yAxisConfigs?.find(c => c.column === value || (widget.groupBy && value.startsWith(`${widget.groupBy}:`)));
                    return config?.label || value;
                  }}
                />
              )}
              {series.map((s, i) => {
                const config = widget.yAxisConfigs?.find(c => c.column === s || (widget.groupBy && s.startsWith(`${widget.groupBy}:`)));
                const chartType = config?.type || widget.type;
                const color = config?.color || COLORS[i % COLORS.length];
                const labelProps = widget.showDataLabels ? {
                  position: (widget.dataLabelPosition || "top") as any,
                  fontSize: 10,
                  fill: "#64748b",
                  offset: 10,
                } : undefined;
                
                if (chartType === WidgetType.LINE_CHART) {
                  return (
                    <Line 
                      key={s} 
                      type="monotone" 
                      dataKey={s} 
                      stroke={color} 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: color, cursor: onDataPointClick ? 'pointer' : 'default' }}
                      name={config?.label || s}
                      onClick={(e: any) => {
                        if (onDataPointClick && widget.xAxis && widget.xAxis.length > 0 && e) {
                          onDataPointClick(widget.xAxis[0], e.activeLabel);
                        }
                      }}
                    >
                      {widget.showDataLabels && <LabelList {...labelProps} dataKey={s} />}
                    </Line>
                  );
                }

                if (chartType === WidgetType.AREA_CHART) {
                  return (
                    <Area
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.3}
                      name={config?.label || s}
                    >
                      {widget.showDataLabels && <LabelList {...labelProps} dataKey={s} />}
                    </Area>
                  );
                }
                
                return (
                  <Bar 
                    key={s} 
                    dataKey={s} 
                    fill={color} 
                    radius={[4, 4, 0, 0]} 
                    name={config?.label || s}
                    onClick={handleBarClick}
                    style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  >
                    {widget.showDataLabels && <LabelList {...labelProps} dataKey={s} />}
                  </Bar>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case WidgetType.PIE_CHART:
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
                {...(widget.showDataLabels ? { label: { fontSize: 10, fill: '#64748b' } } : {})}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
              />
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign={widget.legendPosition === 'bottom' ? 'bottom' : 'top'} 
                  align={widget.legendPosition === 'left' ? 'left' : 'right'} 
                  layout={widget.legendPosition === 'left' || widget.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }} 
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        );
      case WidgetType.SCATTER_PLOT:
        return (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              {widget.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
              {widget.showXAxis !== false && (
                <XAxis 
                  type="category" 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  label={widget.xAxisLabel ? { value: widget.xAxisLabel, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' } : undefined}
                />
              )}
              {widget.showYAxis !== false && (
                <YAxis 
                  type="number" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  label={widget.yAxisLabel ? { value: widget.yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' } : undefined}
                />
              )}
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign={widget.legendPosition === 'bottom' ? 'bottom' : 'top'} 
                  align={widget.legendPosition === 'left' ? 'left' : 'right'} 
                  layout={widget.legendPosition === 'left' || widget.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }} 
                />
              )}
              {series.map((s, i) => (
                <Scatter 
                  key={s} 
                  name={widget.yAxisConfigs?.find(c => c.column === s)?.label || s} 
                  data={data} 
                  fill={widget.yAxisConfigs?.find(c => c.column === s)?.color || COLORS[i % COLORS.length]} 
                  dataKey={s}
                >
                  {widget.showDataLabels && (
                    <LabelList 
                      dataKey={s} 
                      position={widget.dataLabelPosition || "top"} 
                      fontSize={10} 
                      fill="#64748b" 
                    />
                  )}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      case WidgetType.RADAR_CHART:
        return (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              {widget.showGrid !== false && <PolarGrid stroke="#f1f5f9" />}
              <PolarAngleAxis dataKey="name" fontSize={10} />
              <PolarRadiusAxis fontSize={10} />
              {series.map((s, i) => (
                <Radar
                  key={s}
                  name={widget.yAxisConfigs?.find(c => c.column === s)?.label || s}
                  dataKey={s}
                  stroke={widget.yAxisConfigs?.find(c => c.column === s)?.color || COLORS[i % COLORS.length]}
                  fill={widget.yAxisConfigs?.find(c => c.column === s)?.color || COLORS[i % COLORS.length]}
                  fillOpacity={0.6}
                >
                  {widget.showDataLabels && (
                    <LabelList 
                      dataKey={s} 
                      position={widget.dataLabelPosition || "top"} 
                      fontSize={10} 
                      fill="#64748b" 
                    />
                  )}
                </Radar>
              ))}
              <Tooltip />
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign={widget.legendPosition === 'bottom' ? 'bottom' : 'top'} 
                  align={widget.legendPosition === 'left' ? 'left' : 'right'} 
                  layout={widget.legendPosition === 'left' || widget.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }} 
                />
              )}
            </RechartsRadarChart>
          </ResponsiveContainer>
        );
      case WidgetType.FUNNEL_CHART:
        const funnelData = data.map((item, i) => ({
          value: item[series[0]] || 0,
          name: item.name,
          fill: COLORS[i % COLORS.length],
        }));
        return (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
            <RechartsFunnelChart>
              <Tooltip />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
              >
                <LabelList 
                  position={widget.dataLabelPosition === 'outsideEnd' ? 'right' : 'inside'} 
                  fill={widget.dataLabelPosition === 'outsideEnd' ? '#64748b' : '#fff'} 
                  stroke="none" 
                  dataKey="name" 
                  fontSize={10} 
                />
              </Funnel>
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign={widget.legendPosition === 'bottom' ? 'bottom' : 'top'} 
                  align={widget.legendPosition === 'left' ? 'left' : 'right'} 
                  layout={widget.legendPosition === 'left' || widget.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }} 
                />
              )}
            </RechartsFunnelChart>
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
              {widget.kpiPrefix || ""}{total.toLocaleString()}{widget.kpiSuffix || ""}
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

  return (
    <div className="flex flex-col h-full">
      {renderTitle()}
      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>
    </div>
  );
};
