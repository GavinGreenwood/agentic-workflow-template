import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Template App",
  description: "Turborepo monorepo template",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
