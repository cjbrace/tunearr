import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import DiscoveryControls from "../DiscoveryControls";

describe("DiscoveryControls", () => {
  it("selects one sort mode and keeps the saved type filter in the same toolbar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();

    render(
      <DiscoveryControls
        filters={{ sort: "popular", excluded: [] }}
        onChange={onChange}
        onSave={onSave}
        changed
        saving={false}
        error={null}
      />
    );

    expect(
      screen.getByRole("button", { name: /Hide types/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save filters" })).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /Sort: Most listened/ })
    );
    await user.click(screen.getByRole("option", { name: "Newest" }));
    expect(onChange).toHaveBeenCalledWith({ sort: "newest", excluded: [] });

    await user.click(screen.getByRole("button", { name: "Save filters" }));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
