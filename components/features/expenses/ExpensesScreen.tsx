import React, { useState, useMemo } from "react";
import { CircleDollarSign, Plus } from "lucide-react";
import { T } from "../../utils/theme";
import { money } from "../../utils/helpers";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { addExpense } from "../../../lib/api";

export function ExpensesScreen() {
  const { expenses, refreshData } = useSchoolData();
  const { schoolId } = useAuth();

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("fournitures");
  const [loading, setLoading] = useState(false);

  const totalDepenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const submit = async () => {
    if (!label || !amount || !schoolId) return;
    setLoading(true);
    try {
      await addExpense({ schoolId, label, amount: Number(amount), category });
      refreshData();
      setLabel("");
      setAmount("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl mb-6 font-serif text-text font-semibold">Dépenses</h1>
      <div className="rounded-lg p-5 border mb-6 border-inkLine bg-inkSoft">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Libellé" value={label} onChange={(e: any) => setLabel(e.target.value)} placeholder="Ex : Fournitures, électricité..." />
          <Field icon={CircleDollarSign} label="Montant (FCFA)" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1.5 rounded-md px-3 py-2.5 border text-sm" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }}>
              <option value="fournitures">Fournitures</option>
              <option value="electricite_eau">Électricité / Eau</option>
              <option value="entretien">Entretien</option>
              <option value="transport">Transport</option>
              <option value="autre">Autre</option>
            </select>
          </label>
        </div>
        <button onClick={submit} disabled={loading} className="mt-4 flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium" style={{ background: loading ? T.inkLine : T.gold, color: T.ink }}>
          {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Plus size={16} />}
          {loading ? "Enregistrement..." : "Enregistrer la dépense"}
        </button>
      </div>

      <p className="text-xs mb-2 text-muted">Total dépenses : <span className="text-rust">{money(totalDepenses)}</span></p>
      <div className="rounded-lg border overflow-hidden border-inkLine">
        {expenses.length === 0 ? (
          <p className="text-sm p-5 text-muted">Aucune dépense enregistrée.</p>
        ) : (
          [...expenses].reverse().map((e: any) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 border-inkLine bg-inkSoft">
              <div>
                <p className="text-sm text-text">{e.label}</p>
                <p className="text-xs mt-0.5 capitalize text-muted">{e.category.replace("_", " / ")} — {new Date(e.date).toLocaleDateString("fr-FR")}</p>
              </div>
              <p className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>-{money(e.amount)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
