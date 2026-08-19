import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { T } from "../../utils/theme";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentAcademicPeriod, money, currentPeriod } from "../../utils/helpers";
import { supabase } from "../../../lib/supabaseClient";

export function AIBriefWidget() {
  const { students, staff, classes, staffPayments } = useSchoolData();
  const { schoolName } = useAuth();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      // Préparation du contexte déterministe (Client-Aggregated Context)
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      
      let expectedAmount = 0;
      let collectedAmount = 0;
      const unpaidStudents: any[] = [];

      students.forEach(s => {
        if (!s.classId || s.status === 'parti' || s.status === 'exclu') return;
        
        let studentOwed = 0;
        if (s.dues) {
          for (const due of s.dues) {
            if (due.period === currentMonthKey) {
              expectedAmount += due.amountDue;
              collectedAmount += due.amountAllocated;
            }
            if (due.period <= currentMonthKey && due.amountDue > due.amountAllocated) {
              studentOwed += (due.amountDue - due.amountAllocated);
            }
          }
        }
        
        if (studentOwed > 0) {
          unpaidStudents.push({ name: s.name, owed: studentOwed });
        }
      });

      // Top 3 retards
      unpaidStudents.sort((a, b) => b.owed - a.owed);
      const topUnpaid = unpaidStudents.slice(0, 3).map(u => `${u.name} (${money(u.owed)})`);

      const currentStaffPeriod = currentPeriod();
      const unpaidStaff = staff.filter((m: any) => {
        const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(currentStaffPeriod.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
        return (m.salary - paidThisMonth) > 0;
      });

      const metrics = {
        activeStudents: students.length,
        unpaidCount: unpaidStudents.length,
        topUnpaid,
        collectedAmount,
        expectedAmount,
        pendingSalariesCount: unpaidStaff.length
      };

      const response = await fetch("/api/ai/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ schoolName, metrics })
      });

      if (!response.ok) {
        throw new Error("Erreur de l'API IA");
      }

      const data = await response.json();
      setBrief(data.brief);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossible de charger le brief");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Si on a des étudiants, on charge le brief
    if (students.length > 0 && !brief && !loading && !error) {
      fetchBrief();
    }
  }, [students.length]);

  if (!brief && !loading && !error) return null;

  return (
    <div className="mb-6 rounded-lg overflow-hidden border relative" style={{ borderColor: T.inkLine, background: "linear-gradient(135deg, #0f1c2e 0%, #0d1624 100%)" }}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={100} className="text-gold" />
      </div>
      
      <div className="p-5 relative z-10 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${T.gold}15`, border: `1px solid ${T.gold}33` }}>
          <Sparkles size={20} className="text-gold" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gold">Copilote Wallu</h2>
            <button onClick={fetchBrief} disabled={loading} className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={`${loading ? "animate-spin" : ""} text-muted`} />
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-2 mt-3 w-3/4">
              <div className="h-4 rounded bg-white/10 animate-pulse"></div>
              <div className="h-4 rounded bg-white/10 animate-pulse w-5/6"></div>
              <div className="h-4 rounded bg-white/10 animate-pulse w-4/6"></div>
            </div>
          ) : error ? (
            <p className="text-sm mt-2 text-rust">{error}</p>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-text">
              {brief}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
