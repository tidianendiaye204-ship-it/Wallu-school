import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { getClasses, getStudents, getStaff, getStaffPayments, getExpenses, getReceipts, getAllStudentPayments, getAllInscriptionPayments } from "../../lib/api";
import { getSchoolCache, saveSchoolCache } from "../../lib/db";
import { useAuth } from "./AuthContext";

interface SchoolDataContextType {
  classes: any[];
  students: any[];
  staff: any[];
  staffPayments: any[];
  expenses: any[];
  receipts: any[];
  studentPayments: any[];
  inscriptionPayments: any[];
  classMap: Map<string, any>;
  studentMap: Map<string, any>;
  isLoading: boolean;
  refreshData: () => void;
  rlsError: { message: string, details?: string, docLink?: string } | null;
  setRlsError: (err: any) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  bulkProgress: number;
  setBulkProgress: (v: number) => void;
  unpaidStudentsCount: number;
  pendingSalariesCount: number;
}

const SchoolDataContext = createContext<SchoolDataContextType | null>(null);

export function SchoolDataProvider({ children }: { children: React.ReactNode }) {
  const { schoolId } = useAuth();
  
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffPayments, setStaffPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [inscriptionPayments, setInscriptionPayments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [rlsError, setRlsError] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const refreshData = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!schoolId) return;
    async function load() {
      setIsLoading(true);

      // 1. Lire immédiatement depuis le cache local (IndexedDB) pour un affichage instantané
      try {
        const cache = await getSchoolCache(schoolId);
        if (cache) {
          setClasses(cache.classes || []);
          setStudents(cache.students || []);
          setStaff(cache.staff || []);
          setStaffPayments(cache.staffPayments || []);
          setExpenses(cache.expenses || []);
          setReceipts(cache.receipts || []);
          setStudentPayments(cache.studentPayments || []);
          setInscriptionPayments(cache.inscriptionPayments || []);
          setIsLoading(false); // L'interface est déjà interactive !
        }
      } catch (err) {
        console.warn("Erreur lecture cache local", err);
      }

      // 2. Fetcher en arrière-plan depuis Supabase (Stale-While-Revalidate)
      try {
        const [cls, stRes, stf, spRes, expRes, rec, allStudentPay, allInscrPay] = await Promise.all([
          getClasses(schoolId),
          getStudents(schoolId),
          getStaff(schoolId),
          getStaffPayments(schoolId),
          getExpenses(schoolId),
          getReceipts(schoolId),
          getAllStudentPayments(schoolId),
          getAllInscriptionPayments(schoolId)
        ]);
        const st = stRes.data;
        const sp = spRes.data;
        const exp = expRes.data;
        setStudentPayments(allStudentPay);
        setInscriptionPayments(allInscrPay);

        const loadedClasses = cls.map((c: any) => ({ id: c.id, name: c.name, monthlyFee: c.monthly_fee, inscriptionFee: c.inscription_fee }));
        setClasses(loadedClasses);
        
        const loadedStudents = st.map((s: any) => {
          const paidInscription = s.student_inscription_payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          return {
            id: s.id,
            name: s.full_name,
            classId: s.class_id,
            parentPhone: s.parent_phone,
            inscriptionPaid: paidInscription,
            dues: s.student_dues?.map((d: any) => ({
              period: d.period.substring(0, 7),
              amountDue: d.amount_due,
              amountAllocated: d.amount_allocated
            })) || []
          };
        });
        setStudents(loadedStudents);
        
        const staffMap = new Map(stf.map((x: any) => [x.id, x.full_name]));
        
        const loadedStaff = stf.map((s: any) => ({ id: s.id, name: s.full_name, role: s.role, salary: s.monthly_salary }));
        setStaff(loadedStaff);

        const loadedStaffPayments = sp.map((p: any) => ({ id: p.id, staffId: p.staff_id, period: p.period.substring(0, 7), amount: p.amount, name: staffMap.get(p.staff_id) || "Inconnu" }));
        setStaffPayments(loadedStaffPayments);

        const loadedExpenses = exp.map((e: any) => ({ id: e.id, label: e.label, amount: e.amount, category: e.category, date: e.spent_at }));
        setExpenses(loadedExpenses);
        
        const clsMap = new Map(cls.map((c: any) => [c.id, c.name]));
        const clsFeeMap = new Map(cls.map((c: any) => [c.id, c.monthly_fee]));
        
        const loadedReceipts = rec.map((r: any) => {
           const p = r.student_payments;
           const fee = clsFeeMap.get(p?.students?.class_id) || 0;
           
           let periodLabel = null;
           if (p?.payment_allocations && p.payment_allocations.length > 0) {
             const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
             periodLabel = p.payment_allocations.map((a: any) => {
               const [y, m] = a.student_dues.period.split("-").map(Number);
               return `${months[m - 1]}`;
             }).join(", ");
             periodLabel = `Mois : ${periodLabel}`;
           }

           return {
             id: r.id,
             receiptNumber: r.receipt_number,
             student: p?.students?.full_name || "Inconnu",
             className: clsMap.get(p?.students?.class_id) || "",
             amountDue: fee,
             amountPaid: p?.amount || 0,
             carried: 0,
             manque: Math.max(0, fee - (p?.amount || 0)),
             nextPeriodLabel: periodLabel,
             phone: p?.students?.parent_phone,
             method: p?.method,
             kind: "mensualite",
             date: p?.paid_at
           };
        });
        setReceipts(loadedReceipts);

        // 3. Sauvegarder les données fraîches dans le cache local
        await saveSchoolCache(schoolId, {
          classes: loadedClasses,
          students: loadedStudents,
          staff: loadedStaff,
          staffPayments: loadedStaffPayments,
          expenses: loadedExpenses,
          receipts: loadedReceipts,
          studentPayments: allStudentPay,
          inscriptionPayments: allInscrPay
        });

      } catch (err: any) {
        alert("Erreur générale: " + err.message);
        console.error("Erreur détaillée:", err);
      }
      setIsLoading(false);
    }
    load();
  }, [schoolId, refreshKey]);

  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  // Alert totals
  const unpaidStudentsCount = useMemo(() => {
    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return students.filter(s => {
      const cls = classMap.get(s.classId);
      if (!cls) return false;
      const due = s.dues?.find((d: any) => d.period === period);
      const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
      return remaining > 0;
    }).length;
  }, [students, classMap]);

  const pendingSalariesCount = useMemo(() => {
    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return staff.filter(m => {
      const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period === period).reduce((a: any, p: any) => a + p.amount, 0);
      return (m.salary - paidThisMonth) > 0;
    }).length;
  }, [staff, staffPayments]);

  const value = {
    classes,
    students,
    staff,
    staffPayments,
    expenses,
    receipts,
    studentPayments,
    inscriptionPayments,
    classMap,
    studentMap,
    isLoading,
    refreshData,
    rlsError,
    setRlsError,
    isGenerating,
    setIsGenerating,
    bulkProgress,
    setBulkProgress,
    unpaidStudentsCount,
    pendingSalariesCount
  };

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  );
}

export const useSchoolData = () => {
  const context = useContext(SchoolDataContext);
  if (!context) throw new Error("useSchoolData must be used within a SchoolDataProvider");
  return context;
};
