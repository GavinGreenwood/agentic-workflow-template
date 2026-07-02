import { fetchApiVersion } from "./api";

function mockRes(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function setFetch(): jest.Mock {
  const fetchMock = jest.fn();
  global.fetch = fetchMock;
  return fetchMock;
}

describe("fetchApiVersion", () => {
  it("returns the version from a successful response", async () => {
    setFetch().mockResolvedValue(mockRes({ version: "2.0.0" }));
    await expect(fetchApiVersion()).resolves.toBe("2.0.0");
  });

  it("returns 'unavailable' when the payload has no version", async () => {
    setFetch().mockResolvedValue(mockRes({}));
    await expect(fetchApiVersion()).resolves.toBe("unavailable");
  });

  it("returns 'unavailable' on a non-ok response", async () => {
    setFetch().mockResolvedValue(mockRes("nope", 500));
    await expect(fetchApiVersion()).resolves.toBe("unavailable");
  });

  it("returns 'unavailable' when fetch rejects", async () => {
    setFetch().mockRejectedValue(new Error("network down"));
    await expect(fetchApiVersion()).resolves.toBe("unavailable");
  });
});
