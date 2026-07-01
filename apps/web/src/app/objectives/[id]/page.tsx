import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getObjectiveProgress,
  getKeyResultsByObjective,
  createKeyResult,
} from "../../../lib/okr-api";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-600",
};

function getStatusClass(status: string): string {
  const cls = statusStyles[status];
  return cls ?? "bg-slate-100 text-slate-600";
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ObjectivePage({ params }: Props) {
  const { id } = await params;

  let progress;
  try {
    progress = await getObjectiveProgress(id);
  } catch {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-slate-500">Objective not found.</p>
        <Link
          href="/objectives"
          className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Back to objectives
        </Link>
      </main>
    );
  }

  const keyResults = await getKeyResultsByObjective(id).catch(() => []);

  async function handleAddKeyResult(formData: FormData) {
    "use server";
    await createKeyResult({
      objectiveId: id,
      title: formData.get("title") as string,
      unit: formData.get("unit") as
        "number" | "percent" | "currency" | "boolean",
      startValue: Number(formData.get("startValue")),
      targetValue: Number(formData.get("targetValue")),
    });
    revalidatePath(`/objectives/${id}`);
    redirect(`/objectives/${id}`);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/objectives"
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
        Back to objectives
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900">{progress.title}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(progress.status)}`}
          >
            {progress.status}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Overall progress</span>
            <span className="text-sm font-semibold text-slate-900">
              {progress.progressPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-500 rounded-full h-2 transition-all"
              style={{ width: `${String(progress.progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Key results */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Key results
          </h2>
          {keyResults.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
              <p className="text-sm text-slate-500">
                No key results yet — add one to track progress.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {keyResults.map((kr) => {
                const pct =
                  progress.keyResults.find((k) => k.id === kr.id)
                    ?.progressPercent ?? 0;
                return (
                  <li
                    key={kr.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">
                        {kr.title}
                      </span>
                      <Link
                        href={`/objectives/${id}/check-in/${kr.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors shrink-0 ml-2"
                      >
                        Log check-in →
                      </Link>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500">
                        {kr.currentValue} / {kr.targetValue} {kr.unit}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 rounded-full h-1.5 transition-all"
                        style={{ width: `${String(pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Add key result form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Add key result
            </h2>
            <form action={handleAddKeyResult} className="space-y-4">
              <div>
                <label
                  htmlFor="kr-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="kr-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. NPS score"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="unit"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Unit
                </label>
                <select
                  id="unit"
                  name="unit"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="number">Number</option>
                  <option value="percent">Percent</option>
                  <option value="currency">Currency</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="startValue"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Start
                  </label>
                  <input
                    id="startValue"
                    name="startValue"
                    type="number"
                    defaultValue={0}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="targetValue"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Target
                  </label>
                  <input
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    required
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Add key result
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
