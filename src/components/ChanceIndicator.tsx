import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ChanceIndicatorProps {
  percentage: number;
  color: string;
  label: string;
  conseils: string[];
  compact?: boolean;
  criteres?: {
    visiteDone: boolean;
    candidatureDeposee: boolean;
    revenusOk: boolean;
    documentsComplets: boolean;
    permisOk: boolean;
  };
}

export function ChanceIndicator({ 
  percentage, 
  color, 
  label, 
  conseils, 
  compact = false,
  criteres 
}: ChanceIndicatorProps) {
  const getProgressColor = () => {
    if (percentage >= 80) return "bg-success";
    if (percentage >= 60) return "bg-primary";
    if (percentage >= 40) return "bg-warning";
    if (percentage >= 20) return "bg-orange-500";
    return "bg-destructive";
  };

  const getIcon = () => {
    if (percentage >= 80) return CheckCircle2;
    if (percentage >= 40) return TrendingUp;
    return AlertCircle;
  };

  const Icon = getIcon();

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", color)} />
            <span className="text-sm font-medium">Chances d'obtention</span>
          </div>
          <Badge variant="outline" className={cn("font-bold", color)}>
            {percentage}% - {label}
          </Badge>
        </div>
        <Progress 
          value={percentage} 
          className="h-2"
          indicatorClassName={getProgressColor()}
        />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={cn("w-5 h-5", color)} />
          Vos chances d'obtenir cet appartement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-3xl font-bold", color)}>{percentage}%</span>
            <Badge variant="outline" className={cn("text-sm", color)}>
              {label}
            </Badge>
          </div>
          <Progress 
            value={percentage} 
            className="h-3"
            indicatorClassName={getProgressColor()}
          />
        </div>

        {criteres && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className={cn("flex items-center gap-2 text-sm", criteres.visiteDone ? "text-success" : "text-muted-foreground")}>
              {criteres.visiteDone ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 rounded-full" />}
              <span>Visite effectuée</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm", criteres.candidatureDeposee ? "text-success" : "text-muted-foreground")}>
              {criteres.candidatureDeposee ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 rounded-full" />}
              <span>Candidature déposée</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm", criteres.revenusOk ? "text-success" : "text-muted-foreground")}>
              {criteres.revenusOk ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 rounded-full" />}
              <span>Revenus suffisants</span>
            </div>
            <div className={cn("flex items-center gap-2 text-sm", criteres.documentsComplets ? "text-success" : "text-muted-foreground")}>
              {criteres.documentsComplets ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 rounded-full" />}
              <span>Dossier complet</span>
            </div>
          </div>
        )}

        {conseils.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Conseils pour améliorer vos chances:</span>
            </div>
            {conseils.map((conseil, index) => (
              <Alert key={index} className="py-2">
                <AlertDescription className="text-sm leading-relaxed">
                  {conseil}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
