import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import ApiIntegrationPage from "@/pages/services/ApiIntegrationPage";
import ApiIntegrationUseCasePage from "@/pages/services/ApiIntegrationUseCasePage";
import * as apiIntegration from "@/api/apiIntegration";

vi.mock("@/api/apiIntegration", async () => {
  const actual = await vi.importActual<typeof import("@/api/apiIntegration")>("@/api/apiIntegration");
  return {
    ...actual,
    getFlows: vi.fn(async () => [{ id: "flow-demo", name: "Shopify -> ERP Order Sync", is_enabled: true }]),
    getFlowRuns: vi.fn(async () => []),
    getDeadLetters: vi.fn(async () => []),
    replayDeadLetter: vi.fn(async () => ({ run_id: "run-replay", status: "SUCCEEDED" })),
    sendWebhook: vi.fn(async () => ({ run_id: "run-send", status: "SUCCEEDED", flow_id: "flow-demo" })),
  };
});

function RouteSlugEcho() {
  const { useCaseSlug } = useParams();
  return <p data-testid="route-slug">{useCaseSlug}</p>;
}

describe("API Integration UI interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens start modal and navigates to a use-case route", async () => {
    render(
      <MemoryRouter initialEntries={["/services/api-integration"]}>
        <Routes>
          <Route path="/services/api-integration" element={<ApiIntegrationPage />} />
          <Route path="/services/api-integration/:useCaseSlug" element={<RouteSlugEcho />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start API Integration" }));
    expect(screen.getByText("Choose Integration Use Case")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByTestId("route-slug")).toHaveTextContent("ecommerce-order-sync");
  });

  it("renders ecommerce workflow panels and posts webhook payload", async () => {
    const sendWebhookMock = vi.mocked(apiIntegration.sendWebhook);

    render(
      <MemoryRouter initialEntries={["/services/api-integration/ecommerce-order-sync"]}>
        <Routes>
          <Route path="/services/api-integration/:useCaseSlug" element={<ApiIntegrationUseCasePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Webhook Simulator" })).toBeInTheDocument();
    expect(screen.getByText("Run History")).toBeInTheDocument();
    expect(screen.getByText("Dead Letter Queue")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send Webhook" }));

    await waitFor(() => {
      expect(sendWebhookMock).toHaveBeenCalledTimes(1);
    });
  });

});
