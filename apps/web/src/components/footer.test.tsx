import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

jest.mock("../lib/api", () => ({
  fetchApiVersion: jest.fn(),
}));

import { fetchApiVersion } from "../lib/api";

const mockFetchApiVersion = fetchApiVersion as jest.MockedFunction<
  typeof fetchApiVersion
>;

describe("Footer", () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  it("renders the API and UI version labels", async () => {
    mockFetchApiVersion.mockResolvedValue("1.2.3");
    process.env.NEXT_PUBLIC_APP_VERSION = "9.9.9";

    render(await Footer());

    expect(screen.getByText(/API: v1\.2\.3/)).toBeInTheDocument();
    expect(screen.getByText(/UI: v9\.9\.9/)).toBeInTheDocument();
  });

  it("falls back to 0.0.0 for the UI version when unset", async () => {
    mockFetchApiVersion.mockResolvedValue("1.0.0");

    render(await Footer());

    expect(screen.getByText(/UI: v0\.0\.0/)).toBeInTheDocument();
  });
});
