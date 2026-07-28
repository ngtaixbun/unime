import type { OverviewRoute } from "../types";

export function canNavigate(route: OverviewRoute): boolean {
  return route === "overview";
}

export function getUnavailableRouteMessage(): string {
  return "Chức năng chưa được triển khai";
}
