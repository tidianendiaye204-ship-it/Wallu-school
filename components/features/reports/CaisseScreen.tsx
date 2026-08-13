import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { T } from "../../utils/theme";
import { money } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";

export function CaisseScreen() {
  const { receipts, staffPayments, expenses } = useSchoolData();

  const movements = useMemo(() => {
    const list = [
      ...receipts.map((r: any) => ({
        id: r.id, date: new Date(), label: `${r.student} — ${r.kind === "inscription" ? "Inscription" : "Mensualité"} (${r.className})`,
        amount: r.amountPaid, type: "entree",
      })),
      ...staffPayments.map((p: any) => ({
        id: p.id, date: new Date(), label: `Salaire — ${p.name}`, amount: p.amount, type: "sortie",
      })),
      ...expenses.map((e: any) => ({
        id: e.id, date: new Date(e.date), label: e.label, amount: e.amount, type: "sortie",
      })),
    ];
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [receipts, staffPayments, expenses]);

  let running = 0;
  const withBalance = [...movements].reverse().map((m) => {
    running += m.type === "entree" ? m.amount : -m.amount;
    return { ...m, balance: running };
  }).reverse();

  const handleExportCSV = () => {
    let csvContent = "Date,Description,Entree,Sortie,Solde\n";
    withBalance.forEach(row => {
      const dateStr = new Date(row.date).toLocaleDateString("fr-FR");
      const desc = `"${row.label.replace(/"/g, '""')}"`;
      const entree = row.type === "entree" ? row.amount : "";
      const sortie = row.type === "sortie" ? row.amount : "";
      const balance = row.balance;
      csvContent += `${dateStr},${desc},${entree},${sortie},${balance}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_caisse_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Journal de caisse</h1>
        {withBalance.length > 0 && (
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs rounded-md px-3 py-2" style={{ background: T.inkSoft, color: T.text, border: `1px solid ${T.inkLine}` }}>
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>
      <p className="text-xs mb-6" style={{ color: T.muted }}>Toutes les entrées et sorties, dans l'ordre — la vraie photo de la caisse.</p>
      {withBalance.length === 0 ? (
        <p className="text-sm" style={{ color: T.muted }}>Aucun mouvement pour l'instant.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: T.inkLine }}>
          {withBalance.map((m) => (
            <div key={m.type + m.id} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
              <div>
                <p className="text-sm" style={{ color: T.text }}>{m.label}</p>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>{m.date.toLocaleDateString("fr-FR")} · solde : {money(m.balance)}</p>
              </div>
              <p className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: m.type === "entree" ? T.green : T.rust }}>
                {m.type === "entree" ? "+" : "-"}{money(m.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
