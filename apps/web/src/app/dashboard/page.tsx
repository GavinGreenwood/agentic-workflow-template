import Link from "next/link";
import type { Objective, ProgressSummary } from "@template/shared";
import { getObjectives, getObjectiveProgress } from "../../lib/okr-api";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-600",
};

function progressColor(pct: number): string {
  if (pct >= 70) return "#10b981";
  if (pct >= 40) return "#6366f1";
  return "#f59e0b";
}

export default async function DashboardPage() {
  let objectives: Objective[] = [];
  try {
    objectives = await getObjectives();
  } catch {
    objectives = [];
  }

  const progressList: ProgressSummary[] = await Promise.all(
    objectives.map((obj) => getObjectiveProgress(obj.id).catch(() => null)),
  ).then((results) => results.filter((r): r is ProgressSummary => r !== null));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          href="/objectives"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Manage objectives →
        </Link>
      </div>

      {progressList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <p className="text-slate-500 mb-4">No objectives yet.</p>
          <Link
            href="/objectives"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create your first objective
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {progressList.map((summary) => (
            <Link
              key={summary.objectiveId}
              href={`/objectives/${summary.objectiveId}`}
              className="block bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 pr-2">
                  {summary.title}
                </h2>
                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[summary.status] ?? statusStyles["active"]}`}
                >
                  {summary.status}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Progress</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {summary.progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="rounded-full h-2 transition-all"
                    style={{
                      width: `${summary.progressPercent}%`,
                      backgroundColor: progressColor(summary.progressPercent),
                    }}
                  />
                </div>
              </div>
              {summary.keyResults.length > 0 && (
                <ul className="space-y-1 border-t border-slate-100 pt-3 mt-3">
                  {summary.keyResults.map((kr) => (
                    <li
                      key={kr.id}
                      className="flex items-center justify-between text-xs text-slate-500"
                    >
                      <span className="truncate pr-2">{kr.title}</span>
                      <span className="shrink-0 font-medium">
                        {kr.progressPercent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
