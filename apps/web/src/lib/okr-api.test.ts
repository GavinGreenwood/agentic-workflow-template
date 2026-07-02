import {
  getObjectives,
  getObjective,
  getObjectiveProgress,
  getKeyResultsByObjective,
  getCheckInsByKeyResult,
  createObjective,
  createKeyResult,
  createCheckIn,
} from "./okr-api";

let fetchMock: jest.Mock;
const originalFetch = global.fetch;

function mockJson(body: unknown, status = 200): void {
  const res = {
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
  fetchMock.mockResolvedValue(res);
}

describe("okr-api", () => {
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("getObjectives returns the parsed list", async () => {
    mockJson([{ id: "o1" }]);
    await expect(getObjectives()).resolves.toEqual([{ id: "o1" }]);
  });

  it("getObjective fetches a single objective by id", async () => {
    mockJson({ id: "o1" });
    await expect(getObjective("o1")).resolves.toEqual({ id: "o1" });
  });

  it("getObjectiveProgress fetches the progress summary", async () => {
    mockJson({ objectiveId: "o1", progressPercent: 50 });
    await expect(getObjectiveProgress("o1")).resolves.toEqual({
      objectiveId: "o1",
      progressPercent: 50,
    });
  });

  it("getKeyResultsByObjective fetches key results", async () => {
    mockJson([{ id: "kr1" }]);
    await expect(getKeyResultsByObjective("o1")).resolves.toEqual([
      { id: "kr1" },
    ]);
  });

  it("getCheckInsByKeyResult fetches check-ins", async () => {
    mockJson([{ id: "c1" }]);
    await expect(getCheckInsByKeyResult("kr1")).resolves.toEqual([
      { id: "c1" },
    ]);
  });

  it("createObjective POSTs and returns the created objective", async () => {
    mockJson({ id: "o2" }, 201);
    const dto = {
      title: "New",
      ownerId: "u1",
      cycleId: "2026-Q2",
    };
    await expect(createObjective(dto)).resolves.toEqual({ id: "o2" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/objectives"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("createKeyResult POSTs a key result", async () => {
    mockJson({ id: "kr2" }, 201);
    await expect(
      createKeyResult({
        objectiveId: "o1",
        title: "KR",
        unit: "number",
        startValue: 0,
        targetValue: 10,
      }),
    ).resolves.toEqual({ id: "kr2" });
  });

  it("createCheckIn POSTs a check-in", async () => {
    mockJson({ id: "c2" }, 201);
    await expect(
      createCheckIn({ keyResultId: "kr1", value: 5 }),
    ).resolves.toEqual({ id: "c2" });
  });

  it("throws when the API responds with a non-ok status", async () => {
    mockJson({ error: "boom" }, 500);
    await expect(getObjectives()).rejects.toThrow("/objectives responded 500");
  });
});
