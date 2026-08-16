import React, { useState } from "react";
import Papa from "papaparse";
import { ChevronLeft, UserPlus, Receipt, CircleDollarSign, CheckCircle, DownloadCloud, Upload, Trash2 } from "lucide-react";
import { T } from "../../utils/theme";
import { money, currentPeriod, exportCSV, getCurrentAcademicPeriod } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { AddStudentModal } from "../students/AddStudentModal";
import { PayModal } from "../payments/PayModal";
import { InscriptionPayModal } from "../payments/InscriptionPayModal";
import { recordStudentPayment, generateMissingReceipts, addClass, addStudent, deleteStudent } from "../../../lib/api";
import { useNotifications } from "../../contexts/NotificationContext";

export function ClassesScreen({ onGoToSettings, onGoToReceipts }: { onGoToSettings?: () => void; onGoToReceipts?: () => void }) {
  const { classes, students, classMap, receipts, setRlsError, refreshData, isGenerating, setIsGenerating, bulkProgress, setBulkProgress } = useSchoolData();
  const { schoolId } = useAuth();
  const { addToast, addNotification } = useNotifications();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const period = getCurrentAcademicPeriod();

  // Local Modal States
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [payModal, setPayModal] = useState<any>(null);
  const [inscriptionModal, setInscriptionModal] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<{ count: number } | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Vérifie si un élève a déjà un reçu ce mois
  const studentHasReceipt = (studentName: string) => {
    const currentMonth = new Date().toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" });
    return receipts.some((r: any) => r.student === studentName && r.receiptNumber);
  };

  const bulkGenerate = async () => {
    if (!schoolId) return;
    setIsGenerating(true);
    setSuccessMessage(null);
    let completed = 0;
    const promises = [];
    const targetStudents = Array.from(selected).map(id => students.find(s => s.id === id)).filter(Boolean);

    for (const student of targetStudents) {
      if (!student) continue;
      const cls = classMap.get(student.classId);
      if (!cls) continue;
      
      const due = student.dues?.find((d: any) => d.period === period);
      const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
      
      if (remaining > 0) {
        const p = recordStudentPayment({
          schoolId,
          studentId: student.id,
          amount: remaining,
          method: "especes"
        }).then(() => {
          completed += 1;
          setBulkProgress(completed / targetStudents.length);
        });
        promises.push(p);
      } else {
        // L'élève a déjà payé, on vérifie juste qu'il a bien un reçu
        const p = generateMissingReceipts(schoolId, [student.id]).then(() => {
          completed += 1;
          setBulkProgress(completed / targetStudents.length);
        });
        promises.push(p);
      }
    }

    try {
      await Promise.all(promises);
      addToast('success', `${targetStudents.length} reçu(s) généré(s) avec succès.`, 'Opération terminée');
      addNotification({ type: 'success', title: 'Reçus générés', message: `${targetStudents.length} reçu(s) généré(s).`, category: 'system' });
      refreshData();
      setSuccessMessage({ count: targetStudents.length });
    } catch (err: any) {
      console.error(err);
      addToast('error', err?.message || 'Erreur lors de la génération', 'Erreur');
      setRlsError({ message: "Erreur lors de la génération", details: err?.message });
    }

    setSelected(new Set());
    setIsGenerating(false);
  };

  const handleExportCSV = () => {
    const data = students.map(s => {
      const cls = classMap.get(s.classId);
      const paid = s.dues?.reduce((sum: number, d: any) => sum + d.amountAllocated, 0) || 0;
      const totalDue = s.dues?.reduce((sum: number, d: any) => sum + d.amountDue, 0) || 0;
      return {
        "Nom de l'élève": s.name,
        "Classe": cls?.name || "Inconnue",
        "Téléphone Parent": s.parentPhone || "",
        "Scolarité Payée (F)": paid,
        "Scolarité Due (F)": totalDue,
        "Inscription Payée (F)": s.inscriptionPaid || 0
      };
    });
    exportCSV(data, `eleves_wallu_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;

    setIsGenerating(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let classesCreated = 0;
          let studentsAdded = 0;
          
          // Map pour garder trace des classes créées ou existantes
          const localClassMap = new Map<string, string>();
          classes.forEach(c => localClassMap.set(c.name.toLowerCase(), c.id));

          for (const row of rows) {
            const studentName = row["Nom de l'élève"] || row["Nom"] || row["student"];
            const className = row["Classe"] || row["class"];
            const phone = row["Téléphone Parent"] || row["Téléphone"] || row["phone"] || "";

            if (!studentName || !className) continue;

            let cid = localClassMap.get(className.toLowerCase());
            if (!cid) {
              // Créer la classe
              const newClass = await addClass({
                schoolId,
                name: className,
                monthlyFee: 0,
                inscriptionFee: 0,
                academicYear: "2025-2026"
              });
              cid = newClass.id;
              localClassMap.set(className.toLowerCase(), newClass.id);
              classesCreated++;
            }

            // Ajouter l'élève s'il n'existe pas déjà (par nom)
            const exists = students.some(s => s.name.toLowerCase() === studentName.toLowerCase() && s.classId === cid);
            if (!exists) {
              await addStudent({
                schoolId,
                classId: cid,
                fullName: studentName,
                parentPhone: phone
              });
              studentsAdded++;
            }
          }
          
          addToast('success', `${studentsAdded} élèves et ${classesCreated} classes importés.`, 'Importation réussie');
          refreshData();
        } catch (err: any) {
          console.error(err);
          addToast('error', err?.message || 'Erreur lors de l\'importation', 'Erreur');
        } finally {
          setIsGenerating(false);
          if (e.target) e.target.value = ''; // reset input
        }
      }
    });
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!schoolId) return;
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${studentName} ? Cette action est irréversible et supprimera tout son historique de paiements.`)) {
      try {
        await deleteStudent(studentId, schoolId);
        addToast('success', `${studentName} a été supprimé.`, 'Suppression réussie');
        addNotification({ type: 'success', title: 'Élève supprimé', message: `${studentName} a été supprimé.`, category: 'system' });
        refreshData();
      } catch (err: any) {
        console.error(err);
        addToast('error', err?.message || 'Erreur lors de la suppression', 'Erreur');
      }
    }
  };

  if (!selectedClass) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif text-text font-semibold">Classes</h1>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border hover:bg-opacity-80 cursor-pointer" style={{ borderColor: T.inkLine, color: T.text, background: T.inkSoft }}>
              <Upload size={16} className="text-gold" />
              <span className="hidden sm:inline">{isGenerating ? "Import..." : "Importer CSV"}</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={isGenerating} />
            </label>
            {classes.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border hover:bg-opacity-80"
                style={{ borderColor: T.inkLine, color: T.text, background: T.inkSoft }}
              >
                <DownloadCloud size={16} className="text-gold" />
                <span className="hidden sm:inline">Exporter CSV</span>
              </button>
            )}
          </div>
        </div>
        {classes.length === 0 ? (
          <div className="rounded-lg p-5 border text-center border-inkLine bg-inkSoft">
            <p className="text-sm mb-4 text-muted">Vous n'avez pas encore créé de classe.</p>
            <button 
              onClick={onGoToSettings} 
              className="rounded-md px-4 py-2 text-sm font-medium mx-auto block hover:opacity-90 transition-opacity bg-gold text-ink"
            >
              Aller dans les paramètres pour ajouter une classe
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {classes.map((c) => {
              const classStudents = students.filter((s) => s.classId === c.id);
              const paid = classStudents.reduce((sum, s) => sum + (s.dues.find((d: any) => period.startsWith(d.period))?.amountAllocated || 0), 0);
              const due = classStudents.length * c.monthlyFee;
              return (
                <button key={c.id} onClick={() => setSelectedClass(c.id)} className="text-left rounded-lg p-5 border hover:border-opacity-60 transition-colors border-inkLine bg-inkSoft">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-medium text-text">{c.name}</span>
                    <span className="text-xs text-muted">{classStudents.length} élèves</span>
                  </div>
                  <div className="text-xs mb-1 text-muted">Encaissé ce mois</div>
                  <div className="text-lg" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>{money(paid)} <span className="text-xs text-muted">/ {money(due)}</span></div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setSelectedClass(null)} className="flex items-center gap-1 text-sm mb-4 text-muted">
        <ChevronLeft size={16} /> Retour aux classes
      </button>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-text font-semibold">
          {classMap.get(selectedClass)?.name}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setAddStudentModal(true)} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium" style={{ background: T.inkSoft, color: T.text, border: `1px solid ${T.inkLine}` }}>
            <UserPlus size={14} /> Ajouter un élève
          </button>
          {selected.size > 0 && (
            <button onClick={bulkGenerate} disabled={isGenerating} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium" style={{ background: T.gold, color: T.ink, opacity: isGenerating ? 0.6 : 1 }}>
              <Receipt size={14} /> {isGenerating ? "Génération..." : `Générer ${selected.size} reçu${selected.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="rounded-lg p-4 mb-4 flex items-center justify-between" style={{ background: "#0d3320", border: `1px solid ${T.green}` }}>
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green" />
            <div>
              <p className="text-sm font-medium text-green">
                {successMessage.count} reçu{successMessage.count > 1 ? "s" : ""} généré{successMessage.count > 1 ? "s" : ""} avec succès !
              </p>
              <p className="text-xs mt-0.5 text-muted">
                Allez dans l'onglet Reçus pour les imprimer ou les télécharger.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setSuccessMessage(null); onGoToReceipts?.(); }} 
              className="rounded-md px-3 py-1.5 text-xs font-medium" 
              style={{ background: T.green, color: T.ink }}
            >
              Voir les reçus
            </button>
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="rounded-md px-3 py-1.5 text-xs font-medium" 
              style={{ color: T.muted, border: `1px solid ${T.inkLine}` }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <p className="text-xs mb-3 text-muted">Cochez les élèves puis cliquez sur « Générer » pour créer leurs reçus du mois.</p>
      
      <div className="rounded-lg border overflow-hidden border-inkLine">
        {students.filter((s) => s.classId === selectedClass).map((s) => {
          const cls = classMap.get(s.classId);
          const currentRealPeriod = currentPeriod();
          const totalArrears = s.dues.reduce((sum: number, d: any) => d.period <= period ? sum + (d.amountDue - d.amountAllocated) : sum, 0);
          const strictArrears = s.dues.reduce((sum: number, d: any) => d.period < currentRealPeriod ? sum + (d.amountDue - d.amountAllocated) : sum, 0);
          const advanceMonths = s.dues.filter((d: any) => d.period > period && d.amountAllocated > 0).length;
          
          let paymentStatus = "Mensualité à jour";
          let paymentColor = T.green;
          
          if (strictArrears > 0) {
            const monthsCount = Math.ceil(strictArrears / (cls.monthlyFee || 1));
            paymentStatus = `Retard : ${monthsCount} mois (${money(totalArrears)})`;
            paymentColor = T.rust;
          } else if (totalArrears > 0) {
            paymentStatus = `À payer : ${money(totalArrears)}`;
            paymentColor = "#EAB308"; // Jaune/Orange pour "à payer" sans être en retard
          } else if (advanceMonths > 0) {
            paymentStatus = `Avance : ${advanceMonths} mois`;
          }

          const inscriptionSolde = cls.inscriptionFee - (s.inscriptionPaid || 0);
          const hasReceipt = studentHasReceipt(s.name);
          return (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 border-b last:border-b-0 border-inkLine bg-inkSoft">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 accent-current" style={{ accentColor: T.gold }} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-text">{s.name}</p>
                    {hasReceipt && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "#0d3320", color: T.green, border: `1px solid ${T.green}33` }}>
                        <CheckCircle size={10} /> Reçu ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: paymentColor }}>
                    {paymentStatus}
                    {" · "}
                    <span style={{ color: inscriptionSolde > 0 ? T.rust : T.green }}>
                      {inscriptionSolde > 0 ? `Inscription : ${money(inscriptionSolde)} restant` : "Inscription réglée"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {inscriptionSolde > 0 && (
                  <button onClick={() => setInscriptionModal(s)} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium" style={{ background: T.inkSoft, color: T.gold, border: `1px solid ${T.inkLine}` }}>
                    Inscription
                  </button>
                )}
                <button onClick={() => setPayModal(s)} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium bg-gold text-ink">
                  <CircleDollarSign size={14} /> Mensualité
                </button>
                <button onClick={() => handleDeleteStudent(s.id, s.name)} className="flex items-center justify-center rounded-md px-2 py-2 transition-colors hover:bg-opacity-80" style={{ background: T.inkSoft, color: T.rust, border: `1px solid ${T.inkLine}` }} title="Supprimer cet élève">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {addStudentModal && (
        <AddStudentModal 
          classId={selectedClass} 
          onClose={() => setAddStudentModal(false)} 
        />
      )}
      
      {payModal && (
        <PayModal
          student={payModal}
          monthlyFee={classMap.get(payModal.classId)?.monthlyFee}
          onClose={() => setPayModal(null)}
        />
      )}

      {inscriptionModal && (
        <InscriptionPayModal
          student={inscriptionModal}
          remaining={(classMap.get(inscriptionModal.classId)?.inscriptionFee || 0) - (inscriptionModal.inscriptionPaid || 0)}
          onClose={() => setInscriptionModal(null)}
        />
      )}
    </div>
  );
}
