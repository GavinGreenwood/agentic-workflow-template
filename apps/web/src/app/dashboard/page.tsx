import Link from "next/link";
import type { Objective, ProgressSummary } from "@template/shared";
import { getObjectives, getObjectiveProgress } from "../../lib/okr-api";

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
    <main>
      <h1>Dashboard</h1>
      <Link href="/objectives">Manage objectives</Link>

      {progressList.length === 0 ? (
        <p>
          No objectives yet. <Link href="/objectives">Create one.</Link>
        </p>
      ) : (
        <ul>
          {progressList.map((summary) => {
            if (!summary) return null;
            return (
              <li key={summary.objectiveId}>
                <Link href={`/objectives/${summary.objectiveId}`}>
                  <strong>{summary.title}</strong>
                </Link>
                <span> — {summary.status}</span>
                <div>
                  <progress value={summary.progressPercent} max={100} />
                  <span> {summary.progressPercent}%</span>
                </div>
                {summary.keyResults.length > 0 && (
                  <ul>
                    {summary.keyResults.map((kr) => (
                      <li key={kr.id}>
                        {kr.title}: {kr.currentValue}/{kr.targetValue} {kr.unit}{" "}
                        ({kr.progressPercent}%)
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
