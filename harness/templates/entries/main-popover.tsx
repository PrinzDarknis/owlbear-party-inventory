// Copy to src/main-popover.tsx (one main-<context>.tsx per UI iframe).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { App } from "./components/app/app.component";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
