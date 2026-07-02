import { render, screen } from "@testing-library/react";

jest.mock("../../../../../lib/okr-api", () => ({
  getCheckInsByKeyResult: jest.fn(),
  createCheckIn: jest.fn(),
}));

import CheckInPage from "./page";
import { getCheckInsByKeyResult } from "../../../../../lib/okr-api";

const mockGetCheckIns = getCheckInsByKeyResult as jest.MockedFunction<
  typeof getCheckInsByKeyResult
>;

function props(id = "o1", keyResultId = "kr1") {
  return { params: Promise.resolve({ id, keyResultId }) };
}

describe("CheckInPage", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the form and a back link without history", async () => {
    mockGetCheckIns.mockResolvedValue([]);
    render(await CheckInPage(props()));
    expect(
      screen.getByRole("heading", { name: "Log check-in" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New value")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to objective/i }),
    ).toHaveAttribute("href", "/objectives/o1");
    expect(screen.queryByText("History")).not.toBeInTheDocument();
  });

  it("renders check-in history when present", async () => {
    mockGetCheckIns.mockResolvedValue([
      {
        id: "c1",
        keyResultId: "kr1",
        value: 42,
        note: "Good progress",
        createdAt: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "c2",
        keyResultId: "kr1",
        value: 50,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ]);
    render(await CheckInPage(props()));
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Good progress")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });
});
