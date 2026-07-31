import {
  X,
} from "lucide-react";

import {
  isEncodedDimensionValue,
} from "@/queries/org-filter";

import type {
  OrganizationFilterOption,
} from "./organization-filter.types";
import {
  useOrganizationFilters,
} from "./useOrganizationFilters";

import "./organization-filter.css";

interface FilterSelectProps {
  id: string;
  label: string;
  value: OrganizationFilterOption["value"];
  options: OrganizationFilterOption[];
  disabled?: boolean;
  onChange: (
    value: OrganizationFilterOption["value"],
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

export function OrganizationFilterSheet() {
  const {
    isFilterOpen,
    draftFilters,
    regionOptions,
    ammOptions,
    supervisorOptions,
    isLoadingRegionOptions,
    isLoadingAmmOptions,
    isLoadingSupervisorOptions,
    regionOptionsError,
    ammOptionsError,
    supervisorOptionsError,
    updateDraftFilter,
    clearDraftFilters,
    closeFilterSheet,
    applyFilters,
  } = useOrganizationFilters();

  if (!isFilterOpen) {
    return null;
  }

  const optionsError =
    regionOptionsError ??
    ammOptionsError ??
    supervisorOptionsError;

  return (
    <div
      className="simple-filter-overlay show"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeFilterSheet();
        }
      }}
    >
      <section
        className="simple-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-filter-title"
      >
        <div
          className="simple-filter-handle"
          aria-hidden="true"
        />

        <header className="simple-filter-head">
          <b id="organization-filter-title">
            Bộ lọc dữ liệu
          </b>

          <button
            className="simple-filter-close"
            type="button"
            onClick={closeFilterSheet}
            aria-label="Đóng bộ lọc"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="simple-filter-grid">
          <FilterSelect
            id="organization-filter-region"
            label="Khu vực"
            value={draftFilters.region}
            options={regionOptions}
            disabled={
              isLoadingRegionOptions
            }
            onChange={(value) => {
              updateDraftFilter(
                "region",
                value,
              );
            }}
          />

          <FilterSelect
            id="organization-filter-amm"
            label="AMM"
            value={draftFilters.amm}
            options={ammOptions}
            disabled={
              isLoadingAmmOptions
            }
            onChange={(value) => {
              updateDraftFilter(
                "amm",
                value,
              );
            }}
          />

          <FilterSelect
            id="organization-filter-supervisor"
            label="Supervisor"
            value={
              draftFilters.supervisor
            }
            options={
              supervisorOptions
            }
            disabled={
              isLoadingSupervisorOptions
            }
            onChange={(value) => {
              updateDraftFilter(
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
            onClick={
              clearDraftFilters
            }
          >
            Xóa lọc
          </button>

          <button
            className="simple-filter-apply"
            type="button"
            onClick={applyFilters}
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </section>
    </div>
  );
}
