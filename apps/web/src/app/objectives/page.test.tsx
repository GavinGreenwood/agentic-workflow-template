import { render, screen } from "@testing-library/react";

jest.mock("../../lib/okr-api", () => ({
  getObjectives: jest.fn(),
  createObjective: jest.fn(),
}));

import type { Objective } from "@template/shared";
import ObjectivesPage from "./page";
import { getObjectives } from "../../lib/okr-api";

const mockGetObjectives = getObjectives as jest.MockedFunction<
  typeof getObjectives
>;

function objective(over: Partial<Objective> = {}): Objective {
  return {
    id: "o1",
    title: "Improve retention",
    description: "Keep customers happy",
    status: "active",
    ownerId: "demo-user",
    cycleId: "2026-Q2",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("ObjectivesPage", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the cycle dropdown in the new-objective form", async () => {
    mockGetObjectives.mockResolvedValue([]);
    render(await ObjectivesPage());
    const cycle = screen.getByLabelText("Cycle");
    expect(cycle.tagName).toBe("SELECT");
  });

  it("lists returned objectives", async () => {
    mockGetObjectives.mockResolvedValue([
      objective(),
      objective({ id: "o2", title: "Ship faster", description: undefined }),
    ]);
    render(await ObjectivesPage());
    expect(screen.getByText("Improve retention")).toBeInTheDocument();
    expect(screen.getByText("Ship faster")).toBeInTheDocument();
  });

  it("shows an empty state when the API call fails", async () => {
    mockGetObjectives.mockRejectedValue(new Error("down"));
    render(await ObjectivesPage());
    expect(screen.getByText(/No objectives yet/i)).toBeInTheDocument();
  });
});
