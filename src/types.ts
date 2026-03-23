/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ColumnType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  BOOLEAN = "boolean",
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  originalName: string;
}

export interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rows: any[];
  rowCount: number;
  createdAt: string;
  hiddenColumns?: string[];
}

export enum JoinType {
  INNER = "inner",
  LEFT = "left",
  FULL = "full",
}

export interface JoinConfig {
  id: string;
  leftDatasetId: string;
  rightDatasetId: string;
  leftKey: string;
  rightKey: string;
  type: JoinType;
}

export enum WidgetType {
  BAR_CHART = "bar_chart",
  LINE_CHART = "line_chart",
  PIE_CHART = "pie_chart",
  TABLE = "table",
  KPI_CARD = "kpi_card",
  HEATMAP = "heatmap",
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  datasetId: string;
  xAxis?: string[];
  yAxis?: string[];
  yAxisConfigs?: { column: string; aggregation: "sum" | "avg" | "count" | "min" | "max"; type?: WidgetType }[];
  groupBy?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  filterLogic?: "and" | "or";
  filters?: { column: string; operator: string; value: string }[];
  calculatedColumns?: { name: string; formula: string }[];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  globalFilters?: { column: string; operator: string; value: string }[];
  createdAt: string;
  isPublic?: boolean;
  slug?: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  datasetId: string;
  dashboardId?: string | null;
  createdAt: string;
  authorUid: string;
}

export interface AppState {
  datasets: Dataset[];
  joins: JoinConfig[];
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  step: "upload" | "clean" | "merge" | "dashboard" | "reports";
}
