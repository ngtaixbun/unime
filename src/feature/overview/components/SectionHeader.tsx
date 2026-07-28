import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: ReactNode;
  note?: string;
  variant?: "market" | "team";
  onOpenDetail?: () => void;
}

export function SectionHeader({ title, note, variant = "market", onOpenDetail }: SectionHeaderProps) {
  return (
    <>
      <div className="memv2-section-head memv2-head-action">
        <b>{title}</b>
        {onOpenDetail ? (
          <button className="memv2-title-go" type="button" onClick={onOpenDetail} aria-label={`Mở ${title}`}>
            <span />
            <i>›</i>
          </button>
        ) : null}
      </div>
      {note ? <div className={variant === "team" ? "memv2-team-note" : "memv2-market-note"}>{note}</div> : null}
    </>
  );
}
