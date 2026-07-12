import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "./LanguageContext";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Lobby from "./pages/Lobby";
import GameHost from "./pages/GameHost";
import GamePlayer from "./pages/GamePlayer";
import Winner from "./pages/Winner";
import Leaderboard from "./pages/Leaderboard";
import SoloGame from "./pages/SoloGame";
import NotFound from "./pages/not-found";

function AppRoutes() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create" component={CreateRoom} />
        <Route path="/join" component={JoinRoom} />
        <Route path="/lobby/:roomId/:playerId" component={Lobby} />
        <Route path="/host/:roomId/:playerId" component={GameHost} />
        <Route path="/player/:roomId/:playerId" component={GamePlayer} />
        <Route path="/winner/:roomId" component={Winner} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/solo" component={SoloGame} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  // Always dark mode
  document.documentElement.classList.add("dark");
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppRoutes />
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
