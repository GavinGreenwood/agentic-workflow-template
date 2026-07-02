import { render, screen } from "@testing-library/react";
import type { KeyResult, ProgressSummary } from "@template/shared";

jest.mock("../../../lib/okr-api", () => ({
  getObjectiveProgress: jest.fn(),
  getKeyResultsByObjective: jest.fn(),
  createKeyResult: jest.fn(),
}));

import ObjectivePage from "./page";
import {
  getObjectiveProgress,
  getKeyResultsByObjective,
} from "../../../lib/okr-api";

const mockGetProgress = getObjectiveProgress as jest.MockedFunction<
  typeof getObjectiveProgress
>;
const mockGetKeyResults = getKeyResultsByObjective as jest.MockedFunction<
  typeof getKeyResultsByObjective
>;

function props(id = "o1") {
  return { params: Promise.resolve({ id }) };
}

function progress(over: Partial<ProgressSummary> = {}): ProgressSummary {
  return {
    objectiveId: "o1",
    title: "Improve retention",
    status: "active",
    progressPercent: 42,
    keyResults: [],
    ...over,
  };
}

function keyResult(over: Partial<KeyResult> = {}): KeyResult {
  return {
    id: "kr1",
    objectiveId: "o1",
    title: "NPS",
    unit: "number",
    startValue: 0,
    targetValue: 50,
    currentValue: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("ObjectivePage", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders a not-found message when the objective is missing", async () => {
    mockGetProgress.mockRejectedValue(new Error("404"));
    render(await ObjectivePage(props()));
    expect(screen.getByText(/Objective not found/i)).toBeInTheDocument();
  });

  it("renders the header, progress and empty key-results state", async () => {
    mockGetProgress.mockResolvedValue(progress());
    mockGetKeyResults.mockResolvedValue([]);
    render(await ObjectivePage(props()));
    expect(
      screen.getByRole("heading", { name: "Improve retention" }),
    ).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText(/No key results yet/i)).toBeInTheDocument();
  });

  it("lists key results with their progress and a check-in link", async () => {
    mockGetProgress.mockResolvedValue(
      progress({
        keyResults: [
          {
            id: "kr1",
            title: "NPS",
            progressPercent: 60,
            currentValue: 30,
            targetValue: 50,
            unit: "number",
          },
        ],
      }),
    );
    mockGetKeyResults.mockResolvedValue([keyResult()]);
    render(await ObjectivePage(props()));
    expect(screen.getByText("NPS")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Log check-in/i })).toHaveAttribute(
      "href",
      "/objectives/o1/check-in/kr1",
    );
  });
});
