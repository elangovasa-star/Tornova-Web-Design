import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Everything environment-specific comes from the server at run time
// (GET /api/v1/site/config), so the same build works on localhost today and on
// https://tornovabackup.com later. Nothing here names a host.

/** Stage 15: an EXE artifact's published metadata, as GET /api/v1/site/config's own "release"
 * field carries it - the same catalog the Agent's own update checker reads (GET
 * /api/v1/releases/latest), never a second, parallel copy. */
export interface SiteReleaseExe {
  sizeBytes: number;
  sha256: string | null;
  signed: boolean;
}

export interface SiteRelease {
  version: string;
  releaseDateUtc: string | null;
  releaseNotesUrl: string | null;
  signingActive: boolean;
  exe: SiteReleaseExe | null;
  /** Stage 15 fix round (Codex P1-4): the MSI's own published metadata, from the SAME release
   * catalog entry msiUrl above is now derived from - kept in step with it by construction. */
  msi: SiteReleaseExe | null;
}

export interface SiteConfig {
  publicOrigin: string;
  isPrivate: boolean;
  installerUrl: string | null;
  /** Stage 15: the enterprise MSI download URL (handoff §3.2/§3.3) - null until VG publishes one,
   * same "empty until configured" convention as installerUrl. IT/Admin deployment only; never
   * presented as a second, unrelated Tornova product. */
  msiUrl: string | null;
  /** Stage 15: the currently published release's own metadata (version, date, checksum, signed
   * status, release notes) - null until VG publishes one, or while the emergency update-stop kill
   * switch (Releases:Enabled=false) is on. */
  release: SiteRelease | null;
  enabledLocales: string[];
  /** "Global" | "India" | null (unlisted host). */
  market: string | null;
  /** Closed until the server says otherwise (VG: deferred to Stage 14). */
  checkoutEnabled: boolean;
}

// Safe defaults if the API cannot be reached: private, no installer, English only.
export const DEFAULT_CONFIG: SiteConfig = { publicOrigin: "https://tornovabackup.com", isPrivate: true, installerUrl: null, msiUrl: null, release: null, enabledLocales: ["en"], market: "Global", checkoutEnabled: false };

const Context = createContext<SiteConfig>(DEFAULT_CONFIG);

export function SiteConfigProvider({ children, initial }: { children: ReactNode; initial?: SiteConfig }) {
  const [config, setConfig] = useState<SiteConfig>(initial ?? DEFAULT_CONFIG);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetch("/api/v1/site/config", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => !cancelled && c && setConfig({ ...DEFAULT_CONFIG, ...c }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return <Context.Provider value={config}>{children}</Context.Provider>;
}

export const useSiteConfig = () => useContext(Context);

/** The public price tables are the Global / US-dollar catalog. They are an offer a
 *  visitor can act on only on the Global storefront; the India (INR) storefront's
 *  public pricing is not finished (open P1, deferred to Stage 14). */
export function usePublicOffer(): { available: boolean; india: boolean } {
  const { market } = useSiteConfig();
  return { available: market !== "India", india: market === "India" };
}
