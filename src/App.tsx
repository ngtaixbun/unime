import { useCallback, useEffect, useState } from "react";

import { OverviewPage } from "@/feature/overview";
import { TeamDetails, TeamPage } from "@/feature/team";
import { TeamProvider } from "@/feature/team/hooks";

function App() {
  const [location, setLocation] = useState(() => `${window.location.pathname}${window.location.search}`);
  useEffect(() => {
    const handlePopState = () => setLocation(`${window.location.pathname}${window.location.search}`);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const navigate = useCallback((path: string) => {
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, "", path);
    setLocation(path);
  }, []);

  const pathname = location.split("?")[0];
  return (
    <TeamProvider>
      {pathname === "/team/details" ? <TeamDetails onNavigate={navigate} /> : pathname === "/team" ? <TeamPage onNavigate={navigate} /> : <OverviewPage onNavigate={navigate} />}
    </TeamProvider>
  );
}

export default App;
