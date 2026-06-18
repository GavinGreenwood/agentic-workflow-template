import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Objective } from "@template/shared";
import { getObjectives, createObjective } from "../../lib/okr-api";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-600",
};

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
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Objectives</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              New objective
            </h2>
            <form action={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Improve customer retention"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Description{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="What does success look like?"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label
                  htmlFor="cycleId"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Cycle
                </label>
                <input
                  id="cycleId"
                  name="cycleId"
                  type="text"
                  defaultValue="2025-Q1"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Add objective
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            All objectives
          </h2>
          {objectives.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <p className="text-sm text-slate-500">
                No objectives yet — create one to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {objectives.map((obj) => (
                <li key={obj.id}>
                  <Link
                    href={`/objectives/${obj.id}`}
                    className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {obj.title}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[obj.status] ?? statusStyles["active"]}`}
                      >
                        {obj.status}
                      </span>
                    </div>
                    {obj.description && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                        {obj.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
