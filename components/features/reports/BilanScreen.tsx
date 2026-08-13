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
      <h1 className="text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Bilan — {period}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <p className="text-xs mb-1" style={{ color: T.muted }}>Mensualités encaissées</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.green }}>{money(totalEncaisse)}</p>
        </div>
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <p className="text-xs mb-1" style={{ color: T.muted }}>Inscriptions encaissées</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.green }}>{money(totalInscriptions)}</p>
        </div>
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <p className="text-xs mb-1" style={{ color: T.muted }}>Salaires versés</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>{money(totalSalaires)}</p>
        </div>
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <p className="text-xs mb-1" style={{ color: T.muted }}>Autres dépenses</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>{money(totalDepenses)}</p>
        </div>
        <div className="rounded-lg p-5 border sm:col-span-2 lg:col-span-1" style={{ borderColor: T.gold, background: T.inkSoft }}>
          <p className="text-xs mb-1" style={{ color: T.muted }}>Solde net</p>
          <p className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>
            {money(totalEncaisse + totalInscriptions - totalSalaires - totalDepenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
