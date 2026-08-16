import React from "react";
import { AlertCircle } from "lucide-react";
import { T } from "../utils/theme";

export function RlsErrorModal({ error, onClose }: { error: any; onClose: () => void }) {
  if (!error) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-lg p-6 max-w-md w-full mx-4 border shadow-2xl" style={{ background: T.inkSoft, borderColor: T.inkLine }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={20} className="text-rust" />
          <h3 className="text-lg font-semibold" style={{ color: T.text, fontFamily: "'Fraunces', serif" }}>Erreur d'accès</h3>
        </div>
        <p className="text-sm mb-4 text-text">{error.message}</p>
        <details className="mb-4">
          <summary className="text-xs cursor-pointer hover:underline text-gold">Voir détails techniques</summary>
          <pre className="mt-2 p-3 rounded text-xs overflow-auto" style={{ background: '#0C1626', color: T.muted, maxHeight: 160 }}>{error.details || 'Aucun détail disponible.'}</pre>
        </details>
        <a href={error.docLink || '/docs/rls-policy'} target="_blank" rel="noopener noreferrer" className="text-xs underline block mb-4 text-gold">
          Consulter la documentation interne
        </a>
        <button onClick={onClose} className="w-full rounded-md py-2 text-sm font-medium" style={{ background: T.inkLine, color: T.text }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
