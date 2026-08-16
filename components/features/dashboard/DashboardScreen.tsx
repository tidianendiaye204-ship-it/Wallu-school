import React, { useMemo } from "react";
import { Users, TrendingUp, TrendingDown, CircleDollarSign, ArrowUpRight, ArrowDownRight, CheckCircle, GraduationCap, BellRing, Plus, Send, Wallet, AlertTriangle, UserPlus, PhoneForwarded, ChevronRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  LineChart, Line
} from "recharts";
import { T } from "../../utils/theme";
import { money, currentPeriod, getCurrentAcademicPeriod } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { getLast6Months, groupByMonth, calculateTrend } from "../../utils/analytics";
import { AIBriefWidget } from "./AIBriefWidget";
import { ChatModal } from "../ai/ChatModal";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-md border shadow-lg" style={{ background: T.inkSoft, borderColor: T.inkLine }}>
        <p className="text-sm font-medium mb-2 text-text">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color, fontFamily: "'IBM Plex Mono', monospace" }}>
            {entry.name}: {money(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardScreen({ navigate }: { navigate: (tab: string) => void }) {
  const { students, expenses, studentPayments, inscriptionPayments, classes, classMap, staff, staffPayments, unpaidStudentsCount, pendingSalariesCount } = useSchoolData();
  const period = currentPeriod();
  
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // 1. Data Aggregation
  const groupedStudentPayments = groupByMonth(studentPayments, "paid_at", "amount");
  const groupedInscriptionPayments = groupByMonth(inscriptionPayments, "paid_at", "amount");
  const currentReceipts = (groupedStudentPayments[currentMonthKey] || 0) + (groupedInscriptionPayments[currentMonthKey] || 0);

  const last6Months = getLast6Months();
  const areaChartData = last6Months.map(m => ({
    label: m.label,
    Mensualités: groupedStudentPayments[m.key] || 0,
    Inscriptions: groupedInscriptionPayments[m.key] || 0
  }));

  const unpaidTrendData = last6Months.map(m => {
    const expected = students.reduce((acc, s) => {
      const due = s.dues?.find((d: any) => d.period.startsWith(m.key));
      return acc + (due ? due.amountDue : 0);
    }, 0);
    const paid = groupedStudentPayments[m.key] || 0;
    const unpaid = Math.max(0, expected - paid);
    return { label: m.label, Impayés: unpaid };
  });

  const classPayments = useMemo(() => {
    const map = new Map<string, number>();
    classes.forEach(c => map.set(c.id, 0));
    studentPayments.forEach(p => {
      if (p.paid_at?.startsWith(currentMonthKey)) {
        const student = students.find(s => s.id === p.student_id);
        if (student && student.classId) {
          map.set(student.classId, (map.get(student.classId) || 0) + p.amount);
        }
      }
    });
    return classes.map(c => ({
      name: c.name,
      Montant: map.get(c.id) || 0,
      fillRate: (map.get(c.id) || 0) / (c.monthlyFee * students.filter(s => s.classId === c.id).length || 1)
    })).sort((a, b) => b.Montant - a.Montant);
  }, [classes, studentPayments, currentMonthKey, students]);

  // Alert calculations
  const lastUnpaid = unpaidTrendData[5]?.Impayés || 0;
  const previousUnpaid = unpaidTrendData[4]?.Impayés || 0;
  const unpaidIsRising = lastUnpaid > previousUnpaid && lastUnpaid > 0;
  const unpaidRisePercent = calculateTrend(lastUnpaid, previousUnpaid) || 0;

  // Briefing Logic
  const todayFr = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  let briefingMessage = `Tout semble en ordre pour aujourd'hui.`;
  if (unpaidStudentsCount > 0 && pendingSalariesCount > 0) {
    briefingMessage = `Aujourd'hui, ${unpaidStudentsCount} échéances en retard requièrent votre attention, et ${pendingSalariesCount} salaires sont en attente.`;
  } else if (unpaidStudentsCount > 0) {
    briefingMessage = `Aujourd'hui, ${unpaidStudentsCount} échéances en retard requièrent votre attention.`;
  } else if (pendingSalariesCount > 0) {
    briefingMessage = `Aujourd'hui, ${pendingSalariesCount} salaires sont en attente de paiement.`;
  }

  // Actionable Lists
  const unpaidStudents = students.filter(s => {
    const cls = classMap.get(s.classId);
    if (!cls) return false;
    const due = s.dues?.find((d: any) => d.period === period);
    const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
    return remaining > 0;
  }).map(s => {
    const cls = classMap.get(s.classId)!;
    const due = s.dues?.find((d: any) => d.period === period);
    const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
    
    // Deadline is the 5th of the FOLLOWING month
    const targetPeriod = due ? due.period : period;
    const [y, m] = targetPeriod.split("-").map(Number);
    // JS Date month is 0-indexed. So new Date(y, m, 5) gives the 5th of the NEXT month automatically!
    // Example: "2026-10" -> y=2026, m=10 -> new Date(2026, 10, 5) -> November 5, 2026.
    const dueDate = new Date(y, m, 5);
    
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return { ...s, remaining, className: cls.name, diffDays };
  }).sort((a, b) => a.diffDays - b.diffDays).slice(0, 5); // Take top 5 urgents

  const unpaidStaff = staff.filter(m => {
    const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(period.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
    return (m.salary - paidThisMonth) > 0;
  }).map(m => {
    const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(period.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
    return { ...m, remaining: m.salary - paidThisMonth };
  });

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      
      <AIBriefWidget />
      <ChatModal />

      {/* 2. Actions Rapides (Scroll horizontal mobile) */}
      <div className="mb-10">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-muted">Actions Rapides</h2>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          <button onClick={() => navigate("classes")} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-[#111111] hover:bg-[#1A1A1A] transition-colors shrink-0 w-32 border-inkLine">
            <Wallet size={24} className="text-green mb-2" />
            <span className="text-xs font-medium text-center text-text">Encaisser<br/>Paiement</span>
          </button>
          <button onClick={() => navigate("impayes")} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-[#111111] hover:bg-[#1A1A1A] transition-colors shrink-0 w-32 border-inkLine">
            <PhoneForwarded size={24} className="text-gold mb-2" />
            <span className="text-xs font-medium text-center text-text">Relancer<br/>Impayés</span>
          </button>
          <button onClick={() => navigate("classes")} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-[#111111] hover:bg-[#1A1A1A] transition-colors shrink-0 w-32 border-inkLine">
            <UserPlus size={24} className="text-text mb-2" />
            <span className="text-xs font-medium text-center text-text">Nouvel<br/>Élève</span>
          </button>
          <button onClick={() => navigate("staff")} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-[#111111] hover:bg-[#1A1A1A] transition-colors shrink-0 w-32 border-inkLine">
            <Send size={24} className="text-muted mb-2" />
            <span className="text-xs font-medium text-center text-text">Régler<br/>Salaires</span>
          </button>
        </div>
      </div>

      {/* 3. Smart Alerts (Seulement si nécessaire) */}
      {unpaidIsRising && (
        <div className="mb-10 p-4 rounded-xl border flex gap-4 items-start bg-[#2B1B1B]" style={{ borderColor: T.rust }}>
          <AlertTriangle size={24} className="text-rust shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1 text-text">Alerte Recouvrement</h3>
            <p className="text-sm opacity-90 mb-3 text-muted">
              Les impayés sont en hausse de {unpaidRisePercent.toFixed(1)}% par rapport au mois précédent. Un effort de relance WhatsApp est conseillé cette semaine.
            </p>
            <button onClick={() => navigate("impayes")} className="text-xs font-medium px-4 py-2 rounded-md" style={{ background: T.rust, color: T.text }}>
              Voir les impayés
            </button>
          </div>
        </div>
      )}

      {/* 4. Priorités d'Action (Cartes Actionnables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        
        {/* Impayés Urgents */}
        <div className="rounded-xl border bg-[#111111] flex flex-col border-inkLine">
          <div className="p-5 border-b flex justify-between items-center border-inkLine">
            <h2 className="text-sm font-medium text-text">Impayés Prioritaires ({unpaidStudentsCount})</h2>
            <button onClick={() => navigate("impayes")} className="text-xs font-medium hover:underline flex items-center text-gold">
              Voir tout <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
          <div className="p-2 space-y-2">
            {unpaidStudents.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={32} style={{ color: T.green, margin: "0 auto 12px" }} />
                <p className="text-sm text-muted">Aucun retard critique.</p>
              </div>
            ) : (
              unpaidStudents.map(s => (
                <div key={s.id} className="p-3 rounded-lg flex items-center justify-between hover:bg-[#1A1A1A] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-text">{s.name}</p>
                    <p className="text-xs flex gap-2 mt-1 text-muted">
                      <span>{s.className}</span>
                      <span style={{ color: s.diffDays < 0 ? T.rust : T.gold }}>
                        {s.diffDays < 0 ? `Retard ${Math.abs(s.diffDays)}j` : `Dans ${s.diffDays}j`}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-rust">{money(s.remaining)}</span>
                    <button onClick={() => navigate("classes")} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-white/10 border-inkLine">
                      <Plus size={14} className="text-text" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Salaires dus */}
        <div className="rounded-xl border bg-[#111111] flex flex-col border-inkLine">
          <div className="p-5 border-b flex justify-between items-center border-inkLine">
            <h2 className="text-sm font-medium text-text">Salaires en Attente ({pendingSalariesCount})</h2>
            <button onClick={() => navigate("staff")} className="text-xs font-medium hover:underline flex items-center text-gold">
              Voir tout <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
          <div className="p-2 space-y-2">
            {unpaidStaff.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={32} style={{ color: T.green, margin: "0 auto 12px" }} />
                <p className="text-sm text-muted">Tous les salaires sont réglés.</p>
              </div>
            ) : (
              unpaidStaff.map(m => (
                <div key={m.id} className="p-3 rounded-lg flex items-center justify-between hover:bg-[#1A1A1A] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-text">{m.name}</p>
                    <p className="text-xs capitalize mt-1 text-muted">{m.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-text">{money(m.remaining)}</span>
                    <button onClick={() => navigate("staff")} className="text-xs font-medium px-3 py-1.5 rounded bg-white text-black hover:bg-gray-200 transition-colors">
                      Régler
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. Données & Graphiques (Bottom) */}
      <h2 className="text-sm font-medium uppercase tracking-wider mb-6 mt-12 text-muted">Vue Analytique</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recettes Globales */}
        <div className="rounded-xl p-5 border bg-[#111111] lg:col-span-2 border-inkLine">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-text">Évolution des Recettes</h2>
            <span className="text-lg font-bold font-mono text-green">{money(currentReceipts)} <span className="text-xs font-sans text-gray-500 font-normal">ce mois</span></span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMensualites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.gold} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={T.gold} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInscriptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.green} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={T.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Mensualités" stroke={T.gold} fillOpacity={1} fill="url(#colorMensualites)" />
                <Area type="monotone" dataKey="Inscriptions" stroke={T.green} fillOpacity={1} fill="url(#colorInscriptions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paiements par Classe */}
        <div className="rounded-xl p-5 border bg-[#111111] border-inkLine">
          <h2 className="text-sm font-medium mb-6 text-text">Encaissé par Classe</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <BarChart layout="vertical" data={classPayments} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis dataKey="name" type="category" stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="Montant" radius={[0, 4, 4, 0]} barSize={16}>
                  {classPayments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillRate > 0.8 ? T.green : entry.fillRate > 0.4 ? T.gold : T.rust} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
