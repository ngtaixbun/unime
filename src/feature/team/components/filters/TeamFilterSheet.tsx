import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { TeamFilterOptions, TeamFilterState } from "../../types";

interface TeamFilterSheetProps {
  isOpen: boolean;
  filters: TeamFilterState;
  options: TeamFilterOptions;
  onChange: (name: keyof TeamFilterState, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function TeamFilterSheet(props: TeamFilterSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { isOpen, onClose } = props;
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const fields: Array<{ key: keyof TeamFilterState; label: string; all: string; options: TeamFilterOptions[keyof TeamFilterOptions] }> = [
    { key: "region", label: "Khu vực", all: "Tất cả khu vực", options: props.options.regions },
    { key: "amm", label: "AMM", all: "Tất cả AMM", options: props.options.amms },
    { key: "sup", label: "Mer Sup", all: "Tất cả Mer Sup", options: props.options.sups },
  ];
  return (
    <div className="team-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
      <section className="team-sheet team-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="team-filter-title">
        <div className="team-sheet-handle" />
        <div className="team-sheet-head"><h2 id="team-filter-title">Bộ lọc dữ liệu</h2><button ref={closeRef} type="button" aria-label="Đóng bộ lọc" onClick={props.onClose}><X /></button></div>
        <div className="team-filter-grid">
          {fields.map((field) => <label key={field.key}>{field.label}<select value={props.filters[field.key]} onChange={(event) => props.onChange(field.key, event.target.value)}><option value="all">{field.all}</option>{field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>)}
        </div>
        <div className="team-sheet-actions"><button type="button" onClick={props.onReset}>Xóa lọc</button><button type="button" onClick={props.onApply}>Áp dụng</button></div>
      </section>
    </div>
  );
}
