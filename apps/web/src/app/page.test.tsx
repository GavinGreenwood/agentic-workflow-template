import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("renders the title and both navigation cards", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "OKR Tracker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create and manage your objectives/i }),
    ).toHaveAttribute("href", "/objectives");
    expect(
      screen.getByRole("link", {
        name: /view progress across all objectives/i,
      }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
