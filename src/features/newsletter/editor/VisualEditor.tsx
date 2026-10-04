import { useEffect, useRef, useState } from "react";
import grapesjs, { type Editor } from "grapesjs";
import newsletter from "grapesjs-preset-newsletter";
import fr from "grapesjs/locale/fr.mjs";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Save,
  Download,
  ImagePlus,
  Copy,
  Trash2,
  Layers,
  Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { newsletterApi } from "@/features/newsletter/api";
import { toast } from "sonner";
import "grapesjs/dist/css/grapes.min.css";
import "./editor.css";

const labels: Record<string, string> = {
  sect100: "1 colonne",
  sect50: "2 colonnes",
  sect30: "3 colonnes",
  sect37: "Image + texte",
  button: "Bouton",
  divider: "Séparateur",
  text: "Paragraphe",
  "text-sect": "Titre et texte",
  image: "Image",
  quote: "Citation",
  link: "Lien",
  "link-block": "Bloc cliquable",
  "grid-items": "Deux articles",
  "list-items": "Liste d’articles",
};
function safeEditorHtml(html: string) {
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style"],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "link",
      "meta",
      "base",
    ],
  });
}
export default function VisualEditor({
  html,
  onApply,
  onClose,
}: {
  html: string;
  onApply: (html: string) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLDivElement>(null),
    blocks = useRef<HTMLDivElement>(null),
    styles = useRef<HTMLDivElement>(null),
    traits = useRef<HTMLDivElement>(null),
    layers = useRef<HTMLDivElement>(null);
  const editor = useRef<Editor>();
  const [panel, setPanel] = useState("content"),
    [device, setDevice] = useState("Desktop"),
    [changed, setChanged] = useState(false),
    [ready, setReady] = useState(false),
    [selected, setSelected] = useState(false),
    [uploading, setUploading] = useState(false),
    [preview, setPreview] = useState(false);
  const initialHtml = useRef(html);
  const [history, setHistory] = useState({ undo: false, redo: false });
  useEffect(() => {
    if (!canvas.current) return;
    const e = grapesjs.init({
      container: canvas.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      noticeOnUnload: false,
      panels: { defaults: [] },
      i18n: { locale: "fr", detectLocale: false, messages: { fr } },
      blockManager: { appendTo: blocks.current! },
      styleManager: {
        appendTo: styles.current!,
        sectors: [
          {
            name: "Dimensions et espacement",
            open: true,
            buildProps: ["width", "height", "max-width", "padding", "margin"],
          },
          {
            name: "Texte",
            open: true,
            buildProps: [
              "font-family",
              "font-size",
              "font-weight",
              "color",
              "line-height",
              "letter-spacing",
              "text-align",
              "text-decoration",
            ],
          },
          {
            name: "Couleurs et bordures",
            open: true,
            buildProps: ["background-color", "border", "border-radius"],
          },
        ],
      },
      traitManager: { appendTo: traits.current! },
      layerManager: { appendTo: layers.current! },
      selectorManager: { componentFirst: true },
      deviceManager: {
        devices: [
          { id: "Desktop", name: "Desktop", width: "" },
          { id: "Mobile", name: "Mobile", width: "375px", widthMedia: "600px" },
        ],
      },
      assetManager: {
        assets: [
          "visuel-premium.jpg",
          "recherche.jpg",
          "dossier.jpg",
          "logisorama-logo.png",
        ].map((n) => n === "logisorama-logo.png" ? "https://logisorama.ch/email/logo-logisorama.png" : `https://logisorama.ch/newsletter/${n}`),
        upload: false,
        embedAsBase64: false,
        showUrlInput: true,
      },
      parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false } },
      plugins: [
        (ed) =>
          newsletter(ed, {
            showBlocksOnLoad: false,
            showStylesOnChange: false,
            updateStyleManager: false,
            useCustomTheme: false,
            juiceOpts: { preserveMediaQueries: true },
            block: (id) => ({
              label: labels[id] || id,
              category: id.startsWith("sect") ? "Colonnes" : "Blocs",
            }),
          }),
      ],
    });
    editor.current = e;
    e.on("load", () => {
      const document = new DOMParser().parseFromString(
        safeEditorHtml(initialHtml.current),
        "text/html",
      );
      e.setStyle(
        Array.from(document.querySelectorAll("head style"))
          .map((s) => s.textContent || "")
          .join("\n"),
      );
      e.setComponents(document.body.innerHTML);
      const bodyStyle = Object.fromEntries(
        Array.from(document.body.style).map((k) => [
          k,
          document.body.style.getPropertyValue(k),
        ]),
      );
      e.getWrapper()?.setStyle({
        margin: "0",
        "font-family": "Arial, Helvetica, sans-serif",
        ...bodyStyle,
      });
      e.UndoManager.clear();
      e.on("update", () => {
        setChanged(true);
        setHistory({
          undo: e.UndoManager.hasUndo(),
          redo: e.UndoManager.hasRedo(),
        });
      });
      e.on("component:selected", () => setSelected(true));
      e.on("component:deselected", () => setSelected(false));
      e.Blocks.add("logisorama-heading", {
        label: "Titre",
        category: "Blocs",
        content:
          '<h1 style="font-family:Arial;color:#1c4734;font-size:32px;padding:20px;margin:0">Votre prochain chapitre commence ici.</h1>',
      });
      e.Blocks.add("logisorama-spacer", {
        label: "Espacement",
        category: "Blocs",
        content:
          '<table role="presentation" width="100%"><tr><td style="height:24px;font-size:1px">&nbsp;</td></tr></table>',
      });
      e.Blocks.add("logisorama-social", {
        label: "Réseaux et liens",
        category: "Blocs",
        content:
          '<div style="padding:20px;text-align:center;font-family:Arial"><a href="https://logisorama.ch" style="color:#205a43">Notre site</a> · <a href="mailto:support@logisorama.ch" style="color:#205a43">Nous contacter</a></div>',
      });
      e.Blocks.add("logisorama-hero", {
        label: "En-tête Logisorama",
        category: "Sections",
        content:
          '<table role="presentation" width="100%"><tr><td style="padding:32px;background:#1c4734;color:#ffffff;font-family:Arial"><p style="font-size:12px;letter-spacing:3px">LOGISORAMA</p><h1 style="font-size:34px;line-height:1.15">Votre recherche mérite un coup de pouce.</h1><p>Découvrez nos services pour votre projet immobilier.</p><a href="https://logisorama.ch/nouveau-mandat" style="display:inline-block;background:#e9e3d0;color:#1c4734;padding:14px 24px;border-radius:8px;text-decoration:none">Créer mon dossier</a></td></tr></table>',
      });
      setReady(true);
    });
    return () => {
      e.destroy();
      editor.current = undefined;
    };
  }, []);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  useEffect(() => {
    const stop = (event: BeforeUnloadEvent) => {
      if (changed) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [changed]);
  function exportHtml() {
    const e = editor.current!;
    e.stopCommand("core:component-text-edit");
    const body = e.runCommand("gjs-get-inlined-html", {
      juiceOpts: { preserveMediaQueries: true },
    }) as string;
    const result = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>${body.includes("<body") ? body : `<body>${body}</body>`}</html>`;
    if (new TextEncoder().encode(result).length > 250000)
      throw new Error("La newsletter dépasse 250 Ko. Réduisez son contenu.");
    return result;
  }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      if (
        !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type,
        ) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error(
          "Utilisez une image JPG, PNG, GIF ou WebP de moins de 5 Mo.",
        );
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await newsletterApi<{ url: string }>({
        action: "asset-upload",
        mime: file.type,
        base64,
      });
      editor.current!.Assets.add({ src: url, name: file.name });
      const component = editor.current!.getSelected();
      if (component?.is("image")) component.set("src", url);
      else editor.current!.runCommand("open-assets");
      toast.success("Image ajoutée à la bibliothèque");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div
      ref={root}
      className="newsletter-editor fixed inset-0 z-[100] flex flex-col bg-[#f5f6f7] text-[#202a27]"
      role="dialog"
      aria-modal="true"
      aria-label="Éditeur visuel de newsletter"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Quitter l’éditeur"
            onClick={() => {
              if (
                !changed ||
                window.confirm(
                  "Quitter sans appliquer les modifications de l’éditeur ?",
                )
              )
                onClose();
            }}
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <strong className="block">Studio Newsletter</strong>
            <span className="text-xs text-muted-foreground">
              {changed
                ? "Modifications à appliquer au brouillon"
                : "Éditeur visuel · Logisorama"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Annuler la modification"
            disabled={!history.undo}
            onClick={() => editor.current?.UndoManager.undo()}
          >
            <Undo2 size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Rétablir la modification"
            disabled={!history.redo}
            onClick={() => editor.current?.UndoManager.redo()}
          >
            <Redo2 size={18} />
          </Button>
          {(["Desktop", "Mobile"] as const).map((d) => (
            <Button
              key={d}
              size="icon"
              aria-label={d === "Desktop" ? "Vue ordinateur" : "Vue mobile"}
              variant={device === d ? "secondary" : "ghost"}
              onClick={() => {
                setDevice(d);
                editor.current?.setDevice(d);
              }}
            >
              {d === "Desktop" ? (
                <Monitor size={18} />
              ) : (
                <Smartphone size={18} />
              )}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              if (preview) editor.current?.stopCommand("preview");
              else editor.current?.runCommand("preview");
              setPreview(!preview);
            }}
          >
            {preview ? "Revenir à l’édition" : "Aperçu"}
          </Button>
          <Button
            variant="outline"
            aria-label="Exporter le HTML"
            disabled={!ready}
            onClick={() => {
              try {
                const u = URL.createObjectURL(
                  new Blob([exportHtml()], { type: "text/html" }),
                );
                const a = document.createElement("a");
                a.href = u;
                a.download = "newsletter-logisorama.html";
                a.click();
                URL.revokeObjectURL(u);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Download size={16} />
          </Button>
          <Button
            disabled={!ready || uploading}
            onClick={() => {
              try {
                onApply(exportHtml());
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Save className="mr-2" size={16} />
            Appliquer au brouillon
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          className={`w-[240px] shrink-0 overflow-auto border-r bg-white ${preview ? "hidden" : ""}`}
        >
          <div className="sticky top-0 z-10 grid grid-cols-2 border-b bg-white p-2">
            <Button
              variant={panel === "content" ? "secondary" : "ghost"}
              onClick={() => setPanel("content")}
            >
              Contenu
            </Button>
            <Button
              variant={panel === "layers" ? "secondary" : "ghost"}
              onClick={() => setPanel("layers")}
            >
              <Layers size={14} className="mr-1" />
              Structure
            </Button>
          </div>
          <p className="p-3 text-xs text-muted-foreground">
            Glissez un bloc dans l’email. Double-cliquez sur un texte pour le
            modifier.
          </p>
          <div ref={blocks} className={panel === "content" ? "" : "hidden"} />
          <div ref={layers} className={panel === "layers" ? "" : "hidden"} />
        </aside>
        <main className="min-w-0 flex-1">
          <div ref={canvas} />
        </main>
        <aside
          className={`w-[280px] shrink-0 overflow-auto border-l bg-white ${preview ? "hidden" : ""}`}
        >
          <div className="border-b p-3">
            <strong className="flex items-center gap-2">
              <Paintbrush size={16} />
              Réglages du bloc
            </strong>
            <p className="mt-1 text-xs text-muted-foreground">
              Sélectionnez un élément pour régler son lien, ses couleurs et ses
              marges.
            </p>
          </div>
          <div className="flex gap-1 border-b p-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={!selected}
              onClick={() => {
                const c = editor.current?.getSelected();
                if (c) {
                  const copy = c.clone();
                  c.parent()?.append(copy, { at: c.index() + 1 });
                  editor.current?.select(copy);
                }
              }}
            >
              <Copy size={14} className="mr-1" />
              Dupliquer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!selected}
              onClick={() => editor.current?.getSelected()?.remove()}
            >
              <Trash2 size={14} className="mr-1" />
              Retirer
            </Button>
          </div>
          <div ref={traits} />
          <label className="m-3 flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
            <ImagePlus size={16} />
            {uploading ? "Chargement…" : "Importer une image"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              disabled={uploading}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="px-3 text-xs text-muted-foreground">
            Images publiques pour l’email · 5 Mo maximum.
          </p>
          <div ref={styles} />
        </aside>
      </div>
    </div>
  );
}
