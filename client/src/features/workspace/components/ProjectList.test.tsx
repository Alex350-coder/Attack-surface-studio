import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectList } from "./ProjectList";
import { apiRequestPaginated } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiRequestPaginated: vi.fn(),
  apiRequest: vi.fn(),
}));

function renderProjectList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectList />
    </QueryClientProvider>,
  );
}

describe("ProjectList", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state while projects are being fetched", () => {
    vi.mocked(apiRequestPaginated).mockReturnValue(new Promise(() => {}));
    renderProjectList();

    expect(screen.getByText("Loading projects…")).toBeInTheDocument();
  });

  it("shows the empty-state CTA when there are no projects", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [] });
    renderProjectList();

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create your first project" })).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.mocked(apiRequestPaginated).mockRejectedValue(new Error("Network down"));
    renderProjectList();

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
  });

  it("renders the project grid on success", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Acme Corp",
          slug: "acme-corp",
          scope: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    renderProjectList();

    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("acme-corp")).toBeInTheDocument();
  });
});
