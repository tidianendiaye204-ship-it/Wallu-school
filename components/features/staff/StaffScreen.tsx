import React, { useState } from "react";
import { GraduationCap, UserPlus, X, User, Phone, CircleDollarSign, Plus, Check } from "lucide-react";
import { T } from "../../utils/theme";
import { money, currentPeriod } from "../../utils/helpers";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { addStaff, paySalary } from "../../../lib/api";
import { useNotifications } from "../../contexts/NotificationContext";

export function StaffScreen() {
  const { staff, staffPayments, refreshData, setRlsError } = useSchoolData();
  const { schoolId } = useAuth();
  const { addToast, addNotification } = useNotifications();
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("professeur");
  const [salary, setSalary] = useState("");
  const [phone, setPhone] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState("");

  const period = currentPeriod();

  const submitForm = async () => {
    if (!name.trim()) { setFormError("Le nom est obligatoire."); return; }
    if (!salary || Number(salary) <= 0) { setFormError("Le salaire doit être supérieur à 0."); return; }
    if (!schoolId) return;

    setFormError("");
    setFormLoading(true);
    
    try {
      await addStaff({ schoolId, fullName: name.trim(), role, monthlySalary: Number(salary), phone: phone.trim() });
      addToast('success', `${name.trim()} a été ajouté avec succès.`, 'Personnel ajouté');
      addNotification({ type: 'success', title: 'Nouveau membre du personnel', message: `${name.trim()} a été ajouté comme ${role}.`, category: 'system' });
      refreshData();
      setName(""); setRole("professeur"); setSalary(""); setPhone("");
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      addToast('error', err?.message || 'Erreur lors de l\'ajout', 'Erreur');
      setFormError(err?.message || "Erreur lors de l'ajout.");
    }
    setFormLoading(false);
  };

  const handlePay = async (m: any) => {
    if (!schoolId) return;
    const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(period.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
    const remaining = m.salary - paidThisMonth;
    if (remaining <= 0) return;
    
    setPayingId(m.id);
    setPayError("");
    
    try {
      await paySalary({ schoolId, staffId: m.id, period, amount: remaining });
      addToast('success', `Salaire de ${money(remaining)} payé à ${m.name}.`, 'Salaire payé');
      addNotification({ type: 'success', title: 'Salaire versé', message: `${money(remaining)} pour ${m.name}.`, category: 'payments' });
      refreshData();
    } catch (err: any) {
      console.error(err);
      addToast('error', err?.message || 'Erreur lors du paiement', 'Erreur');
      setPayError(err?.message || "Erreur lors du paiement.");
    }
    setPayingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-text font-semibold">Personnel</h1>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(""); }}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium"
          style={{ background: T.inkSoft, color: T.text, border: `1px solid ${T.inkLine}` }}
        >
          {showForm ? <><X size={14} /> Annuler</> : <><UserPlus size={14} /> Ajouter un employé</>}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg p-5 border mb-6 border-inkLine bg-inkSoft">
          <p className="text-sm font-medium mb-4 text-text">Nouvel employé / professeur</p>
          {formError && (
            <div className="mb-3 rounded-md px-3 py-2.5 text-xs" style={{ background: "#2D1A1A", color: T.rust, border: `1px solid ${T.rust}` }}>
              ⚠ {formError}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field icon={User} label="Nom complet" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ex : Moussa Diallo" />
            <Field icon={Phone} label="Téléphone (optionnel)" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="77 000 00 00" />
            <div>
              <span className="text-xs uppercase tracking-wide block mb-1.5 text-muted">Rôle / Poste</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md px-3 py-2.5 border text-sm" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }}>
                <option value="professeur">Professeur</option>
                <option value="directeur">Directeur</option>
                <option value="administration">Administration</option>
                <option value="gardien">Gardien</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <Field icon={CircleDollarSign} label="Salaire mensuel (FCFA)" type="number" value={salary} onChange={(e: any) => setSalary(e.target.value)} placeholder="Ex : 150000" />
          </div>
          <button
            onClick={submitForm}
            disabled={formLoading}
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium"
            style={{ background: formLoading ? T.inkLine : T.gold, color: T.ink, cursor: formLoading ? "not-allowed" : "pointer" }}
          >
            {formLoading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Plus size={16} />}
            {formLoading ? "Enregistrement..." : "Ajouter l'employé"}
          </button>
        </div>
      )}

      {payError && (
        <div className="mb-4 rounded-md px-3 py-2.5 text-xs" style={{ background: "#2D1A1A", color: T.rust, border: `1px solid ${T.rust}` }}>
          ⚠ {payError}
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-lg p-8 border text-center border-inkLine bg-inkSoft">
          <GraduationCap size={32} style={{ color: T.muted, margin: "0 auto 12px" }} />
          <p className="text-sm mb-1 text-text">Aucun professeur enregistré</p>
          <p className="text-xs mb-4 text-muted">Ajoutez votre équipe pour suivre les paiements de salaires.</p>
          <button onClick={() => setShowForm(true)} className="rounded-md px-4 py-2 text-sm font-medium mx-auto flex items-center justify-center gap-1.5 bg-gold text-ink">
            <UserPlus size={14} /> Ajouter un employé
          </button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden border-inkLine">
          {staff.map((m: any) => {
            const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(period.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
            const remaining = m.salary - paidThisMonth;
            const isPaying = payingId === m.id;
            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-4 border-b last:border-b-0 border-inkLine bg-inkSoft">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium truncate text-text">{m.name}</p>
                  <p className="text-xs mt-0.5 capitalize text-muted">
                    {m.role} · Salaire&nbsp;
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>{money(m.salary)}</span>
                  </p>
                  {paidThisMonth > 0 && paidThisMonth < m.salary && (
                    <p className="text-xs mt-0.5 text-rust">Acompte versé : {money(paidThisMonth)} · Reste {money(remaining)}</p>
                  )}
                </div>
                {remaining <= 0 ? (
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "rgba(63,143,108,0.12)" }}>
                    <Check size={13} className="text-green" />
                    <span className="text-xs font-medium text-green">Payé</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handlePay(m)}
                    disabled={isPaying}
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium shrink-0"
                    style={{ background: isPaying ? T.inkLine : T.gold, color: T.ink, cursor: isPaying ? "not-allowed" : "pointer" }}
                  >
                    {isPaying
                      ? <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      : <CircleDollarSign size={13} />
                    }
                    {isPaying ? "..." : `Payer ${money(remaining)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
