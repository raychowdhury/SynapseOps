import { useState } from "react";
import { useJobs, useJob, useCreateJob } from "@/hooks/useJobs";
import type { FieldDef, RelationshipDef } from "@/lib/api";
import { getExportUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SPEC_GENERATED: "bg-blue-500",
  CODE_GENERATED: "bg-indigo-500",
  TESTS_GENERATED: "bg-purple-500",
  VALIDATED: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
};

const ALL_OPS = ["create", "read", "update", "delete", "list"];
const FIELD_TYPES = ["str", "int", "float", "bool", "date", "datetime"];

const ARTIFACT_LABELS: Record<string, { label: string; category: string }> = {
  openapi_spec: { label: "OpenAPI Spec", category: "Core" },
  fastapi_code: { label: "FastAPI App", category: "Core" },
  auth_module: { label: "Auth Module", category: "Core" },
  db_models: { label: "DB Models", category: "Core" },
  alembic_migration: { label: "DB Migration", category: "Core" },
  pytest_tests: { label: "Test Suite", category: "Testing" },
  test_results: { label: "Test Results", category: "Testing" },
  dockerfile: { label: "Dockerfile", category: "DevOps" },
  docker_compose: { label: "Docker Compose", category: "DevOps" },
  requirements_txt: { label: "Requirements", category: "DevOps" },
  github_actions: { label: "GitHub Actions CI", category: "DevOps" },
  python_sdk: { label: "Python SDK", category: "SDK" },
  typescript_sdk: { label: "TypeScript SDK", category: "SDK" },
  postman_collection: { label: "Postman Collection", category: "SDK" },
};

export default function Dashboard() {
  const { data: jobs, isLoading } = useJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { data: selectedJob } = useJob(selectedJobId);
  const createJob = useCreateJob();

  const [resource, setResource] = useState("Task");
  const [fields, setFields] = useState<FieldDef[]>([
    { name: "title", type: "str", required: true },
    { name: "done", type: "bool", required: false },
  ]);
  const [operations, setOperations] = useState<string[]>([...ALL_OPS]);
  const [auth, setAuth] = useState(true);
  const [pagination, setPagination] = useState(true);
  const [relationships, setRelationships] = useState<RelationshipDef[]>([]);

  const addField = () => setFields([...fields, { name: "", type: "str", required: true }]);
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, key: string, val: string | boolean) => {
    const updated = [...fields];
    (updated[i] as any)[key] = val;
    setFields(updated);
  };

  const addRelationship = () => setRelationships([...relationships, { resource: "", type: "many" }]);
  const removeRelationship = (i: number) => setRelationships(relationships.filter((_, idx) => idx !== i));
  const updateRelationship = (i: number, key: string, val: string) => {
    const updated = [...relationships];
    (updated[i] as any)[key] = val;
    setRelationships(updated);
  };

  const toggleOp = (op: string) => {
    setOperations((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
  };

  const handleSubmit = () => {
    const validFields = fields.filter((f) => f.name.trim());
    if (!resource.trim() || validFields.length === 0) {
      toast.error("Resource name and at least one field are required");
      return;
    }
    const validRels = relationships.filter((r) => r.resource.trim());
    createJob.mutate(
      { resource: resource.trim(), fields: validFields, operations, auth, pagination, relationships: validRels },
      {
        onSuccess: (job) => {
          toast.success("Job created! Generating 14 artifacts...");
          setSelectedJobId(job.id);
        },
        onError: () => toast.error("Failed to create job"),
      }
    );
  };

  const groupedArtifacts = selectedJob?.artifacts.reduce((acc, a) => {
    const info = ARTIFACT_LABELS[a.type] || { label: a.type, category: "Other" };
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push({ ...a, label: info.label });
    return acc;
  }, {} as Record<string, (typeof selectedJob.artifacts[0] & { label: string })[]>);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center backdrop-blur-xl bg-background/65 border-b border-border">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/logo.png" alt="SynapseOps" className="w-9 h-9 rounded-[10px] object-cover" />
          <span className="font-bold text-xl tracking-tight text-foreground">SynapseOps</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-text-2 text-sm font-medium hover:text-foreground transition-colors">Home</a>
          <Badge variant="outline" className="text-xs">Dashboard</Badge>
        </div>
      </nav>

      <div className="container py-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-8 text-foreground">API Generator Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Creation Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">New API Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Resource Name</Label>
                <Input value={resource} onChange={(e) => setResource(e.target.value)} placeholder="e.g. Task, User, Product" className="mt-1" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Fields</Label>
                  <Button variant="outline" size="sm" onClick={addField}>+ Add</Button>
                </div>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={f.name}
                        onChange={(e) => updateField(i, "name", e.target.value)}
                        placeholder="name"
                        className="flex-1"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => updateField(i, "type", e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Checkbox
                        checked={f.required}
                        onCheckedChange={(v) => updateField(i, "required", !!v)}
                        title="Required"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeField(i)} className="px-2 text-red-400 hover:text-red-300">x</Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Relationships</Label>
                  <Button variant="outline" size="sm" onClick={addRelationship}>+ Add</Button>
                </div>
                <div className="space-y-2">
                  {relationships.map((r, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={r.resource}
                        onChange={(e) => updateRelationship(i, "resource", e.target.value)}
                        placeholder="Related resource"
                        className="flex-1"
                      />
                      <select
                        value={r.type}
                        onChange={(e) => updateRelationship(i, "type", e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="many">has many</option>
                        <option value="one">belongs to</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => removeRelationship(i)} className="px-2 text-red-400 hover:text-red-300">x</Button>
                    </div>
                  ))}
                  {relationships.length === 0 && (
                    <p className="text-xs text-text-2">No relationships. Add one to generate foreign keys and joins.</p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-2 block">Operations</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_OPS.map((op) => (
                    <Badge
                      key={op}
                      variant={operations.includes(op) ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggleOp(op)}
                    >
                      {op}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>JWT Auth</Label>
                <Switch checked={auth} onCheckedChange={setAuth} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pagination</Label>
                <Switch checked={pagination} onCheckedChange={setPagination} />
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-text-2 font-medium mb-1">Will generate:</p>
                <p className="text-xs text-text-2">OpenAPI spec, FastAPI app, Auth module, DB models, Migration, Tests, Dockerfile, Docker Compose, Python SDK, TypeScript SDK, Postman collection, CI/CD pipeline</p>
              </div>

              <Button onClick={handleSubmit} disabled={createJob.isPending} className="w-full">
                {createJob.isPending ? "Creating..." : "Generate Full API Project"}
              </Button>
            </CardContent>
          </Card>

          {/* Job List + Detail */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-text-2 text-sm">Loading...</p>
                ) : !jobs?.length ? (
                  <p className="text-text-2 text-sm">No jobs yet. Create one to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedJobId === job.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                        }`}
                      >
                        <div>
                          <span className="font-medium text-sm text-foreground">{job.input_json.resource}</span>
                          <span className="text-xs text-text-2 ml-2">{job.id.slice(0, 8)}...</span>
                          <span className="text-xs text-text-2 ml-2">{job.artifacts.length} artifacts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[job.status] || "bg-gray-500"}`} />
                          <span className="text-xs font-mono text-text-2">{job.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedJob && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedJob.input_json.resource} API</CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedJob.status === "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(getExportUrl(selectedJob.id), "_blank")}
                        >
                          Download .zip
                        </Button>
                      )}
                      <Badge className={`${STATUS_COLORS[selectedJob.status]} text-white border-0`}>
                        {selectedJob.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-text-2 font-mono">{selectedJob.id}</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="artifacts">
                    <TabsList>
                      <TabsTrigger value="artifacts">Artifacts ({selectedJob.artifacts.length})</TabsTrigger>
                      <TabsTrigger value="logs">Logs ({selectedJob.audit_logs.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="artifacts" className="space-y-6 mt-4">
                      {groupedArtifacts && Object.entries(groupedArtifacts).map(([category, arts]) => (
                        <div key={category}>
                          <h3 className="text-sm font-semibold text-text-2 uppercase tracking-wider mb-3">{category}</h3>
                          <div className="space-y-3">
                            {arts.map((a) => (
                              <div key={a.id} className="border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                                  <span className="text-sm font-medium">{a.label}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(a.content);
                                      toast.success(`${a.label} copied`);
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </div>
                                <pre className="p-4 text-xs overflow-x-auto max-h-[300px] overflow-y-auto bg-background">
                                  <code>{a.content}</code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="logs" className="mt-4">
                      <div className="space-y-1">
                        {selectedJob.audit_logs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 text-sm py-1.5">
                            <span className="text-xs text-text-2 font-mono whitespace-nowrap">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                            <span className="text-foreground">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
