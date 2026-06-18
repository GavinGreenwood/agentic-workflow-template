import Link from "next/link";
import { revalidatePath } from "next/cache";
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
    revalidatePath(`/objectives/${id}`);
    redirect(`/objectives/${id}`);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/objectives/${id}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to objective
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Log check-in</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <form action={handleCheckIn} className="space-y-4">
          <div>
            <label
              htmlFor="value"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New value
            </label>
            <input
              id="value"
              name="value"
              type="number"
              required
              placeholder="0"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Note{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              placeholder="What's happening?"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            Save check-in
          </button>
        </form>
      </div>

      {checkIns.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            History
          </h2>
          <ul className="space-y-2">
            {checkIns.map((c) => (
              <li
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-start justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {c.value}
                  </span>
                  {c.note && (
                    <p className="text-sm text-slate-500 mt-0.5">{c.note}</p>
                  )}
                </div>
                <time
                  dateTime={c.createdAt}
                  className="text-xs text-slate-400 shrink-0 ml-4 mt-0.5"
                >
                  {new Date(c.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
