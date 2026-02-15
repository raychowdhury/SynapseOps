import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  type DeadLetter,
  type FlowSummary,
  type Run,
  type WebhookResponse,
  getDeadLetters,
  getFlows,
  getFlowRuns,
  replayDeadLetter,
  sendWebhook as sendWebhookRequest,
} from "@/api/apiIntegration";
import WebhookSimulator from "@/components/api-integration/WebhookSimulator";
import RunHistoryTable from "@/components/api-integration/RunHistoryTable";
import DeadLetterPanel from "@/components/api-integration/DeadLetterPanel";

type UseCaseOption = {
  rank: number;
  name: string;
  slug: string;
  demand: string;
  complexity: string;
  headline: string;
  description: string;
};

const useCaseOptions: UseCaseOption[] = [
  {
    rank: 1,
    name: "E-commerce order sync",
    slug: "ecommerce-order-sync",
    demand: "Extremely High",
    complexity: "Medium–High",
    headline: "E-commerce Order Sync MVP",
    description:
      "Receive Shopify order webhooks, map payloads to ERP schema, run resilient delivery with retries, and operate with run history plus dead-letter replay.",
  },
  {
    rank: 2,
    name: "Payment gateway integration",
    slug: "payment-gateway",
    demand: "Extremely High",
    complexity: "High",
    headline: "Payment Gateway Integration",
    description: "MVP implementation is planned next for this use case.",
  },
  {
    rank: 3,
    name: "CRM automation",
    slug: "crm-automation",
    demand: "High",
    complexity: "Medium",
    headline: "CRM Automation",
    description: "MVP implementation is planned next for this use case.",
  },
  {
    rank: 4,
    name: "SaaS notifications/workflows",
    slug: "saas-workflows",
    demand: "Very High",
    complexity: "Low–Medium",
    headline: "SaaS Notifications/Workflows",
    description: "MVP implementation is planned next for this use case.",
  },
  {
    rank: 5,
    name: "Data aggregation",
    slug: "data-aggregation",
    demand: "High",
    complexity: "High",
    headline: "Data Aggregation",
    description: "MVP implementation is planned next for this use case.",
  },
];

const ecommerceConnectSteps = [
  {
    title: "1. Configure Shopify Webhook",
    detail:
      "In Shopify Admin, create an orders/create webhook and point it to your API Integration ingress endpoint for this environment.",
    value: "POST /api/v1/api-integration/webhooks/shopify/orders-create",
  },
  {
    title: "2. Confirm Flow + ERP Auth",
    detail:
      "Make sure flow 'Shopify -> ERP Order Sync' is enabled and ERP credentials are valid (API key, bearer token, or OAuth2 client credentials).",
    value: "GET /api/v1/api-integration/flows",
  },
  {
    title: "3. Send a Test Order",
    detail: "Use the simulator below to post a sample order payload and trigger a full map + delivery execution.",
    value: "Webhook Simulator",
  },
  {
    title: "4. Verify + Recover",
    detail:
      "Review run status and latency in Run History. If a delivery fails, replay it from Dead Letter Queue after fixing destination issues.",
    value: "Run History + DLQ Replay",
  },
];

function demandBadgeClass(demand: string): string {
  const lower = demand.toLowerCase();
  if (lower.includes("extremely")) return "bg-emerald-500/15 text-emerald-400 border-emerald-400/40";
  if (lower.includes("very")) return "bg-sky-500/15 text-sky-400 border-sky-400/40";
  return "bg-zinc-500/15 text-zinc-300 border-zinc-400/40";
}

function complexityBadgeClass(complexity: string): string {
  const lower = complexity.toLowerCase();
  if (lower.includes("high")) return "bg-rose-500/15 text-rose-400 border-rose-400/40";
  if (lower.includes("medium")) return "bg-amber-500/15 text-amber-300 border-amber-400/40";
  return "bg-emerald-500/15 text-emerald-400 border-emerald-400/40";
}

export default function ApiIntegrationUseCasePage() {
  const { useCaseSlug } = useParams<{ useCaseSlug: string }>();
  const navigate = useNavigate();

  const normalizedSlug = useMemo(() => {
    if (useCaseSlug === "e-commerce-order-sync") return "ecommerce-order-sync";
    return useCaseSlug;
  }, [useCaseSlug]);

  const selectedUseCase = normalizedSlug
    ? useCaseOptions.find((item) => item.slug === normalizedSlug)
    : null;

  const [webhookPayload, setWebhookPayload] = useState(
    JSON.stringify(
      {
        id: 1001,
        total_price: "149.99",
        currency: "USD",
        shipping_address: { city: "Austin" },
        line_items: [
          { title: "Wireless Mouse", quantity: 1, price: "49.99" },
          { title: "Mechanical Keyboard", quantity: 1, price: "100.00" },
        ],
      },
      null,
      2,
    ),
  );
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [deadLettersLoading, setDeadLettersLoading] = useState(false);
  const [deadLettersError, setDeadLettersError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const isEcommerceOrderSync = selectedUseCase?.slug === "ecommerce-order-sync";

  const pickFlowId = useCallback((flows: FlowSummary[]): string | null => {
    const preferred = flows.find((item) => item.name === "Shopify -> ERP Order Sync");
    if (preferred) return preferred.id;

    const enabled = flows.find((item) => item.is_enabled);
    if (enabled) return enabled.id;

    return flows[0]?.id ?? null;
  }, []);

  const refreshRuns = useCallback(async () => {
    if (!isEcommerceOrderSync || !flowId) return;

    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await getFlowRuns(flowId);
      setRuns(data);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : "Failed to fetch run history");
    } finally {
      setRunsLoading(false);
    }
  }, [flowId, isEcommerceOrderSync]);

  const refreshDeadLetters = useCallback(async () => {
    if (!isEcommerceOrderSync) return;

    setDeadLettersLoading(true);
    setDeadLettersError(null);
    try {
      const data = await getDeadLetters();
      setDeadLetters(data);
    } catch (error) {
      setDeadLettersError(error instanceof Error ? error.message : "Failed to fetch dead letters");
    } finally {
      setDeadLettersLoading(false);
    }
  }, [isEcommerceOrderSync]);

  const handleSendWebhook = useCallback(async () => {
    setWebhookLoading(true);
    setWebhookError(null);
    try {
      const parsed = JSON.parse(webhookPayload) as Record<string, unknown>;
      const response = await sendWebhookRequest(parsed);
      setWebhookResponse(response);
      if (response.flow_id) {
        setFlowId(response.flow_id);
      }
      await Promise.all([refreshRuns(), refreshDeadLetters()]);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setWebhookError("Webhook payload must be valid JSON");
      } else {
        setWebhookError(error instanceof Error ? error.message : "Failed to send webhook");
      }
    } finally {
      setWebhookLoading(false);
    }
  }, [refreshDeadLetters, refreshRuns, webhookPayload]);

  const handleReplayDeadLetter = useCallback(
    async (id: string) => {
      setReplayingId(id);
      setDeadLettersError(null);
      try {
        await replayDeadLetter(id);
        await Promise.all([refreshRuns(), refreshDeadLetters()]);
      } catch (error) {
        setDeadLettersError(error instanceof Error ? error.message : "Failed to replay dead letter");
      } finally {
        setReplayingId(null);
      }
    },
    [refreshDeadLetters, refreshRuns],
  );

  useEffect(() => {
    if (!isEcommerceOrderSync) return;

    const loadFlow = async () => {
      setFlowError(null);
      try {
        const flows = await getFlows();
        const resolvedFlowId = pickFlowId(flows);
        if (!resolvedFlowId) {
          setFlowError("No API integration flow is configured. Start backend with ENV=local to seed the demo flow.");
          return;
        }
        setFlowId(resolvedFlowId);
      } catch (error) {
        setFlowError(error instanceof Error ? error.message : "Failed to load flow configuration");
      }
    };

    void loadFlow();
  }, [isEcommerceOrderSync, pickFlowId]);

  useEffect(() => {
    if (!isEcommerceOrderSync || !flowId) return;
    void Promise.all([refreshRuns(), refreshDeadLetters()]);
  }, [flowId, isEcommerceOrderSync, refreshDeadLetters, refreshRuns]);

  if (useCaseSlug === "e-commerce-order-sync") {
    return <Navigate to="/services/api-integration/ecommerce-order-sync" replace />;
  }

  if (!selectedUseCase) {
    return <Navigate to="/services/api-integration" replace />;
  }

  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 relative z-[1]">
        <div className="container max-w-[900px] space-y-8">
          <div>
            <Link
              to="/services/api-integration"
              className="text-sm text-text-2 hover:text-primary-light transition-colors mb-6 inline-block"
            >
              &larr; API Integration
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="outline" className={demandBadgeClass(selectedUseCase.demand)}>
                {selectedUseCase.demand}
              </Badge>
              <Badge variant="outline" className={complexityBadgeClass(selectedUseCase.complexity)}>
                {selectedUseCase.complexity}
              </Badge>
            </div>
            <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-foreground">
              #{selectedUseCase.rank} {selectedUseCase.headline}
            </h1>
            <p className="text-base text-text-2 leading-relaxed font-light mt-3 max-w-[760px]">
              {selectedUseCase.description}
            </p>
          </div>

          {isEcommerceOrderSync ? (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>How To Connect Shopify To ERP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-2">
                    Complete these steps before go-live, then use the simulator to validate the end-to-end integration path.
                  </p>

                  <div className="rounded-xl border border-primary/30 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary-light mb-3">Connection Infographic</p>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-stretch">
                      <div
                        className="rounded-lg border border-border bg-card/80 p-3 opacity-0 animate-[slideIn_520ms_ease-out_forwards]"
                        style={{ animationDelay: "80ms" }}
                      >
                        <p className="text-xs text-text-2 mb-2">Source</p>
                        <p className="text-sm font-semibold text-foreground">Shopify Orders Webhook</p>
                        <p className="mt-2 text-xs font-mono text-primary-light">orders/create</p>
                      </div>

                      <div
                        className="hidden md:flex items-center justify-center opacity-0 animate-[fadeInUp_520ms_ease-out_forwards]"
                        style={{ animationDelay: "180ms" }}
                      >
                        <div className="relative h-1 w-14 overflow-hidden rounded-full bg-primary/20">
                          <span className="flow-pulse bg-primary-light" />
                        </div>
                      </div>

                      <div
                        className="rounded-lg border border-primary/35 bg-primary/5 p-3 opacity-0 animate-[fadeInUp_520ms_ease-out_forwards]"
                        style={{ animationDelay: "280ms" }}
                      >
                        <p className="text-xs text-primary-light mb-2">SynapseOps API Integration</p>
                        <div className="space-y-1.5 text-xs text-foreground">
                          <p>Webhook ingest + request ID</p>
                          <p>Payload mapping (Shopify -&gt; ERP schema)</p>
                          <p>Auth + delivery (retry/backoff/circuit)</p>
                          <p>Run history + dead-letter safety</p>
                        </div>
                      </div>

                      <div
                        className="hidden md:flex items-center justify-center opacity-0 animate-[fadeInUp_520ms_ease-out_forwards]"
                        style={{ animationDelay: "380ms" }}
                      >
                        <div className="relative h-1 w-14 overflow-hidden rounded-full bg-primary/20">
                          <span className="flow-pulse bg-primary-light" />
                        </div>
                      </div>

                      <div
                        className="rounded-lg border border-border bg-card/80 p-3 opacity-0 animate-[fadeInUp_520ms_ease-out_forwards]"
                        style={{ animationDelay: "480ms" }}
                      >
                        <p className="text-xs text-text-2 mb-2">Destination</p>
                        <p className="text-sm font-semibold text-foreground">ERP REST API (Demo Receiver)</p>
                        <p className="mt-2 text-xs font-mono text-primary-light">POST /api/v1/api-integration/mock/erp/orders</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {ecommerceConnectSteps.map((step, index) => (
                      <div
                        key={step.title}
                        className="rounded-lg border border-border bg-background/40 p-3 opacity-0 animate-[fadeInUp_520ms_ease-out_forwards]"
                        style={{ animationDelay: `${620 + index * 90}ms` }}
                      >
                        <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                        <p className="text-xs text-text-2 leading-relaxed">{step.detail}</p>
                        <p className="mt-2 text-xs font-mono text-primary-light">{step.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {flowError ? (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <p className="text-sm text-rose-400">{flowError}</p>
                  </CardContent>
                </Card>
              ) : null}
              <WebhookSimulator
                payload={webhookPayload}
                onPayloadChange={setWebhookPayload}
                onSend={handleSendWebhook}
                loading={webhookLoading}
                response={webhookResponse}
                error={webhookError}
              />
              <Accordion type="multiple" className="rounded-xl border border-border bg-card/40 px-4">
                <AccordionItem value="run-history" className="border-border">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">Run History</AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <RunHistoryTable runs={runs} loading={runsLoading} error={runsError} onRefresh={refreshRuns} />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dead-letter-queue" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Dead Letter Queue
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <DeadLetterPanel
                      items={deadLetters}
                      loading={deadLettersLoading}
                      error={deadLettersError}
                      replayingId={replayingId}
                      onRefresh={refreshDeadLetters}
                      onReplay={handleReplayDeadLetter}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-2">
                  This use case is listed in the integration roadmap and will be enabled after E-commerce Order Sync.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="border-t border-border pt-8">
            <p className="text-sm text-text-2 mb-3">Switch use case</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="px-8">
                  Change Use Case
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={10} className="w-[min(92vw,700px)] p-2">
                <DropdownMenuLabel>Choose Integration Use Case</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {useCaseOptions.map((useCase) => (
                  <DropdownMenuItem
                    key={useCase.slug}
                    className="p-3"
                    onSelect={() => navigate(`/services/api-integration/${useCase.slug}`)}
                    onClick={() => navigate(`/services/api-integration/${useCase.slug}`)}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">
                          #{useCase.rank} {useCase.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className={demandBadgeClass(useCase.demand)}>
                          {useCase.demand}
                        </Badge>
                        <Badge variant="outline" className={complexityBadgeClass(useCase.complexity)}>
                          {useCase.complexity}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
