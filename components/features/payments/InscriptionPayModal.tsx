import React, { useState } from "react";
import { X, CircleDollarSign, Plus } from "lucide-react";
import { T } from "../../utils/theme";
import { money } from "../../utils/helpers";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { recordInscriptionPayment } from "../../../lib/api";
import { useNotifications } from "../../contexts/NotificationContext";

export function InscriptionPayModal({ student, remaining, onClose }: { student: any; remaining: number; onClose: () => void }) {
  const { setRlsError, refreshData } = useSchoolData();
  const { schoolId } = useAuth();
  const { addToast, addNotification } = useNotifications();

  const [amount, setAmount] = useState(String(remaining));

  const onSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!schoolId) return;

    try {
      await recordInscriptionPayment({ schoolId, studentId: student.id, amount: numAmount, method: "especes" });
      addToast('success', `Inscription de ${money(numAmount)} payée pour ${student.name}.`, 'Inscription validée');
      addNotification({ type: 'success', title: 'Frais d\'inscription', message: `${money(numAmount)} de ${student.name}.`, category: 'payments' });
      refreshData();
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
          <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Inscription — {student.name}</h3>
          <button onClick={onClose} style={{ color: T.muted }}><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: T.muted }}>Reste dû sur l'inscription : {money(remaining)}</p>
        <Field icon={CircleDollarSign} label="Montant reçu (FCFA)" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
        <button onClick={onSubmit} className="w-full mt-6 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ background: T.gold, color: T.ink }}>
          <Plus size={16} /> Valider et générer le reçu
        </button>
      </div>
    </div>
  );
}
