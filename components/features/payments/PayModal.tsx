import React, { useState, useMemo, useEffect } from "react";
import { X, CircleDollarSign, Plus } from "lucide-react";
import { T } from "../../utils/theme";
import { money, currentPeriod, allocatePayment } from "../../utils/helpers";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { recordStudentPayment } from "../../../lib/api";
import { useNotifications } from "../../contexts/NotificationContext";

export function PayModal({ student, monthlyFee, onClose }: { student: any; monthlyFee: number; onClose: () => void }) {
  const { setRlsError, refreshData } = useSchoolData();
  const { schoolId } = useAuth();
  const { addToast, addNotification } = useNotifications();
  
  const [amount, setAmount] = useState("");
  
  useEffect(() => {
    // Calculer le solde total dû jusqu'au mois en cours
    const p = currentPeriod();
    const solde = student.dues?.reduce((sum: number, d: any) => d.period <= p ? sum + (d.amountDue - d.amountAllocated) : sum, 0) || 0;
    setAmount(String(solde > 0 ? solde : monthlyFee));
  }, [student, monthlyFee]);

  const numAmount = Number(amount) || 0;
  
  const simulation = useMemo(() => {
    if (numAmount <= 0) return null;
    return allocatePayment(student.dues || [], monthlyFee, numAmount);
  }, [numAmount, student.dues, monthlyFee]);
  const [method, setMethod] = useState<"especes" | "wave" | "orange_money" | "virement">("especes");

  const onSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!schoolId) return;

    try {
      await recordStudentPayment({ schoolId, studentId: student.id, amount: numAmount, method });
      addToast('success', `Paiement de ${money(numAmount)} enregistré pour ${student.name}.`, 'Paiement réussi');
      addNotification({ type: 'success', title: 'Paiement reçu', message: `${money(numAmount)} de ${student.name}.`, category: 'payments' });
      refreshData();
      
      // Receipt generation logic is currently handled in WalluSchoolApp.
      // We might need a central place or context to push new receipts if we want to show them immediately,
      // but refreshData() will fetch the new receipts anyway.
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message?.includes("row-level security")
        ? "Policy RLS manquante / utilisateur non membre de l'école / school_users absent"
        : (err?.message || "Erreur inconnue.");
      
      addToast('error', msg, 'Erreur de paiement');
      setRlsError({ message: msg, details: err?.message, docLink: "/docs/rls-policy" });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-lg p-6 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Paiement — {student.name}</h3>
          <button onClick={onClose} style={{ color: T.muted }}><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: T.muted }}>Mensualité de base : {money(monthlyFee)}</p>
        
        <div className="space-y-4">
          <Field icon={CircleDollarSign} label="Montant reçu (FCFA)" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          
          {simulation && simulation.allocations.length > 0 && (
            <div className="rounded-md p-3 text-sm" style={{ background: "#0d3320", border: `1px solid ${T.green}33` }}>
              <p className="font-medium mb-2" style={{ color: T.green }}>Ce paiement couvrira :</p>
              <ul className="space-y-1.5">
                {simulation.allocations.map((a: any, i: number) => {
                  const due = simulation.newDues.find((d: any) => d.period === a.period);
                  const isPartial = due && (due.amountDue - due.amountAllocated > 0);
                  const formatP = (periodStr: string) => {
                    const [y, m] = periodStr.split("-").map(Number);
                    const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
                    return `${months[m - 1]} ${y}`;
                  };
                  return (
                    <li key={i} className="flex justify-between items-center text-xs">
                      <span style={{ color: T.green }}>{formatP(a.period)}</span>
                      <div className="flex gap-2">
                        <span style={{ color: T.green }}>{money(a.amount)}</span>
                        {isPartial ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: T.gold, color: T.ink }}>Partiel</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: T.green, color: T.ink }}>Soldé</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {simulation.remaining > 0 && (
                <p className="text-xs mt-3 pt-2 border-t" style={{ borderColor: `${T.green}33`, color: T.gold }}>
                  Excédent reporté : {money(simulation.remaining)}
                </p>
              )}
            </div>
          )}
          
          <label className="block">
            <span className="text-xs uppercase tracking-wide" style={{ color: T.muted }}>Moyen de paiement</span>
            <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full mt-1.5 rounded-md px-3 py-2.5 border text-sm" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }}>
              <option value="especes">Espèces</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
            </select>
          </label>
        </div>

        <button onClick={onSubmit} className="w-full mt-6 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ background: T.gold, color: T.ink }}>
          <Plus size={16} /> Valider le paiement
        </button>
      </div>
    </div>
  );
}
