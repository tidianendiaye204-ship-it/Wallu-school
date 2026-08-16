import React, { useMemo } from "react";
import { T } from "../../utils/theme";
import { money, currentPeriod } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";

export function BilanScreen() {
  const { students, staffPayments, expenses } = useSchoolData();
  const period = currentPeriod();

  const totalEncaisse = useMemo(
    () => students.reduce((sum: any, s: any) => sum + s.dues.reduce((a: any, d: any) => a + d.amountAllocated, 0), 0),
    [students]
  );
  
  const totalInscriptions = useMemo(
    () => students.reduce((sum: any, s: any) => sum + (s.inscriptionPaid || 0), 0),
    [students]
  );
  
  const totalSalaires = useMemo(
    () => staffPayments.reduce((a: any, p: any) => a + p.amount, 0),
    [staffPayments]
  );
  
  const totalDepenses = useMemo(
    () => expenses.reduce((a: any, e: any) => a + e.amount, 0),
    [expenses]
  );

  return (
    <div>
      <h1 className="text-2xl mb-6 font-serif text-text font-semibold">Bilan — {period}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg p-5 border border-inkLine bg-inkSoft">
          <p className="text-xs mb-1 text-muted">Mensualités encaissées</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.green }}>{money(totalEncaisse)}</p>
        </div>
        <div className="rounded-lg p-5 border border-inkLine bg-inkSoft">
          <p className="text-xs mb-1 text-muted">Inscriptions encaissées</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.green }}>{money(totalInscriptions)}</p>
        </div>
        <div className="rounded-lg p-5 border border-inkLine bg-inkSoft">
          <p className="text-xs mb-1 text-muted">Salaires versés</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>{money(totalSalaires)}</p>
        </div>
        <div className="rounded-lg p-5 border border-inkLine bg-inkSoft">
          <p className="text-xs mb-1 text-muted">Autres dépenses</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>{money(totalDepenses)}</p>
        </div>
        <div className="rounded-lg p-5 border sm:col-span-2 lg:col-span-1" style={{ borderColor: T.gold, background: T.inkSoft }}>
          <p className="text-xs mb-1 text-muted">Solde net</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>
            {money(totalEncaisse + totalInscriptions - totalSalaires - totalDepenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
