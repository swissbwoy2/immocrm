import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import Newsletter from "../../../src/pages/admin/Newsletter";
import "../../../src/index.css";
createRoot(document.getElementById("root")!).render(
  <>
    <div className="bg-amber-100 p-2 text-center text-sm">
      Démonstration locale · contacts fictifs · aucun email envoyé
    </div>
    <Newsletter />
    <Toaster />
  </>,
);
