import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n";
import { AuthProvider } from "./lib/auth";
import { SiteConfigProvider, useSiteConfig } from "./lib/config";
import "./styles/base.css";
import "./styles/layout.css";

/** Which languages are offered is a SERVER decision (Site:EnabledLocales): a
 *  prepared translation stays hidden in production until it has been reviewed. */
function Localized({ children }: { children: ReactNode }) {
  return <I18nProvider enabledLocales={useSiteConfig().enabledLocales}>{children}</I18nProvider>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteConfigProvider>
        <Localized>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Localized>
      </SiteConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
