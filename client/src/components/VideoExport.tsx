import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, Download, Loader2, X } from "lucide-react";
import html2canvas from "html2canvas";

interface VideoExportProps {
  /** The DOM element wrapping the PokerTable + description that should be recorded */
  captureRef: React.RefObject<HTMLDivElement | null>;
  /** Total number of replay steps */
  totalSteps: number;
  /** Callback to advance to a specific step index */
  goToStep: (index: number) => void;
  /** Hand title for the filename */
  title?: string;
}

const FRAME_DURATION_MS = 1500; // ms each step is shown
const FPS = 30;
const FRAMES_PER_STEP = Math.round((FRAME_DURATION_MS / 1000) * FPS); // 45 frames per step

export function VideoExport({ captureRef, totalSteps, goToStep, title }: VideoExportProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const abortRef = useRef(false);

  const exportVideo = useCallback(async () => {
    if (!captureRef.current) return;
    setExporting(true);
    setProgress(0);
    abortRef.current = false;

    try {
      const el = captureRef.current;
      const rect = el.getBoundingClientRect();

      // Portrait canvas for TikTok/IG Stories (9:16)
      const targetW = 540;
      const targetH = 960;

      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d")!;

      const stream = offscreen.captureStream(FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.start();

      const totalFrames = totalSteps * FRAMES_PER_STEP;
      let frameCount = 0;

      for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
        if (abortRef.current) break;

        // Advance replayer to this step
        goToStep(stepIdx);

        // Wait for React to re-render
        await new Promise((r) => setTimeout(r, 80));

        // Capture the element
        const canvas = await html2canvas(el, {
          useCORS: true,
          backgroundColor: "#ffffff",
          scale: targetW / rect.width,
          width: rect.width,
          height: rect.height,
          logging: false,
        });

        // For each frame in this step, draw the captured frame
        for (let f = 0; f < FRAMES_PER_STEP; f++) {
          if (abortRef.current) break;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);

          // Center the capture vertically with padding
          const scale = targetW / canvas.width;
          const scaledH = canvas.height * scale;
          const yOffset = (targetH - scaledH) / 2;

          ctx.drawImage(canvas, 0, yOffset, targetW, scaledH);

          // Add subtle step indicator dots at bottom
          const dotY = targetH - 24;
          const dotSpacing = 12;
          const totalDots = Math.min(totalSteps, 20);
          const startX = targetW / 2 - (totalDots * dotSpacing) / 2;
          for (let d = 0; d < totalDots; d++) {
            ctx.beginPath();
            ctx.arc(startX + d * dotSpacing, dotY, d === stepIdx ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = d === stepIdx ? "#16a34a" : "rgba(0,0,0,0.2)";
            ctx.fill();
          }

          // Wait one frame tick
          await new Promise((r) => requestAnimationFrame(r));

          frameCount++;
          const pct = Math.round((frameCount / totalFrames) * 100);
          setProgress(pct);
          setStatusMsg(`Rendering step ${stepIdx + 1} of ${totalSteps}…`);
        }
      }

      recorder.stop();
      setStatusMsg("Finalising video…");

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title ? title.replace(/\s+/g, "-").toLowerCase() : "poker-hand"}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMsg("Done! Check your downloads.");
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
        setStatusMsg("");
      }, 2500);

    } catch (err) {
      console.error("Video export failed:", err);
      setStatusMsg("Export failed. Try again.");
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
        setStatusMsg("");
      }, 3000);
    }
  }, [captureRef, totalSteps, goToStep, title]);

  const cancel = () => {
    abortRef.current = true;
    setExporting(false);
    setProgress(0);
    setStatusMsg("");
  };

  return (
    <div className="space-y-3">
      {!exporting ? (
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={exportVideo}
        >
          <Video className="h-4 w-4" />
          Export Video (TikTok / IG Stories)
        </Button>
      ) : (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {statusMsg || "Preparing export…"}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress}% — This may take a minute. Keep this tab open.
          </p>
        </div>
      )}

      {!exporting && (
        <p className="text-xs text-muted-foreground text-center">
          Exports as a portrait .webm video (9:16) — ideal for TikTok, IG Reels &amp; Stories.
          <br />
          Convert to MP4 with <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noopener noreferrer" className="underline">CloudConvert</a> if needed.
        </p>
      )}
    </div>
  );
}
