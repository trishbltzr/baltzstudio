import * as React from "react";

// Mirrors src/home/hooks/use-mobile.tsx — kept as a separate, dashboard-local
// copy on purpose (the home page and dashboard intentionally run two parallel
// systems; merging them is out of scope and riskier than duplicating ~25 lines).
const MOBILE_BREAKPOINT = 768;

function useMediaMaxWidth(maxWidth: number) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const onChange = () => {
      setMatches(window.innerWidth < maxWidth);
    };
    mql.addEventListener("change", onChange);
    setMatches(window.innerWidth < maxWidth);
    return () => mql.removeEventListener("change", onChange);
  }, [maxWidth]);

  return !!matches;
}

export function useIsMobile() {
  return useMediaMaxWidth(MOBILE_BREAKPOINT);
}
