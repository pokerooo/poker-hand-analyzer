import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { DiscordWebhookManager } from "@/components/DiscordWebhookManager";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DiscordSettings() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background felt-texture flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to manage your Discord webhooks
          </p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background felt-texture">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl text-accent">♠</span>
              <h1 className="text-2xl font-bold">Discord Settings</h1>
            </div>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Discord Integration</h2>
            <p className="text-muted-foreground">
              Connect your Discord servers to share poker hand analyses with your study groups.
              Create webhooks in your Discord server settings and add them here.
            </p>
          </div>

          <DiscordWebhookManager />

          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">How to create a Discord webhook:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open your Discord server and go to Server Settings</li>
              <li>Navigate to Integrations → Webhooks</li>
              <li>Click "New Webhook" and give it a name</li>
              <li>Select the channel where you want hands to be posted</li>
              <li>Copy the webhook URL and paste it here</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
