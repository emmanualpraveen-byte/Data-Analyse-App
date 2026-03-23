/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dataset, JoinConfig, JoinType, ColumnType } from "../types";
import _ from "lodash";

/**
 * Perform a join between two datasets.
 */
export function joinDatasets(
  left: Dataset,
  right: Dataset,
  config: JoinConfig
): Dataset {
  const { leftKey, rightKey, type } = config;

  // Index the right dataset by the join key for faster lookup
  const rightIndex = _.groupBy(right.rows, rightKey);

  const mergedRows: any[] = [];

  if (type === JoinType.INNER) {
    left.rows.forEach((leftRow) => {
      const matches = rightIndex[leftRow[leftKey]];
      if (matches) {
        matches.forEach((rightRow) => {
          mergedRows.push({ ...leftRow, ...rightRow });
        });
      }
    });
  } else if (type === JoinType.LEFT) {
    left.rows.forEach((leftRow) => {
      const matches = rightIndex[leftRow[leftKey]];
      if (matches) {
        matches.forEach((rightRow) => {
          mergedRows.push({ ...leftRow, ...rightRow });
        });
      } else {
        // Fill right columns with null
        const emptyRight = _.mapValues(right.rows[0], () => null);
        mergedRows.push({ ...leftRow, ...emptyRight });
      }
    });
  } else if (type === JoinType.FULL) {
    // Left join part
    const matchedRightIndices = new Set<number>();
    left.rows.forEach((leftRow) => {
      const matches = rightIndex[leftRow[leftKey]];
      if (matches) {
        matches.forEach((rightRow) => {
          mergedRows.push({ ...leftRow, ...rightRow });
          // Track matched right rows (this is simplified, ideally use unique IDs)
          // For now, we'll use a more robust approach below
        });
      } else {
        const emptyRight = _.mapValues(right.rows[0], () => null);
        mergedRows.push({ ...leftRow, ...emptyRight });
      }
    });

    // Right join part (rows in right not in left)
    const leftIndex = _.groupBy(left.rows, leftKey);
    right.rows.forEach((rightRow) => {
      if (!leftIndex[rightRow[rightKey]]) {
        const emptyLeft = _.mapValues(left.rows[0], () => null);
        mergedRows.push({ ...emptyLeft, ...rightRow });
      }
    });
  }

  // Combine columns
  const combinedColumns = [...left.columns];
  right.columns.forEach((col) => {
    if (!combinedColumns.find((c) => c.name === col.name)) {
      combinedColumns.push(col);
    }
  });

  return {
    id: `merged_${left.id}_${right.id}`,
    name: `Merged: ${left.name} & ${right.name}`,
    columns: combinedColumns,
    rows: mergedRows,
    rowCount: mergedRows.length,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Detect column types from a sample of rows.
 */
export function detectColumnTypes(rows: any[]): Record<string, ColumnType> {
  if (rows.length === 0) return {};

  const sampleSize = Math.min(rows.length, 100);
  const sample = rows.slice(0, sampleSize);
  const keys = Object.keys(rows[0]);
  const types: Record<string, ColumnType> = {};

  keys.forEach((key) => {
    let isNumber = true;
    let isDate = true;

    for (let i = 0; i < sample.length; i++) {
      const val = sample[i][key];
      if (val === null || val === undefined || val === "") continue;

      if (isNaN(Number(val))) isNumber = false;
      if (isNaN(Date.parse(val))) isDate = false;
    }

    if (isNumber) types[key] = ColumnType.NUMBER;
    else if (isDate) types[key] = ColumnType.DATE;
    else types[key] = ColumnType.TEXT;
  });

  return types;
}

/**
 * Clean data: remove duplicates, handle missing values.
 */
export function cleanDataset(
  dataset: Dataset,
  options: {
    removeDuplicates?: boolean;
    handleMissing?: "remove" | "fill_zero" | "fill_mean" | "none";
    trimSpaces?: boolean;
  }
): Dataset {
  let rows = [...dataset.rows];

  if (options.removeDuplicates) {
    rows = _.uniqWith(rows, _.isEqual);
  }

  if (options.trimSpaces) {
    rows = rows.map((row) =>
      _.mapValues(row, (val) => (typeof val === "string" ? val.trim() : val))
    );
  }

  if (options.handleMissing === "remove") {
    rows = rows.filter((row) => !Object.values(row).some((v) => v === null || v === undefined || v === ""));
  } else if (options.handleMissing === "fill_zero") {
    rows = rows.map((row) =>
      _.mapValues(row, (val) => (val === null || val === undefined || val === "" ? 0 : val))
    );
  }

  return {
    ...dataset,
    rows,
    rowCount: rows.length,
  };
}

/**
 * Transform data: select columns, add new columns via formulas.
 */
export function transformDataset(
  dataset: Dataset,
  options: {
    selectedColumns?: string[];
    newColumns?: { name: string; formula: string }[];
  }
): Dataset {
  let rows = [...dataset.rows];
  let columns = [...dataset.columns];

  // Add new columns
  if (options.newColumns) {
    options.newColumns.forEach((newCol) => {
      rows = rows.map((row) => {
        try {
          // Simple formula evaluator: replace [ColumnName] with row value
          // We also replace single '=' with '===' to support common comparison syntax and avoid assignment errors
          let formula = newCol.formula.replace(/(^|[^=<>!])=([^=]|$)/g, '$1===$2');
          
          // Sort columns by length descending to prevent partial matches (e.g., "Paid" matching "Paid status")
          const sortedCols = [...columns].sort((a, b) => b.name.length - a.name.length);

          sortedCols.forEach((col) => {
            const val = row[col.name];
            let replacement: string;
            if (typeof val === "number") {
              replacement = val.toString();
            } else if (val === null || val === undefined) {
              replacement = "null";
            } else if (typeof val === "boolean") {
              replacement = val.toString();
            } else {
              // Escape double quotes and wrap in double quotes
              replacement = `"${String(val).replace(/"/g, '\\"')}"`;
            }
            
            const escapedName = col.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            
            // 1. Replace bracketed version: [Column Name]
            formula = formula.replace(new RegExp(`\\[${escapedName}\\]`, "g"), replacement);
            
            // 2. Also try to replace unbracketed version if it's a distinct word/phrase
            // This handles cases where users forget brackets, e.g., "Paid status == 'Paid'"
            // We use a negative lookahead/lookbehind to ensure it's not already inside brackets or part of another word
            // Note: This is a heuristic and might not be perfect for all JS expressions
            const unbracketedRegex = new RegExp(`(?<!\\[)${escapedName}(?!\\])`, "g");
            formula = formula.replace(unbracketedRegex, replacement);
          });

          // Evaluate the formula
          // eslint-disable-next-line no-eval
          const result = eval(formula);
          return { ...row, [newCol.name]: result };
        } catch (err) {
          console.error(`Error evaluating formula for ${newCol.name}:`, err);
          return { ...row, [newCol.name]: null };
        }
      });

      // Add to columns list if not exists
      if (!columns.find((c) => c.name === newCol.name)) {
        const sampleVal = rows[0][newCol.name];
        let type = ColumnType.TEXT;
        if (typeof sampleVal === "number") type = ColumnType.NUMBER;
        else if (!isNaN(Date.parse(sampleVal))) type = ColumnType.DATE;

        columns.push({
          id: `col_${newCol.name}`,
          name: newCol.name,
          type,
          originalName: newCol.name,
        });
      }
    });
  }

  // Select columns
  if (options.selectedColumns) {
    columns = columns.filter((col) => options.selectedColumns?.includes(col.name));
    rows = rows.map((row) => {
      const newRow: any = {};
      options.selectedColumns?.forEach((colName) => {
        newRow[colName] = row[colName];
      });
      return newRow;
    });
  }

  return {
    ...dataset,
    columns,
    rows,
    rowCount: rows.length,
  };
}

/**
 * Aggregate data for charts.
 */
export function aggregateData(
  rows: any[],
  xAxis: string | string[],
  yAxes: string[],
  type: "sum" | "avg" | "count" | "min" | "max",
  groupBy?: string,
  filters?: { column: string; operator: string; value: string }[],
  yAxisConfigs?: { column: string; aggregation: "sum" | "avg" | "count" | "min" | "max" }[],
  filterLogic: "and" | "or" = "and"
) {
  if (rows.length === 0) return { data: [], series: [] };

  // Apply filters
  let filteredRows = [...rows];
  if (filters && filters.length > 0) {
    filteredRows = filteredRows.filter((row) => {
      const results = filters.map((f) => {
        const val = row[f.column];
        const filterVal = f.value;

        switch (f.operator) {
          case "equals": return String(val) === filterVal;
          case "not_equals": return String(val) !== filterVal;
          case "contains": return String(val).toLowerCase().includes(filterVal.toLowerCase());
          case "greater_than": return Number(val) > Number(filterVal);
          case "less_than": return Number(val) < Number(filterVal);
          default: return true;
        }
      });

      return filterLogic === "or" ? results.some(r => r) : results.every(r => r);
    });
  }

  const getXValue = (row: any) => {
    if (Array.isArray(xAxis)) {
      if (xAxis.length === 0) return "Total";
      return xAxis.map(col => String(row[col] ?? "")).join(" - ");
    }
    return String(row[xAxis] ?? "");
  };

  const xGroups = _.groupBy(filteredRows, getXValue);
  const seriesNames = new Set<string>();

  const data = Object.entries(xGroups).map(([xValue, xGroupRows]) => {
    const result: any = { name: xValue };

    if (groupBy) {
      // Group by a specific column
      const subGroups = _.groupBy(xGroupRows, groupBy);
      const yAxis = yAxes[0]; // Use first Y-axis for grouping
      const config = yAxisConfigs?.find(c => c.column === yAxis);
      const aggType = config?.aggregation || type;

      Object.entries(subGroups).forEach(([groupValue, groupRows]) => {
        const values = groupRows.map((r) => Number(r[yAxis])).filter((v) => !isNaN(v));
        let value = 0;

        switch (aggType) {
          case "sum": value = _.sum(values); break;
          case "avg": value = _.mean(values); break;
          case "count": value = groupRows.length; break;
          case "min": value = _.min(values) || 0; break;
          case "max": value = _.max(values) || 0; break;
        }

        result[groupValue] = Number(value.toFixed(2));
        seriesNames.add(groupValue);
      });
    } else {
      // Multiple Y-axes as series
      yAxes.forEach((yAxis) => {
        const config = yAxisConfigs?.find(c => c.column === yAxis);
        const aggType = config?.aggregation || type;
        const values = xGroupRows.map((r) => Number(r[yAxis])).filter((v) => !isNaN(v));
        let value = 0;

        switch (aggType) {
          case "sum": value = _.sum(values); break;
          case "avg": value = _.mean(values); break;
          case "count": value = xGroupRows.length; break;
          case "min": value = _.min(values) || 0; break;
          case "max": value = _.max(values) || 0; break;
        }

        result[yAxis] = Number(value.toFixed(2));
        seriesNames.add(yAxis);
      });
    }

    return result;
  });

  return {
    data,
    series: Array.from(seriesNames),
  };
}
