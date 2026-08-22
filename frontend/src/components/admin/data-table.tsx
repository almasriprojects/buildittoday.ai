"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ChevronsUpDown, Filter, X } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  filterable?: boolean;
  filterKey?: string;
  filterOptions?: { value: string; label: string }[];
}

export type SortDir = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyTitle?: string;
  emptyDescription?: string;
  onView?: (row: T) => void;
  onRowClick?: (row: T) => void;
  sortBy?: string | null;
  sortDir?: SortDir | null;
  onSortChange?: (key: string | null, dir: SortDir | null) => void;
  filters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = "No records yet",
  emptyDescription = "Records will appear here once added.",
  onView,
  onRowClick,
  sortBy,
  sortDir,
  onSortChange,
  filters = {},
  onFilterChange,
}: DataTableProps<T>) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-4xl mb-4">📭</p>
        <h3 className="text-lg font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyDescription}</p>
      </div>
    );
  }

  const handleSort = (col: Column<T>) => {
    if (!onSortChange || !col.sortable) return;
    const key = col.sortKey ?? col.key;
    // Cycle: none → asc → desc → none
    if (sortBy !== key) {
      onSortChange(key, "asc");
    } else if (sortDir === "asc") {
      onSortChange(key, "desc");
    } else if (sortDir === "desc") {
      onSortChange(null, null);
    } else {
      onSortChange(key, "asc");
    }
    setOpenMenu(null);
  };

  const handleFilter = (col: Column<T>, value: string) => {
    if (!onFilterChange) return;
    const key = col.filterKey ?? col.sortKey ?? col.key;
    onFilterChange(key, value);
    setOpenMenu(null);
  };

  const clearFilter = (col: Column<T>) => {
    if (!onFilterChange) return;
    const key = col.filterKey ?? col.sortKey ?? col.key;
    onFilterChange(key, "");
    setOpenMenu(null);
  };

  const renderHeader = (col: Column<T>) => {
    const sortKey = col.sortKey ?? col.key;
    const filterKey = col.filterKey ?? col.sortKey ?? col.key;
    const isSortActive = col.sortable && sortBy === sortKey;
    const isAsc = isSortActive && sortDir === "asc";
    const isDesc = isSortActive && sortDir === "desc";
    const hasFilter = col.filterable && filters[filterKey] && filters[filterKey] !== "all";
    const isMenuOpen = openMenu === col.key;

    // Non-interactive column
    if (!col.sortable && !col.filterable) {
      return (
        <th key={col.key} className="text-left py-3 px-2 font-medium text-muted-foreground">
          {col.label}
        </th>
      );
    }

    return (
      <th key={col.key} className="text-left py-3 px-2 font-medium relative">
        <div ref={isMenuOpen ? menuRef : undefined} className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpenMenu(isMenuOpen ? null : col.key)}
            className={`inline-flex items-center gap-1.5 group transition-colors ${
              isSortActive || hasFilter
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-slate-900"
            }`}
            title={`Sort & filter by ${col.label}`}
          >
            {col.label}
            {isAsc ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : isDesc ? (
              <ArrowDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70" />
            )}
            {hasFilter && <Filter className="w-3 h-3 text-primary" />}
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="p-1.5">
                <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Sort
                </p>
                <button
                  type="button"
                  onClick={() => handleSort(col)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-50 ${
                    isAsc ? "text-primary font-medium" : "text-slate-700"
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Sort A → Z
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!onSortChange) return;
                    onSortChange(sortKey, "desc");
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-50 ${
                    isDesc ? "text-primary font-medium" : "text-slate-700"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Sort Z → A
                </button>
                {isSortActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!onSortChange) return;
                      onSortChange(null, null);
                      setOpenMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 rounded-md hover:bg-slate-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear sort
                  </button>
                )}

                {col.filterable && col.filterOptions && col.filterOptions.length > 0 && (
                  <>
                    <div className="my-1.5 border-t border-slate-100" />
                    <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Filter
                    </p>
                    <button
                      type="button"
                      onClick={() => clearFilter(col)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-50 ${
                        !hasFilter ? "text-primary font-medium" : "text-slate-700"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      All
                    </button>
                    {col.filterOptions.map((opt) => {
                      const isActive = filters[filterKey] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleFilter(col, opt.value)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-50 ${
                            isActive ? "text-primary font-medium" : "text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              isActive ? "bg-primary border-primary" : "border-slate-300"
                            }`}
                          >
                            {isActive && <span className="text-white text-[9px] leading-none">✓</span>}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((col) => renderHeader(col))}
            {onView && <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-2">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              {onView && (
                <td className="py-3 px-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onView(row)}>View</Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
