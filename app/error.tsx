"use client";

// Último recurso: cualquier error no capturado por las páginas. El fallo
// esperado —el catálogo de Supabase caído— lo renderizan ellas mismas con
// FaultScreen, para que la avería se vea también en la primera carga.

import { useEffect } from "react";
import { FaultScreen } from "@/components/FaultScreen";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <FaultScreen
      message={error.message}
      digest={error.digest}
      onRetry={retry}
    />
  );
}
