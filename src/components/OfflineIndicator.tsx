import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { WifiOff, RefreshCw, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingActions } = useOfflineStatus();

  return (
    <AnimatePresence>
      {(!isOnline || isSyncing || pendingActions > 0) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
          style={{
            background: !isOnline 
              ? "hsl(var(--destructive))" 
              : isSyncing 
                ? "hsl(var(--warning))" 
                : "hsl(var(--primary))",
            color: !isOnline 
              ? "hsl(var(--destructive-foreground))" 
              : "hsl(var(--primary-foreground))",
          }}
        >
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Mode hors-ligne</span>
              {pendingActions > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {pendingActions} en attente
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Synchronisation en cours...</span>
            </>
          ) : pendingActions > 0 ? (
            <>
              <Cloud className="h-4 w-4" />
              <span>{pendingActions} action(s) en attente de sync</span>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
