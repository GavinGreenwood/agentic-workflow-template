import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getObjectiveProgress,
  getKeyResultsByObjective,
  createKeyResult,
} from "../../../lib/okr-api";

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
      <main>
        <p>Objective not found.</p>
        <Link href="/objectives">Back</Link>
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
        | "number"
        | "percent"
        | "currency"
        | "boolean",
      startValue: Number(formData.get("startValue")),
      targetValue: Number(formData.get("targetValue")),
    });
    redirect(`/objectives/${id}`);
  }

  return (
    <main>
      <Link href="/objectives">← Back</Link>
      <h1>{progress.title}</h1>
      <p>Status: {progress.status}</p>
      <p>Overall progress: {progress.progressPercent}%</p>
      <progress value={progress.progressPercent} max={100} />

      <section>
        <h2>Key results</h2>
        {keyResults.length === 0 ? (
          <p>No key results yet.</p>
        ) : (
          <ul>
            {keyResults.map((kr) => {
              const pct =
                progress.keyResults.find((k) => k.id === kr.id)
                  ?.progressPercent ?? 0;
              return (
                <li key={kr.id}>
                  <strong>{kr.title}</strong>
                  <span>
                    {" "}
                    ({kr.currentValue} / {kr.targetValue} {kr.unit})
                  </span>
                  <progress value={pct} max={100} />
                  <Link href={`/objectives/${id}/check-in/${kr.id}`}>
                    Log check-in
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Add key result</h2>
        <form action={handleAddKeyResult}>
          <div>
            <label htmlFor="kr-title">Title</label>
            <input id="kr-title" name="title" type="text" required />
          </div>
          <div>
            <label htmlFor="unit">Unit</label>
            <select id="unit" name="unit">
              <option value="number">Number</option>
              <option value="percent">Percent</option>
              <option value="currency">Currency</option>
              <option value="boolean">Boolean</option>
            </select>
          </div>
          <div>
            <label htmlFor="startValue">Start value</label>
            <input
              id="startValue"
              name="startValue"
              type="number"
              defaultValue={0}
            />
          </div>
          <div>
            <label htmlFor="targetValue">Target value</label>
            <input id="targetValue" name="targetValue" type="number" required />
          </div>
          <button type="submit">Add key result</button>
        </form>
      </section>
    </main>
  );
}
