// Copy to src/hooks/use-obr-theme.hook.ts. Call once in each UI entry's root component.
import { useEffect } from "react";

import { api, Theme } from "../obr";

import { useObrSubscription } from "./use-obr-subscription.hook";

const load = () => api.session.getTheme();
const subscribe = (onChange: (theme: Theme) => void) =>
  api.session.onThemeChange(onChange);

/** Mirrors the Owlbear theme into CSS variables on :root (see index.css). */
export function useObrTheme(): Theme | undefined {
  const theme = useObrSubscription<Theme | undefined>(
    load,
    subscribe,
    undefined,
  );

  useEffect(() => {
    if (!theme) return;
    const style = document.documentElement.style;
    style.setProperty("--obr-primary", theme.primary.main);
    style.setProperty("--obr-primary-contrast", theme.primary.contrastText);
    style.setProperty("--obr-secondary", theme.secondary.main);
    style.setProperty("--obr-background", theme.background.default);
    style.setProperty("--obr-paper", theme.background.paper);
    style.setProperty("--obr-text", theme.text.primary);
    style.setProperty("--obr-text-secondary", theme.text.secondary);
    style.setProperty("--obr-text-disabled", theme.text.disabled);
    document.documentElement.dataset.theme = theme.mode.toLowerCase();
  }, [theme]);

  return theme;
}
