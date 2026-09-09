"use client";

// Pantalla de avería del salón: se muestra cuando el catálogo de Supabase no
// responde. La renderizan directamente las páginas (server-side, así se ve en
// la primera carga) y también app/error.tsx como último recurso.

import Link from "next/link";

export function FaultScreen({
  message,
  digest,
  onRetry,
}: {
  message: string;
  digest?: string;
  onRetry?: () => void;
}) {
  const retry = () => (onRetry ? onRetry() : window.location.reload());

  return (
    <div className="av-fault">
      <div className="crt av-fault-screen">
        <p className="av-fault-code">
          FALLO 0x{(digest ?? "CATALOGO").slice(0, 8).toUpperCase()}
        </p>

        <h1 className="av-fault-title" data-text="FUERA DE SERVICIO">
          FUERA DE SERVICIO
        </h1>

        <p className="av-fault-body">
          El salón no alcanza su catálogo. Las máquinas siguen enteras — lo que
          falló es la conexión con el servidor de juegos.
        </p>

        <div className="av-fault-actions">
          <button type="button" className="btn" onClick={retry}>
            Reintentar
          </button>
          <Link href="/" className="btn ghost">
            Volver al salón
          </Link>
        </div>

        <p className="av-fault-readout">
          <span className="prompt">&gt;</span>
          {message}
        </p>
      </div>
    </div>
  );
}
