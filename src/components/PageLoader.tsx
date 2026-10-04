export function PageLoader() {
  return (
    <div className="flex w-full items-start justify-center px-4 py-8" role="status" aria-label="Chargement de la page">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
