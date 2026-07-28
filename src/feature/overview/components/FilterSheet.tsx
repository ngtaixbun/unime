import {
  X,
} from "lucide-react";

import {
  isEncodedDimensionValue,
} from "@/queries/org-filter";

import type {
  FilterOption,
  OverviewFilters,
} from "../types";

interface FilterSheetProps {
  isOpen: boolean;
  filters: OverviewFilters;

  regionOptions: FilterOption[];
  ammOptions: FilterOption[];
  supervisorOptions: FilterOption[];

  isLoadingRegion?: boolean;
  isLoadingAmm?: boolean;
  isLoadingSupervisor?: boolean;
  optionsError?: string | null;

  onChange: <
    Key extends keyof OverviewFilters,
  >(
    key: Key,
    value: OverviewFilters[Key],
  ) => void;

  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: FilterOption["value"];
  options: FilterOption[];
  disabled?: boolean;
  onChange: (
    value: FilterOption["value"],
  ) => void;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  disabled = false,
  onChange,
}: FilterSelectProps) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>

      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue =
            event.currentTarget.value;

          if (
            isEncodedDimensionValue(
              nextValue,
            )
          ) {
            onChange(nextValue);
          }
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterSheet({
  isOpen,
  filters,
  regionOptions,
  ammOptions,
  supervisorOptions,
  isLoadingRegion = false,
  isLoadingAmm = false,
  isLoadingSupervisor = false,
  optionsError = null,
  onChange,
  onClear,
  onClose,
  onApply,
}: FilterSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="simple-filter-overlay show"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="simple-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-filter-title"
      >
        <div
          className="simple-filter-handle"
          aria-hidden="true"
        />

        <header className="simple-filter-head">
          <b id="overview-filter-title">
            Bộ lọc dữ liệu
          </b>

          <button
            className="simple-filter-close"
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="simple-filter-grid">
          <FilterSelect
            id="overview-filter-region"
            label="Khu vực"
            value={filters.region}
            options={regionOptions}
            disabled={isLoadingRegion}
            onChange={(value) => {
              onChange(
                "region",
                value,
              );
            }}
          />

          <FilterSelect
            id="overview-filter-amm"
            label="AMM"
            value={filters.amm}
            options={ammOptions}
            disabled={isLoadingAmm}
            onChange={(value) => {
              onChange(
                "amm",
                value,
              );
            }}
          />

          <FilterSelect
            id="overview-filter-supervisor"
            label="Supervisor"
            value={filters.supervisor}
            options={supervisorOptions}
            disabled={
              isLoadingSupervisor
            }
            onChange={(value) => {
              onChange(
                "supervisor",
                value,
              );
            }}
          />
        </div>

        {optionsError ? (
          <p
            className="simple-filter-error"
            role="status"
          >
            Không thể tải đầy đủ danh sách bộ lọc.
          </p>
        ) : null}

        <div className="simple-filter-actions">
          <button
            className="simple-filter-clear"
            type="button"
            onClick={onClear}
          >
            Xóa lọc
          </button>

          <button
            className="simple-filter-apply"
            type="button"
            onClick={onApply}
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </section>
    </div>
  );
}
