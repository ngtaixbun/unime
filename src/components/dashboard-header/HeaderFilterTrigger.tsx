import { SlidersHorizontal } from "lucide-react";

interface HeaderFilterTriggerProps {
  appliedFilterCount: number;
  onOpen: () => void;
  "aria-label"?: string;
}

export function HeaderFilterTrigger({
  appliedFilterCount,
  onOpen,
  "aria-label": ariaLabel = "Mở bộ lọc",
}: HeaderFilterTriggerProps) {
  const isFiltered = appliedFilterCount > 0;

  return (
    <button
      className="dashboard-filter-trigger"
      data-filtered={isFiltered ? "true" : "false"}
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
    >
      <SlidersHorizontal aria-hidden="true" />
      <span
        className="dashboard-filter-trigger__badge"
        hidden={!isFiltered}
      >
        {appliedFilterCount}
      </span>
    </button>
  );
}
