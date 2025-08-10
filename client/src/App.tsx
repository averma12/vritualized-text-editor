import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, Home, Upload } from "lucide-react";
import Editor from "@/pages/editor";
import DocumentManager from "@/pages/document-manager";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/documents">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Your Documents
                </Button>
              </Link>
              <Link href="/editor">
                <Button variant="ghost" className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Demo Editor
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <Switch>
        <Route path="/" component={() => (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">VirtualText Editor</h1>
              <p className="text-xl text-muted-foreground mb-8">
                A high-performance document editor for large transcribed texts
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/documents">
                  <Button size="lg" className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Your Documents
                  </Button>
                </Link>
                <Link href="/editor">
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Try Demo Editor
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )} />
        <Route path="/documents" component={DocumentManager} />
        <Route path="/editor/:id?" component={Editor} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
