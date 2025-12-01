import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Edit2, FolderOpen, Check, X } from "lucide-react";
import { Draft } from "@/hooks/useDraftManager";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DraftManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: Draft[];
  onLoadDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onRenameDraft: (id: string, newName: string) => void;
  currentDraftId: string | null;
}

export function DraftManagerDialog({
  open,
  onOpenChange,
  drafts,
  onLoadDraft,
  onDeleteDraft,
  onRenameDraft,
  currentDraftId,
}: DraftManagerDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleStartEdit = (draft: Draft) => {
    setEditingId(draft.id);
    setEditName(draft.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRenameDraft(id, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleLoad = (id: string) => {
    onLoadDraft(id);
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy à HH:mm", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Mes brouillons ({drafts.length})
          </DialogTitle>
        </DialogHeader>

        {drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun brouillon sauvegardé</p>
            <p className="text-sm mt-1">
              Utilisez le bouton "Sauvegarder brouillon" pour créer votre premier brouillon
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    currentDraftId === draft.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === draft.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(draft.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleSaveEdit(draft.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium truncate">{draft.name}</h4>
                          <div className="text-sm text-muted-foreground mt-1">
                            {draft.formData.localisation && (
                              <span className="mr-3">📍 {draft.formData.localisation}</span>
                            )}
                            {draft.formData.prix && (
                              <span className="mr-3">💰 {draft.formData.prix} CHF</span>
                            )}
                            {draft.attachments.length > 0 && (
                              <span>📎 {draft.attachments.length}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Modifié le {formatDate(draft.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>

                    {editingId !== draft.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoad(draft.id)}
                        >
                          Charger
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(draft)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDeleteDraft(draft.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
