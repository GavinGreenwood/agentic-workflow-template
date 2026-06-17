import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCheckInsByKeyResult,
  createCheckIn,
} from "../../../../../lib/okr-api";

interface Props {
  params: Promise<{ id: string; keyResultId: string }>;
}

export default async function CheckInPage({ params }: Props) {
  const { id, keyResultId } = await params;

  const checkIns = await getCheckInsByKeyResult(keyResultId).catch(() => []);

  async function handleCheckIn(formData: FormData) {
    "use server";
    await createCheckIn({
      keyResultId,
      value: Number(formData.get("value")),
      note: (formData.get("note") as string) || undefined,
    });
    redirect(`/objectives/${id}`);
  }

  return (
    <main>
      <Link href={`/objectives/${id}`}>← Back to objective</Link>
      <h1>Log check-in</h1>

      <form action={handleCheckIn}>
        <div>
          <label htmlFor="value">New value</label>
          <input id="value" name="value" type="number" required />
        </div>
        <div>
          <label htmlFor="note">Note (optional)</label>
          <textarea id="note" name="note" />
        </div>
        <button type="submit">Save check-in</button>
      </form>

      {checkIns.length > 0 && (
        <section>
          <h2>History</h2>
          <ul>
            {checkIns.map((c) => (
              <li key={c.id}>
                <strong>{c.value}</strong>
                {c.note && <span> — {c.note}</span>}
                <time dateTime={c.createdAt}>
                  {" "}
                  ({new Date(c.createdAt).toLocaleDateString()})
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
