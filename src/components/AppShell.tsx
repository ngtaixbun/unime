import type { ReactNode, Ref } from "react";

interface AppShellProps {
  children: ReactNode;
  contentRef?: Ref<HTMLElement>;
  footer?: ReactNode;
  overlays?: ReactNode;
}

export function AppShell({ children, contentRef, footer, overlays }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__viewport phone">
        <main ref={contentRef} id="app" className="app-shell__scroll app">
          {children}
        </main>
        {footer}
        {overlays}
      </div>
    </div>
  );
}
