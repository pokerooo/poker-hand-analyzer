import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HandDetail from "./pages/HandDetail";
import HandArchive from "./pages/HandArchive";
import HandInput from "./pages/HandInput";
import UserStats from "./pages/UserStats";
import HandShare from "./pages/HandShare";
import NotFound from "./pages/NotFound";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/input"} component={HandInput} />
      <Route path={"/archive"} component={HandArchive} />
      <Route path={"/hand/:id"} component={HandDetail} />
      <Route path={"/stats"} component={UserStats} />
      <Route path={"/share/:token"} component={HandShare} />
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
