import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import HandReplayer from "@/pages/HandReplayer";
import MyHands from "@/pages/MyHands";
import ImportHistory from "@/pages/ImportHistory";
import PatternRecognition from "@/pages/PatternRecognition";
import ProSuccess from "@/pages/ProSuccess";
import MemoryBank from "@/pages/MemoryBank";
import CoachChat from "@/pages/CoachChat";
import WinRateVisualizer from "@/pages/WinRateVisualizer";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import UpgradeSuccess from "@/pages/UpgradeSuccess";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hand/:slug" component={HandReplayer} />
      <Route path="/my-hands" component={MyHands} />
      <Route path="/import" component={ImportHistory} />
      <Route path="/patterns" component={PatternRecognition} />
      <Route path="/pro-success" component={ProSuccess} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/upgrade-success" component={UpgradeSuccess} />
      <Route path="/memory-bank" component={MemoryBank} />
      <Route path="/coach" component={CoachChat} />
      <Route path="/win-rate" component={WinRateVisualizer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
