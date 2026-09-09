import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  afterEach(cleanup);

  it("links the CTA to registration when the visitor has no session", () => {
    render(<Navbar isAuthenticated={false} />);

    const cta = screen.getByRole("link", { name: "Request access" });
    expect(cta).toHaveAttribute("href", "/register");
  });

  it("links the CTA to the app once the visitor has a session", () => {
    render(<Navbar isAuthenticated={true} />);

    const cta = screen.getByRole("link", { name: "Go to app" });
    expect(cta).toHaveAttribute("href", "/app");
  });

  it("links the brand mark back to the homepage", () => {
    render(<Navbar isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: /Attack Surface Studio/ })).toHaveAttribute("href", "/");
  });
});
