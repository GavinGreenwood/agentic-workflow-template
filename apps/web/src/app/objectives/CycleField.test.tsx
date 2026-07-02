import { render, screen } from "@testing-library/react";
import { CYCLES, DEFAULT_CYCLE } from "@template/shared";
import { CycleField } from "./CycleField";

describe("CycleField", () => {
  it("renders a labelled cycle select posting as cycleId", () => {
    render(<CycleField />);
    const select = screen.getByLabelText("Cycle");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAttribute("name", "cycleId");
  });

  it("renders an option for every cycle in the shared list", () => {
    render(<CycleField />);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(CYCLES.length);
    expect(options.map((o) => o.textContent)).toEqual([...CYCLES]);
  });

  it("defaults to DEFAULT_CYCLE", () => {
    render(<CycleField />);
    expect(screen.getByLabelText<HTMLSelectElement>("Cycle").value).toBe(
      DEFAULT_CYCLE,
    );
  });
});

describe("cycle constants", () => {
  it("DEFAULT_CYCLE is a member of CYCLES", () => {
    expect(CYCLES).toContain(DEFAULT_CYCLE);
  });
});
