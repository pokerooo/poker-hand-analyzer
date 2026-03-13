import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ProPaywall from "@/components/ProPaywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  ChevronLeft,
  Layers,
} from "lucide-react";

interface ImportResult {
  shareSlug: string;
  title: string;
  success: boolean;
  error?: string;
}

export default function ImportHistory() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    total: number;
    processed: number;
    imported: number;
    results: ImportResult[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPro = (user as any)?.isPro ?? false;

  const importMutation = trpc.hands.importHistory.useMutation({
    onSuccess: (data) => {
      setImportResults(data);
      toast.success(`Imported ${data.imported} of ${data.processed} hands successfully`);
    },
    onError: (err) => {
      toast.error(err.message || "Import failed");
    },
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".log")) {
      toast.error("Please upload a .txt hand history file");
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("File too large — maximum 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      setFileName(file.name);
      setImportResults(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleImport = () => {
    if (!fileContent) return;
    importMutation.mutate({ fileContent });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--poker-page-bg)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#10b981" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--poker-page-bg)", color: "var(--poker-text)" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ borderColor: "var(--poker-border)", background: "var(--poker-header-bg)" }}
      >
        <Link href="/my-hands">
          <button
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--poker-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--poker-green)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--poker-text-muted)")}
          >
            <ChevronLeft className="h-4 w-4" />
            My Hands
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" style={{ color: "#10b981" }} />
          <span className="font-semibold text-base">Import Hand History</span>
        </div>
        <Badge
          className="text-[10px] px-2 py-0.5 ml-1"
          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          PRO
        </Badge>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Pro paywall */}
        {isAuthenticated && !isPro && (
          <ProPaywall feature="import" />
        )}

        {/* Not logged in */}
        {!isAuthenticated && (
          <div
            className="rounded-xl p-8 text-center border"
            style={{ background: "var(--poker-surface)", borderColor: "var(--poker-border)" }}
          >
            <Layers className="h-10 w-10 mx-auto mb-4" style={{ color: "#10b981" }} />
            <h2 className="text-xl font-bold mb-2">Sign in to import hands</h2>
            <p className="text-sm mb-6" style={{ color: "var(--poker-text-muted)" }}>
              Hand history import is a Pro feature. Sign in first, then upgrade to Pro.
            </p>
            <Link href="/">
              <Button style={{ background: "#10b981", color: "#000" }}>Go to Home</Button>
            </Link>
          </div>
        )}

        {/* Import UI — only shown to Pro users */}
        {isAuthenticated && isPro && (
          <>
            {/* Supported formats */}
            <div
              className="rounded-xl p-5 border"
              style={{ background: "var(--poker-surface)", borderColor: "var(--poker-border)" }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--poker-text-muted)" }}>
                Supported Formats
              </h3>
              <div className="flex gap-3">
                {["PokerStars", "GGPoker"].map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {platform}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: "var(--poker-text-muted)" }}>
                Upload your .txt hand history file. Up to 50 hands per import, 500KB max.
              </p>
            </div>

            {/* Drop zone */}
            <div
              className="rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
              style={{
                  borderColor: isDragging ? "var(--poker-green)" : fileContent ? "rgba(16,185,129,0.4)" : "var(--poker-border)",
                background: isDragging ? "rgba(16,185,129,0.05)" : fileContent ? "rgba(16,185,129,0.03)" : "transparent",
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.log"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {fileContent ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto" style={{ color: "#10b981" }} />
                  <p className="font-semibold" style={{ color: "#6ee7b7" }}>
                    {fileName}
                  </p>
                  <p className="text-sm" style={{ color: "var(--poker-text-muted)" }}>
                    {(fileContent.length / 1024).toFixed(1)} KB loaded — click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-10 w-10 mx-auto" style={{ color: "#475569" }} />
                  <div>
                    <p className="font-semibold" style={{ color: "var(--poker-text)" }}>
                      Drop your hand history file here
                    </p>
                    <p className="text-sm mt-1" style={{ color: "var(--poker-text-muted)" }}>
                      or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Import button */}
            {fileContent && !importResults && (
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="w-full gap-2 h-12 text-base font-semibold"
                style={{ background: "var(--poker-green)", color: "#fff" }}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Importing hands...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Import Hands
                  </>
                )}
              </Button>
            )}

            {/* Results */}
            {importResults && (
              <div className="space-y-4">
                {/* Summary */}
                <div
                  className="rounded-xl p-5 border"
                  style={{ background: "var(--poker-surface)", borderColor: "rgba(16,185,129,0.2)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Import Complete</h3>
                    <Badge
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      {importResults.imported}/{importResults.processed} imported
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "Found", value: importResults.total },
                      { label: "Processed", value: importResults.processed },
                      { label: "Imported", value: importResults.imported, accent: true },
                    ].map(({ label, value, accent }) => (
                      <div
                        key={label}
                        className="rounded-lg p-3"
                        style={{ background: "var(--poker-surface-2)" }}
                      >
                        <div
                          className="text-2xl font-bold"
                          style={{ color: accent ? "var(--poker-green)" : "var(--poker-text)" }}
                        >
                          {value}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--poker-text-muted)" }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-hand results */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResults.results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg px-4 py-3 border"
                      style={{
                        background: r.success ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
                        borderColor: r.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.success ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10b981" }} />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
                        )}
                        <span className="text-sm truncate" style={{ color: "var(--poker-text-muted)" }}>
                          {r.title}
                        </span>
                      </div>
                      {r.success && r.shareSlug && (
                        <Link href={`/hand/${r.shareSlug}`}>
                          <button
                            className="flex items-center gap-1 text-xs shrink-0 ml-3 transition-colors"
                            style={{ color: "#10b981" }}
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </button>
                        </Link>
                      )}
                      {!r.success && r.error && (
                        <span className="text-xs shrink-0 ml-3" style={{ color: "#ef4444" }}>
                          {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link href="/my-hands" className="flex-1">
                    <Button
                      className="w-full gap-2"
                      style={{
                        background: "var(--poker-green)",
                        color: "#fff",
                      }}
                    >
                      View My Hands <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    style={{ borderColor: "var(--poker-border)", color: "var(--poker-text-muted)" }}
                    onClick={() => {
                      setFileContent(null);
                      setFileName(null);
                      setImportResults(null);
                    }}
                  >
                    Import More
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
