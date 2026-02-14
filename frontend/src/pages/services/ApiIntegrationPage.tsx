import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";
import {
  type DeadLetter,
  type Run,
  type WebhookResponse,
  getDeadLetters,
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
};

type UseCaseDetail = {
  headline: string;
  description: string;
  scenarios: { scenario: string; outcome: string }[];
};

const useCaseOptions: UseCaseOption[] = [
  {
    rank: 1,
    name: "E-commerce order sync",
    slug: "ecommerce-order-sync",
    demand: "Extremely High",
    complexity: "Medium–High",
  },
  {
    rank: 2,
    name: "Payment gateway integration",
    slug: "payment-gateway",
    demand: "Extremely High",
    complexity: "High",
  },
  {
    rank: 3,
    name: "CRM automation",
    slug: "crm-automation",
    demand: "High",
    complexity: "Medium",
  },
  {
    rank: 4,
    name: "SaaS notifications/workflows",
    slug: "saas-workflows",
    demand: "Very High",
    complexity: "Low–Medium",
  },
  {
    rank: 5,
    name: "Data aggregation",
    slug: "data-aggregation",
    demand: "High",
    complexity: "High",
  },
];

const useCaseDetails: Record<string, UseCaseDetail> = {
  "ecommerce-order-sync": {
    headline: "E-commerce order sync, end to end.",
    description:
      "Capture Shopify order events, transform payloads into ERP-compatible schema, and deliver through resilient outbound API calls with retry, DLQ, and replay controls.",
    scenarios: [
      {
        scenario: "Shopify to ERP order posting",
        outcome:
          "Incoming order webhooks are mapped and posted to ERP order APIs with deterministic transforms and run-level status visibility.",
      },
      {
        scenario: "Failure-safe order delivery",
        outcome:
          "Transient API failures retry automatically; exhausted events move to DLQ for operator replay without data loss.",
      },
      {
        scenario: "Ops-ready observability",
        outcome:
          "Each flow run stores latency, attempts, status, and last error so support teams can triage incidents quickly.",
      },
    ],
  },
  "payment-gateway": {
    headline: "Payment gateway integration with reliability controls.",
    description:
      "Coordinate payment events across upstream systems with strong auth, idempotent mapping, and operational safeguards for failure and replay.",
    scenarios: [
      {
        scenario: "Gateway event routing",
        outcome: "Route authorization and settlement events into finance systems with schema-safe transformations.",
      },
      {
        scenario: "Retry and breaker protection",
        outcome: "Protect downstream APIs with exponential backoff and circuit-breaker logic during incident windows.",
      },
      {
        scenario: "Controlled replay workflows",
        outcome: "Replay failed payment messages from DLQ with traceable run history and audit confidence.",
      },
    ],
  },
  "crm-automation": {
    headline: "CRM automation with deterministic data movement.",
    description:
      "Move lead, account, and contact events across systems using stable mapping definitions and robust API execution policies.",
    scenarios: [
      {
        scenario: "Lead lifecycle sync",
        outcome: "Push event-driven lead updates from source apps into CRM endpoints with strict field transforms.",
      },
      {
        scenario: "Bi-system consistency",
        outcome: "Maintain alignment across sales and support tools with reliable retries and replay support.",
      },
      {
        scenario: "Operational run tracking",
        outcome: "Track every automation run with status, latency, and error metadata for faster troubleshooting.",
      },
    ],
  },
  "saas-workflows": {
    headline: "SaaS notifications and workflows in one service layer.",
    description:
      "Trigger and orchestrate SaaS actions with webhook ingestion, outbound API control, and resilience built for production events.",
    scenarios: [
      {
        scenario: "Notification fan-out",
        outcome: "Route one inbound event into multiple SaaS endpoints while preserving payload integrity.",
      },
      {
        scenario: "Workflow retries",
        outcome: "Automatically retry failed workflow steps and isolate hard failures into dead-letter queues.",
      },
      {
        scenario: "Replayable operations",
        outcome: "Operators can replay workflow failures with clear run diagnostics and outcome visibility.",
      },
    ],
  },
  "data-aggregation": {
    headline: "Data aggregation with API-first orchestration.",
    description:
      "Aggregate structured events from diverse APIs into downstream systems with deterministic transformations and operational guardrails.",
    scenarios: [
      {
        scenario: "Multi-source ingestion",
        outcome: "Normalize payloads from varied APIs into one contract before delivery to target services.",
      },
      {
        scenario: "Resilient aggregation pipelines",
        outcome: "Handle high-volume bursts with retries, breaker logic, and dead-letter recovery paths.",
      },
      {
        scenario: "Observable data movement",
        outcome: "Run history reveals performance and failure trends for data operations teams.",
      },
    ],
  },
};

const keyCapabilities = [
  {
    title: "Universal Protocol Support",
    desc: "Connect REST, GraphQL, SOAP, and webhook integrations from one integration layer with consistent routing and governance.",
  },
  {
    title: "Deterministic Mapping Engine",
    desc: "Use dot-path mapping rules, nested array mapping, and transformation functions to ensure predictable payload outputs across systems.",
  },
  {
    title: "Smart Auth Management",
    desc: "Support API key, bearer token, and OAuth2 client credentials with credential reuse across flows and secure outbound requests.",
  },
  {
    title: "Resilience + Recovery",
    desc: "Retries, exponential backoff, circuit breaker protection, dead letter queue, and replay operations keep integrations reliable in production.",
  },
];

const connectedSystems = [
  "Shopify",
  "ERP REST APIs",
  "Webhook Sources",
  "CRM Platforms",
  "Payment Gateways",
  "SaaS Apps",
  "Data Warehouses",
  "Operational Databases",
];

const integrationSources = ["Shopify", "Webhook Sources", "SaaS Apps"];

const integrationTargets = [
  "ERP REST APIs",
  "CRM Platforms",
  "Payment Gateways",
  "Data Warehouses",
  "Operational Databases",
];

const integrationFlowSteps = [
  {
    title: "1. Ingest",
    description: "Accept webhook or API events with endpoint-level auth and schema checks.",
  },
  {
    title: "2. Normalize",
    description: "Map source payloads into a deterministic canonical contract.",
  },
  {
    title: "3. Deliver",
    description: "Route transformed payloads to destination APIs with retries and breaker controls.",
  },
  {
    title: "4. Operate",
    description: "Track run history, dead letters, and replay failures without data loss.",
  },
];

const defaultRealWorldUseCases = [
  {
    scenario: "E-commerce order sync",
    outcome:
      "Ingest Shopify order webhooks, map payloads to ERP schema, and deliver to outbound REST endpoints with automatic retry and replay safety.",
  },
  {
    scenario: "Payment gateway integration",
    outcome:
      "Route payment events across fraud checks, ERP posting, and reconciliation APIs with resilient failover and run-level observability.",
  },
  {
    scenario: "CRM automation",
    outcome:
      "Capture sales and support events, transform records for downstream systems, and keep customer state synchronized across multiple tools.",
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

export default function ApiIntegrationPage() {
  const { useCaseSlug } = useParams<{ useCaseSlug: string }>();
  const navigate = useNavigate();
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
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [deadLettersLoading, setDeadLettersLoading] = useState(false);
  const [deadLettersError, setDeadLettersError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [isUseCaseModalOpen, setIsUseCaseModalOpen] = useState(false);
  const [pendingUseCaseSlug, setPendingUseCaseSlug] = useState<string>(useCaseOptions[0]?.slug ?? "");

  const goToUseCase = (slug: string) => {
    navigate(`/services/api-integration/${slug}`);
  };

  const selectedUseCase = useCaseSlug
    ? useCaseOptions.find((item) => item.slug === useCaseSlug)
    : null;
  const pendingUseCase = useCaseOptions.find((item) => item.slug === pendingUseCaseSlug);
  const selectedUseCaseDetail = selectedUseCase ? useCaseDetails[selectedUseCase.slug] : null;
  const displayedUseCases = selectedUseCaseDetail?.scenarios || defaultRealWorldUseCases;

  const hasInvalidUseCaseSlug = Boolean(useCaseSlug && !selectedUseCase);

  const isEcommerceOrderSync = selectedUseCase?.slug === "ecommerce-order-sync";

  const openUseCaseModal = () => {
    setPendingUseCaseSlug(selectedUseCase?.slug ?? useCaseOptions[0]?.slug ?? "");
    setIsUseCaseModalOpen(true);
  };

  const handleLaunchIntegration = () => {
    if (!pendingUseCaseSlug) return;
    setIsUseCaseModalOpen(false);
    goToUseCase(pendingUseCaseSlug);
  };

  const refreshRuns = useCallback(async () => {
    if (!isEcommerceOrderSync) return;

    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await getFlowRuns(1);
      setRuns(data);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : "Failed to fetch run history");
    } finally {
      setRunsLoading(false);
    }
  }, [isEcommerceOrderSync]);

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
      const response = await sendWebhookRequest(1, parsed);
      setWebhookResponse(response);
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
    void Promise.all([refreshRuns(), refreshDeadLetters()]);
  }, [isEcommerceOrderSync, refreshDeadLetters, refreshRuns]);

  const heroRef = useReveal();
  const capabilitiesRef = useReveal();
  const useCasesRef = useReveal();

  if (hasInvalidUseCaseSlug) {
    return <Navigate to="/services/api-integration" replace />;
  }

  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 relative z-[1]">
        <div className="container max-w-[900px]">
          <div ref={heroRef} className="reveal-element mb-16">
            <a href="/services" className="text-sm text-text-2 hover:text-primary-light transition-colors mb-6 inline-block">
              &larr; All Services
            </a>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold bg-primary/10 text-primary-light">
                API
              </div>
              <div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                  Integration
                </Badge>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">API Integration</h1>
              </div>
            </div>
            <p className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-[-1px] leading-[1.15] mb-4 text-foreground">
              {selectedUseCaseDetail?.headline || "Connect APIs with resilient, production-grade flows."}
            </p>
            <p className="text-base text-text-2 leading-relaxed font-light max-w-[640px]">
              {selectedUseCaseDetail?.description ||
                "Build and operate API integrations with deterministic mapping, secure authentication handling, retry and circuit protections, dead letter queue replay, and full run observability."}
            </p>
            {selectedUseCase ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-sm font-semibold text-foreground">Active Use Case: {selectedUseCase.name}</span>
                <Badge variant="outline" className={demandBadgeClass(selectedUseCase.demand)}>
                  {selectedUseCase.demand}
                </Badge>
                <Badge variant="outline" className={complexityBadgeClass(selectedUseCase.complexity)}>
                  {selectedUseCase.complexity}
                </Badge>
              </div>
            ) : null}
          </div>

          <div ref={capabilitiesRef} className="reveal-element mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-6 text-foreground">Key capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyCapabilities.map((capability) => (
                <Card key={capability.title} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="w-2 h-2 rounded-full mb-3 bg-primary-light" />
                    <h3 className="text-sm font-bold text-foreground mb-1.5">{capability.title}</h3>
                    <p className="text-sm text-text-2 font-light leading-relaxed">{capability.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">What it connects</h2>
            <div className="flex flex-wrap gap-2">
              {connectedSystems.map((system) => (
                <Badge key={system} variant="outline" className="text-xs font-medium">
                  {system}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-3 text-foreground">How it connects</h2>
            <p className="text-sm text-text-2 mb-5 leading-relaxed">
              SynapseOps sits between your source events and destination systems, applying auth, mapping, resilience controls,
              and ops visibility on every API transaction.
            </p>

            <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-stretch">
                <Card className="bg-background/40 border-border">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-text-2 mb-3">Inbound Sources</p>
                    <div className="space-y-2">
                      {integrationSources.map((source) => (
                        <div key={source} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                          {source}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="hidden md:flex items-center justify-center text-lg font-bold text-text-2">{"->"}</div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-primary-light mb-2">SynapseOps API Integration Layer</p>
                    <div className="space-y-2 text-sm text-foreground">
                      <p>Auth adapters: API keys, bearer, OAuth2</p>
                      <p>Mapping engine: schema transform + validation</p>
                      <p>Resilience: retry, circuit breaker, dead-letter queue</p>
                      <p>Observability: run history, status, replay controls</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="hidden md:flex items-center justify-center text-lg font-bold text-text-2">{"->"}</div>

                <Card className="bg-background/40 border-border">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-text-2 mb-3">Connected Destinations</p>
                    <div className="space-y-2">
                      {integrationTargets.map((target) => (
                        <div key={target} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                          {target}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-5 grid gap-2 md:grid-cols-4">
                {integrationFlowSteps.map((step) => (
                  <div key={step.title} className="rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-xs text-text-2 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={useCasesRef} className="reveal-element mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-6 text-foreground">Real-world use cases</h2>
            <div className="space-y-4">
              {displayedUseCases.map((useCase) => (
                <div key={useCase.scenario} className="border border-border rounded-lg p-5 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-primary-light" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{useCase.scenario}</h3>
                      <p className="text-sm text-text-2 font-light leading-relaxed">{useCase.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isEcommerceOrderSync ? (
            <div className="mb-16 space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">E-commerce Order Sync MVP</h2>
              <WebhookSimulator
                payload={webhookPayload}
                onPayloadChange={setWebhookPayload}
                onSend={handleSendWebhook}
                loading={webhookLoading}
                response={webhookResponse}
                error={webhookError}
              />
              <RunHistoryTable runs={runs} loading={runsLoading} error={runsError} onRefresh={refreshRuns} />
              <DeadLetterPanel
                items={deadLetters}
                loading={deadLettersLoading}
                error={deadLettersError}
                replayingId={replayingId}
                onRefresh={refreshDeadLetters}
                onReplay={handleReplayDeadLetter}
              />
            </div>
          ) : null}

          <div className="pt-8 border-t border-border">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="text-left">
                <p className="text-lg font-semibold text-foreground mb-2">Ready to start API Integration?</p>
                <p className="text-sm text-text-2">
                  Select a use case to launch the implementation path and continue at a dedicated service route.
                </p>
              </div>
              <Button size="lg" className="px-8 md:shrink-0" onClick={openUseCaseModal}>
                {selectedUseCase ? `Switch Use Case: ${selectedUseCase.name}` : "Start API Integration"}
              </Button>
            </div>
          </div>

          <Dialog open={isUseCaseModalOpen} onOpenChange={setIsUseCaseModalOpen}>
            <DialogContent className="sm:max-w-[560px] border-2 border-primary/40 bg-background/95 shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_28px_90px_rgba(0,0,0,0.75)]">
              <DialogHeader className="border-b border-primary/25 pb-3">
                <DialogTitle>Choose Integration Use Case</DialogTitle>
                <DialogDescription>Select a use case from the dropdown to open its dedicated page.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Select value={pendingUseCaseSlug} onValueChange={setPendingUseCaseSlug}>
                  <SelectTrigger className="h-13 border-2 border-primary/55 bg-card/70 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]">
                    <SelectValue placeholder="Select a use case" />
                  </SelectTrigger>
                  <SelectContent>
                    {useCaseOptions.map((useCase) => (
                      <SelectItem key={useCase.slug} value={useCase.slug}>
                        <div className="flex w-full min-w-[340px] items-center justify-between gap-2 pr-2">
                          <span className="truncate text-sm">#{useCase.rank} {useCase.name}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge variant="outline" className={demandBadgeClass(useCase.demand)}>
                              {useCase.demand}
                            </Badge>
                            <Badge variant="outline" className={complexityBadgeClass(useCase.complexity)}>
                              {useCase.complexity}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {pendingUseCase ? (
                  <div className="rounded-lg border-2 border-primary/30 bg-card/85 px-4 py-3 shadow-[0_0_0_1px_rgba(99,102,241,0.16)]">
                    <p className="text-sm font-medium text-foreground">
                      #{pendingUseCase.rank} {pendingUseCase.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={demandBadgeClass(pendingUseCase.demand)}>
                        {pendingUseCase.demand}
                      </Badge>
                      <Badge variant="outline" className={complexityBadgeClass(pendingUseCase.complexity)}>
                        {pendingUseCase.complexity}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-2 mt-2">Path: /services/api-integration/{pendingUseCase.slug}</p>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="border-t border-primary/20 pt-3">
                <Button variant="outline" onClick={() => setIsUseCaseModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLaunchIntegration} disabled={!pendingUseCaseSlug}>
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </>
  );
}
