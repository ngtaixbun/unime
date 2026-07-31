import {
  useCallback,
  useEffect,
  type ReactNode,
  useState,
} from "react";

import {
  OrganizationFilterProvider,
} from "@/components/organization-filter";
import { OverviewPage } from "@/feature/overview";
import {
  TeamDetails,
  TeamPage,
} from "@/feature/team";
import { TeamProvider } from "@/feature/team/hooks";

function App() {
  const [location, setLocation] = useState(
    () =>
      `${window.location.pathname}${window.location.search}`,
  );

  useEffect(() => {
    const handlePopState = () => {
      setLocation(
        `${window.location.pathname}${window.location.search}`,
      );
    };

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  const navigate = useCallback(
    (path: string) => {
      if (
        `${window.location.pathname}${window.location.search}` !==
        path
      ) {
        window.history.pushState(
          {},
          "",
          path,
        );
      }

      setLocation(path);
    },
    [],
  );

  const pathname = location.split("?")[0];

  let page: ReactNode;

  if (
    pathname === "/team/details" ||
    pathname === "/team"
  ) {
    page = (
      <TeamProvider>
        {pathname === "/team/details" ? (
          <TeamDetails
            onNavigate={navigate}
          />
        ) : (
          <TeamPage
            onNavigate={navigate}
          />
        )}
      </TeamProvider>
    );
  } else {
    page = (
      <OverviewPage
        onNavigate={navigate}
      />
    );
  }

  return (
    <OrganizationFilterProvider>
      {page}
    </OrganizationFilterProvider>
  );
}

export default App;
