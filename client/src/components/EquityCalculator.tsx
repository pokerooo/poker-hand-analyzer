import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateEquity, calculateOuts, estimateVillainRange } from "@shared/equityCalculator";
import { TrendingUp, Target, Percent } from "lucide-react";
import { useMemo } from "react";

interface EquityCalculatorProps {
  heroCards: string[]; // e.g., ["As", "Kh"]
  boardCards: string[]; // e.g., ["Qd", "Jc", "Ts"]
  villainPosition?: string;
  villainActions?: string[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
}

export function EquityCalculator({ 
  heroCards, 
  boardCards, 
  villainPosition = "BTN",
  villainActions = [],
  street
}: EquityCalculatorProps) {
  
  // Calculate equity using Monte Carlo simulation
  const equityData = useMemo(() => {
    if (heroCards.length < 2) return null;
    
    const villainRange = estimateVillainRange(villainPosition, villainActions);
    return calculateEquity(heroCards, boardCards, villainRange, 1000);
  }, [heroCards, boardCards, villainPosition, villainActions]);
  
  // Calculate outs if on flop or turn
  const outsData = useMemo(() => {
    if (street === 'preflop' || street === 'river' || boardCards.length < 3) {
      return null;
    }
    return calculateOuts(heroCards, boardCards);
  }, [heroCards, boardCards, street]);
  
  if (!equityData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equity Calculator</CardTitle>
          <CardDescription>Insufficient data for equity calculation</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const getEquityColor = (equity: number) => {
    if (equity >= 60) return "text-green-500";
    if (equity >= 40) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getEquityBadge = (equity: number) => {
    if (equity >= 60) return <Badge className="bg-green-600">Favorite</Badge>;
    if (equity >= 40) return <Badge className="bg-yellow-600">Coinflip</Badge>;
    return <Badge variant="destructive">Underdog</Badge>;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Equity Calculator
        </CardTitle>
        <CardDescription>
          Win probability against villain's estimated range
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Equity Display */}
        <div className="p-6 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Equity</p>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-bold ${getEquityColor(equityData.equity)}`}>
                  {equityData.equity}%
                </span>
                {getEquityBadge(equityData.equity)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Villain's Equity</p>
              <span className="text-4xl font-bold text-muted-foreground">
                {(100 - equityData.equity).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Visual Equity Bar */}
          <div className="relative">
            <Progress value={equityData.equity} className="h-4" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-difference">
              {equityData.equity}% vs {(100 - equityData.equity).toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* Simulation Results */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-600/10 border border-green-600/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Wins</p>
            <p className="text-2xl font-bold text-green-500">{equityData.wins}</p>
            <p className="text-xs text-muted-foreground">
              {((equityData.wins / 1000) * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="p-3 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Ties</p>
            <p className="text-2xl font-bold text-yellow-500">{equityData.ties}</p>
            <p className="text-xs text-muted-foreground">
              {((equityData.ties / 1000) * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Losses</p>
            <p className="text-2xl font-bold text-red-500">{equityData.losses}</p>
            <p className="text-xs text-muted-foreground">
              {((equityData.losses / 1000) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        
        {/* Outs and Odds (if applicable) */}
        {outsData && outsData.outs > 0 && (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">Drawing Hand Detected</p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Outs</p>
                    <p className="text-xl font-bold text-accent">{outsData.outs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Odds to Hit</p>
                    <p className="text-xl font-bold text-accent">{outsData.oddsPercent}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{outsData.description}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Villain Range Estimate */}
        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Villain Range Estimate</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on {villainPosition} position and actions, villain is estimated to have{" "}
            <span className="font-semibold text-foreground">
              {estimateVillainRange(villainPosition, villainActions).toFixed(1)}%
            </span>{" "}
            of possible hands
          </p>
        </div>
        
        {/* Methodology Note */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            <strong>Methodology:</strong> Equity calculated using Monte Carlo simulation (1,000 iterations).
            Villain's range estimated based on position and betting actions. Results are approximate.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
