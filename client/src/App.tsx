import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HandDetail from "./pages/HandDetail";
import HandArchive from "./pages/HandArchive";
import HandInputSequential from "./pages/HandInputSequential";
import UserStats from "./pages/UserStats";
import HandShare from "./pages/HandShare";
import HandComparison from "./pages/HandComparison";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/input" component={HandInputSequential} />
      <Route path={"/archive"} component={HandArchive} />
      <Route path={"/hand/:id"} component={HandDetail} />
      <Route path={"/stats"} component={UserStats} />
      <Route path={"/share/:token"} component={HandShare} />
      <Route path={"/compare"} component={HandComparison} />
      <Route path={"/community"} component={Community} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
