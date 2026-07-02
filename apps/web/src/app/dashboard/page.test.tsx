import { render, screen } from "@testing-library/react";
import type { Objective, ProgressSummary } from "@template/shared";

jest.mock("../../lib/okr-api", () => ({
  getObjectives: jest.fn(),
  getObjectiveProgress: jest.fn(),
}));

import DashboardPage from "./page";
import { getObjectives, getObjectiveProgress } from "../../lib/okr-api";

const mockGetObjectives = getObjectives as jest.MockedFunction<
  typeof getObjectives
>;
const mockGetProgress = getObjectiveProgress as jest.MockedFunction<
  typeof getObjectiveProgress
>;

function objective(id: string): Objective {
  return {
    id,
    title: id,
    status: "active",
    ownerId: "demo-user",
    cycleId: "2026-Q2",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function summary(over: Partial<ProgressSummary> = {}): ProgressSummary {
  return {
    objectiveId: "o1",
    title: "Improve retention",
    status: "active",
    progressPercent: 80,
    keyResults: [
      {
        id: "kr1",
        title: "NPS",
        progressPercent: 90,
        currentValue: 45,
        targetValue: 50,
        unit: "number",
      },
    ],
    ...over,
  };
}

describe("DashboardPage", () => {
  afterEach(() => jest.clearAllMocks());

  it("shows the empty state when there are no objectives", async () => {
    mockGetObjectives.mockResolvedValue([]);
    render(await DashboardPage());
    expect(screen.getByText(/No objectives yet/i)).toBeInTheDocument();
  });

  it("renders a card per objective with progress and key results", async () => {
    mockGetObjectives.mockResolvedValue([objective("o1"), objective("o2")]);
    mockGetProgress.mockImplementation((id: string) =>
      Promise.resolve(
        summary({
          objectiveId: id,
          title: id === "o1" ? "Improve retention" : "Ship faster",
          progressPercent: id === "o1" ? 80 : 30,
          status: id === "o1" ? "active" : "archived",
        }),
      ),
    );
    render(await DashboardPage());
    expect(screen.getByText("Improve retention")).toBeInTheDocument();
    expect(screen.getByText("Ship faster")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("skips objectives whose progress lookup fails, and empties on list failure", async () => {
    mockGetObjectives.mockResolvedValue([objective("o1")]);
    mockGetProgress.mockRejectedValue(new Error("no progress"));
    render(await DashboardPage());
    expect(screen.getByText(/No objectives yet/i)).toBeInTheDocument();
  });
});
