import { fetchApiVersion } from "../lib/api";
import en from "../../../../packages/shared/messages/en.json";

export async function Footer() {
  const apiVersion = await fetchApiVersion();
  const uiVersion = process.env["NEXT_PUBLIC_APP_VERSION"] ?? "0.0.0";

  const apiLabel = en.Footer.api.replace("{version}", apiVersion);
  const uiLabel = en.Footer.ui.replace("{version}", uiVersion);

  return (
    <footer>
      <p>
        {apiLabel} | {uiLabel}
      </p>
    </footer>
  );
}
