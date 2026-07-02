import { render, screen } from "@testing-library/react";
import { Navbar } from "./navbar";

describe("Navbar", () => {
  it("renders brand and section links", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "OKR Tracker" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Objectives" })).toHaveAttribute(
      "href",
      "/objectives",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
