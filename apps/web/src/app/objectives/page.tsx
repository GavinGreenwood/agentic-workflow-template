import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Objective } from "@template/shared";
import { getObjectives, createObjective } from "../../lib/okr-api";

export default async function ObjectivesPage() {
  let objectives: Objective[] = [];
  try {
    objectives = await getObjectives();
  } catch {
    objectives = [];
  }

  async function handleCreate(formData: FormData) {
    "use server";
    await createObjective({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      ownerId: "demo-user",
      cycleId: (formData.get("cycleId") as string) || "2025-Q1",
    });
    revalidatePath("/objectives");
    redirect("/objectives");
  }

  return (
    <main>
      <h1>Objectives</h1>

      <section>
        <h2>Create objective</h2>
        <form action={handleCreate}>
          <div>
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required />
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" />
          </div>
          <div>
            <label htmlFor="cycleId">Cycle</label>
            <input
              id="cycleId"
              name="cycleId"
              type="text"
              defaultValue="2025-Q1"
            />
          </div>
          <button type="submit">Add objective</button>
        </form>
      </section>

      <section>
        <h2>All objectives</h2>
        {objectives.length === 0 ? (
          <p>No objectives yet — create one above.</p>
        ) : (
          <ul>
            {objectives.map((obj) => (
              <li key={obj.id}>
                <Link href={`/objectives/${obj.id}`}>{obj.title}</Link>
                <span> — {obj.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
