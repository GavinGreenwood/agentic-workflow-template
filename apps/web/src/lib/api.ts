const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchApiVersion(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/version`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { version?: string };
    return data.version ?? "unavailable";
  } catch {
    return "unavailable";
  }
}
