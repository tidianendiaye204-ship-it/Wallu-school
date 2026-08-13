import React, { useMemo } from "react";
import { Check, Send } from "lucide-react";
import { T } from "../../utils/theme";
import { money, currentPeriod } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";

export function RecouvrementScreen() {
  const { students, classes } = useSchoolData();
  const period = currentPeriod();

  const impayes = useMemo(() => {
    const classLookup = new Map<string, any>(classes.map((c: any) => [c.id, c]));
    const list: any[] = [];
    for (const s of students) {
      if (!s.classId) continue;
      const cls = classLookup.get(s.classId);
      if (!cls) continue;

      let arrears = 0;
      let missingCurrentMonth = true;

      if (s.dues) {
        for (const due of s.dues) {
          if (due.period === period) missingCurrentMonth = false;
          if (due.amountDue > due.amountAllocated) {
            arrears += (due.amountDue - due.amountAllocated);
          }
        }
      }

      if (missingCurrentMonth) {
        arrears += cls.monthlyFee;
      }

      if (arrears > 0) {
        list.push({ student: s, className: cls.name, arrears });
      }
    }
    return list.sort((a, b) => b.arrears - a.arrears);
  }, [students, classes, period]);

  const totalArrears = impayes.reduce((sum, item) => sum + item.arrears, 0);

  const formatWhatsApp = (studentName: string, className: string, amount: number) => {
    const text = encodeURIComponent(
      `Bonjour, sauf erreur de notre part, il reste un solde de scolarité de ${money(amount)} concernant ${studentName} (${className}). Merci de bien vouloir régulariser la situation.`
    );
    return text;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Impayés de scolarité</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <div className="text-xs mb-1" style={{ color: T.muted }}>Total attendu en retard</div>
          <div className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>
            {money(totalArrears)}
          </div>
        </div>
        <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <div className="text-xs mb-1" style={{ color: T.muted }}>Élèves concernés</div>
          <div className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.text }}>
            {impayes.length}
          </div>
        </div>
      </div>

      {impayes.length === 0 ? (
        <div className="rounded-lg p-8 border text-center" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <Check size={32} style={{ color: T.green, margin: "0 auto 12px" }} />
          <p className="text-sm mb-1" style={{ color: T.text }}>Super ! Aucun retard de scolarité.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: T.inkLine }}>
          {impayes.map((item) => (
            <div key={item.student.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b last:border-b-0 gap-3" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium truncate" style={{ color: T.text }}>{item.student.name}</p>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>Classe : {item.className}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: T.rust }}>Reste à payer : {money(item.arrears)}</p>
              </div>
              
              {item.student.parentPhone && (
                <a 
                  href={`https://wa.me/${item.student.parentPhone}?text=${formatWhatsApp(item.student.name, item.className, item.arrears)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium shrink-0"
                  style={{ background: T.green, color: T.ink }}
                >
                  <Send size={13} /> Relancer sur WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
