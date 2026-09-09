import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CTAGroup } from "./CTAGroup";

describe("CTAGroup", () => {
  afterEach(cleanup);

  it("links the primary CTA to registration when the visitor has no session", () => {
    render(<CTAGroup isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: /Request access/ })).toHaveAttribute("href", "/register");
  });

  it("links the primary CTA to the app once the visitor has a session", () => {
    render(<CTAGroup isAuthenticated={true} />);

    expect(screen.getByRole("link", { name: /Go to app/ })).toHaveAttribute("href", "/app");
  });

  it("scrolls to the graph preview instead of navigating away", () => {
    render(<CTAGroup isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: "Explore the graph engine" })).toHaveAttribute(
      "href",
      "#graph-preview",
    );
  });
});
