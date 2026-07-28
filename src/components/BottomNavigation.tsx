import { Building2, CircleHelp, Home, UserRound, UsersRound } from "lucide-react";

export type AppNavigationRoute = "overview" | "market" | "team" | "profile" | "userguide";

interface BottomNavigationProps {
  activeRoute: AppNavigationRoute;
  onNavigate: (route: AppNavigationRoute) => void;
}

const items = [
  { id: "overview", label: "Tổng quan", icon: Home },
  { id: "market", label: "Thị trường", icon: Building2 },
  { id: "team", label: "Đội ngũ", icon: UsersRound },
  { id: "profile", label: "Hồ sơ", icon: UserRound },
  { id: "userguide", label: "Hướng dẫn", icon: CircleHelp },
] satisfies Array<{ id: AppNavigationRoute; label: string; icon: typeof Home }>;

export function BottomNavigation({ activeRoute, onNavigate }: BottomNavigationProps) {
  return (
    <nav aria-label="Điều hướng chính" className="app-bottom-nav">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeRoute;
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={`app-bottom-nav__item ${isActive ? "is-active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
