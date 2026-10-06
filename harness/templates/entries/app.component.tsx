// Copy to src/components/app/app.component.tsx (root component of the popover).
import { useObrReady, useObrTheme, usePlayerRole } from "../../hooks";

export function App() {
  const ready = useObrReady();
  useObrTheme();
  const { isGM } = usePlayerRole();

  if (!ready) return null;
  return <main className="app">{isGM ? "GM view" : "Player view"}</main>;
}
