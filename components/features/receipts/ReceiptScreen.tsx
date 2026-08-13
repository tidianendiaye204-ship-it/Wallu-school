import React, { useState } from "react";
import { Search, Printer, Download, Send, X } from "lucide-react";
import { T } from "../../utils/theme";
import { money, downloadReceiptPDF } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { ReceiptCard } from "./ReceiptCard";

export function ReceiptScreen() {
  const { receipts } = useSchoolData();
  const { schoolName, schoolLogo, schoolStamp } = useAuth();
  const [receiptSearch, setReceiptSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const whatsappLink = (r: any) => {
    if (!r.phone) return "#";
    const text = encodeURIComponent(
      `Bonjour, voici le reçu de ${r.kind === "inscription" ? "frais d'inscription" : "mensualité"} pour ${r.student} (${r.className}). Montant payé : ${money(r.amountPaid)}. Merci — ${schoolName}`
    );
    return `https://wa.me/${r.phone}?text=${text}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Reçus</h1>
          <p className="text-sm" style={{ color: T.muted }}>Historique des paiements</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
            <input
              type="text"
              placeholder="Rechercher élève ou reçu..."
              value={receiptSearch}
              onChange={e => setReceiptSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md text-sm border focus:outline-none"
              style={{ background: "#0C1626", borderColor: T.inkLine, color: T.text }}
            />
          </div>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap" style={{ background: T.gold, color: T.ink }}>
            <Printer size={16} /> Imprimer les reçus affichés
          </button>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-dashed" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <p className="text-sm" style={{ color: T.muted }}>Aucun reçu n'a été généré pour le moment.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 print:hidden">
          {receipts
            .filter((r: any) => {
              const term = receiptSearch.toLowerCase();
              return (
                r.student?.toLowerCase().includes(term) ||
                r.receiptNumber?.toLowerCase().includes(term)
              );
            })
            .map((r: any) => (
            <div key={r.id} className="rounded-lg p-4 border flex items-center justify-between" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
              <div>
                <p className="text-sm" style={{ color: T.text }}>{r.student}</p>
                <p className="text-xs" style={{ color: T.muted }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.receiptNumber}</span> • {money(r.amountPaid)} — {r.className}{r.kind === "inscription" ? " (ins.)" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedReceipt(r)} className="text-xs px-2 py-1.5 rounded" style={{ color: T.gold, border: `1px solid ${T.inkLine}` }}>Voir</button>
                <button onClick={() => downloadReceiptPDF(r, schoolName, schoolLogo, schoolStamp)} className="text-xs px-2 py-1.5 rounded" style={{ color: T.text, border: `1px solid ${T.inkLine}` }} title="Télécharger PDF">
                  <Download size={14} /> PDF
                </button>
                <a href={whatsappLink(r)} target="_blank" rel="noreferrer" className="text-xs px-2 py-1.5 rounded flex items-center gap-1" style={{ background: T.green, color: T.ink }}>
                  <Send size={12} /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-[rgba(0,0,0,0.6)] print:!bg-transparent print:p-0 print:items-start">
          <div className="relative w-full flex justify-center print:shadow-none">
            <button onClick={() => setSelectedReceipt(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white no-print"><X size={22} /></button>
            <div id="print-area">
              <ReceiptCard 
                school={schoolName} 
                student={selectedReceipt.student} 
                className={selectedReceipt.className} 
                amountDue={selectedReceipt.amountDue} 
                amountPaid={selectedReceipt.amountPaid} 
                carried={selectedReceipt.carried} 
                nextPeriodLabel={selectedReceipt.nextPeriodLabel} 
                manque={selectedReceipt.manque} 
                method={selectedReceipt.method} 
                receiptNumber={selectedReceipt.receiptNumber} 
              />
            </div>
            <div className="flex gap-3 mt-4 justify-center flex-wrap no-print">
              <a href={whatsappLink(selectedReceipt)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium" style={{ background: T.green, color: T.ink }}>
                <Send size={14} /> Envoyer sur WhatsApp
              </a>
              <button onClick={() => downloadReceiptPDF(selectedReceipt, schoolName, schoolLogo, schoolStamp)} className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium" style={{ background: T.paper, color: T.ink }}>
                <Download size={14} /> Télécharger PDF
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium" style={{ background: T.gold, color: T.ink }}>
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Zone d'impression de TOUS les reçus quand on clique sur Imprimer tout */}
      {!selectedReceipt && (
        <div id="print-area" className="hidden print:block text-center">
          {receipts
            .filter((r: any) => {
              const term = receiptSearch.toLowerCase();
              return (
                r.student?.toLowerCase().includes(term) ||
                r.receiptNumber?.toLowerCase().includes(term)
              );
            })
            .map((r: any) => (
            <div key={r.id} className="receipt-print break-inside-avoid mb-4">
              <ReceiptCard 
                school={schoolName} 
                student={r.student} 
                className={r.className} 
                amountDue={r.amountDue} 
                amountPaid={r.amountPaid} 
                carried={r.carried} 
                nextPeriodLabel={r.nextPeriodLabel} 
                manque={r.manque} 
                method={r.method} 
                receiptNumber={r.receiptNumber} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
