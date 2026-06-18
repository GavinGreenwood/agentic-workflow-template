import { fetchApiVersion } from "../lib/api";
import en from "../../../../packages/shared/messages/en.json";

export async function Footer() {
  const apiVersion = await fetchApiVersion();
  const uiVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

  const apiLabel = en.Footer.api.replace("{version}", apiVersion);
  const uiLabel = en.Footer.ui.replace("{version}", uiVersion);

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-xs text-slate-400 text-center">
          {apiLabel} | {uiLabel}
        </p>
      </div>
    </footer>
  );
}
