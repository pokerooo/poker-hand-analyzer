import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DiscordWebhookManager() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data: webhooks, refetch } = trpc.discord.listWebhooks.useQuery();
  const addWebhook = trpc.discord.addWebhook.useMutation();
  const deleteWebhook = trpc.discord.deleteWebhook.useMutation();
  const updateWebhook = trpc.discord.updateWebhook.useMutation();

  const handleAddWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await addWebhook.mutateAsync({
        name: newWebhookName,
        webhookUrl: newWebhookUrl,
        isDefault,
      });
      
      toast.success("Discord webhook added successfully!");
      setShowAddDialog(false);
      setNewWebhookName("");
      setNewWebhookUrl("");
      setIsDefault(false);
      await refetch();
    } catch (error) {
      toast.error("Failed to add webhook");
      console.error(error);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    try {
      await deleteWebhook.mutateAsync({ id });
      toast.success("Webhook deleted");
      await refetch();
    } catch (error) {
      toast.error("Failed to delete webhook");
      console.error(error);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await updateWebhook.mutateAsync({ id, isDefault: true });
      toast.success("Default webhook updated");
      await refetch();
    } catch (error) {
      toast.error("Failed to update webhook");
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Discord Webhooks</CardTitle>
            <CardDescription>
              Manage Discord webhooks for sharing hands to your study groups
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Discord Webhook</DialogTitle>
                <DialogDescription>
                  Create a webhook in your Discord server settings and paste the URL here.
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline ml-1 inline-flex items-center gap-1"
                  >
                    Learn how
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Webhook Name</label>
                  <Input
                    placeholder="e.g., Study Group, Main Server"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Webhook URL</label>
                  <Input
                    placeholder="https://discord.com/api/webhooks/..."
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="isDefault" className="text-sm">
                    Set as default webhook
                  </label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddWebhook} disabled={addWebhook.isPending}>
                    {addWebhook.isPending ? "Adding..." : "Add Webhook"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {webhooks && webhooks.length > 0 ? (
          <div className="space-y-3">
            {webhooks.map((webhook: any) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{webhook.name}</span>
                    {webhook.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {webhook.webhookUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!webhook.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(webhook.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">No Discord webhooks configured</p>
            <p className="text-sm">Add a webhook to start sharing hands to Discord</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
