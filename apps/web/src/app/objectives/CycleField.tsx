import { CYCLES, DEFAULT_CYCLE } from "@template/shared";

/**
 * Labelled dropdown for selecting an objective's planning cycle.
 *
 * Presentational only — the option list comes from the shared `CYCLES`
 * constant (single source of truth), not from props or a fetch.
 */
export function CycleField() {
  return (
    <div>
      <label
        htmlFor="cycleId"
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        Cycle
      </label>
      <select
        id="cycleId"
        name="cycleId"
        defaultValue={DEFAULT_CYCLE}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {CYCLES.map((cycle) => (
          <option key={cycle} value={cycle}>
            {cycle}
          </option>
        ))}
      </select>
    </div>
  );
}
