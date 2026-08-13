import React, { useMemo } from "react";
import { Users, TrendingUp, TrendingDown, CircleDollarSign, ArrowUpRight, ArrowDownRight, CheckCircle, GraduationCap } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  LineChart, Line,
  RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";
import { T } from "../../utils/theme";
import { money, currentPeriod } from "../../utils/helpers";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { getLast6Months, groupByMonth, calculateTrend } from "../../utils/analytics";

// Custom Tooltip component for Recharts to match Wallu School styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-md border shadow-lg" style={{ background: T.inkSoft, borderColor: T.inkLine }}>
        <p className="text-sm font-medium mb-2" style={{ color: T.text }}>{label}</p>
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

export function DashboardScreen() {
  const { students, expenses, studentPayments, inscriptionPayments, classes, classMap, staff, staffPayments } = useSchoolData();
  const period = currentPeriod(); // e.g. "2026-08"

  // 1. KPI: Total Students & Trend
  const totalStudents = students.length;
  
  // Calculate students added this month vs last month based on creation date or first payment
  // Assuming we don't have created_at on students yet, we use inscription payments to estimate new students
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthInscriptions = inscriptionPayments.filter(p => p.paid_at?.startsWith(currentMonthKey)).length;
  const lastMonthInscriptions = inscriptionPayments.filter(p => p.paid_at?.startsWith(lastMonthKey)).length;

  // If last month had 0 inscriptions and it's a new school, trend is null
  const studentsTrend = calculateTrend(currentMonthInscriptions, lastMonthInscriptions);

  // 2. KPI: Monthly Payment Rate
  const totalDuesThisMonth = students.reduce((acc, s) => {
    const due = s.dues?.find((d: any) => d.period === period);
    return acc + (due ? due.amountDue : 0);
  }, 0);
  
  const totalPaidThisMonth = students.reduce((acc, s) => {
    const due = s.dues?.find((d: any) => d.period === period);
    return acc + (due ? due.amountAllocated : 0);
  }, 0);

  const paymentRate = totalDuesThisMonth > 0 ? (totalPaidThisMonth / totalDuesThisMonth) * 100 : 0;
  const radialData = [{ name: "Rate", value: paymentRate, fill: T.gold }];

  // 3. KPI: Monthly Receipts (Mensualités + Inscriptions)
  const groupedStudentPayments = groupByMonth(studentPayments, "paid_at", "amount");
  const groupedInscriptionPayments = groupByMonth(inscriptionPayments, "paid_at", "amount");
  
  const currentReceipts = (groupedStudentPayments[currentMonthKey] || 0) + (groupedInscriptionPayments[currentMonthKey] || 0);
  const lastMonthReceipts = (groupedStudentPayments[lastMonthKey] || 0) + (groupedInscriptionPayments[lastMonthKey] || 0);
  const receiptsTrend = calculateTrend(currentReceipts, lastMonthReceipts);

  // 4. KPI: Monthly Expenses
  const groupedExpenses = groupByMonth(expenses, "date", "amount"); // date field is 'date' in context
  const currentExpenses = groupedExpenses[currentMonthKey] || 0;

  // --- Graphiques ---

  // B. Recettes sur 6 mois
  const last6Months = getLast6Months(); // [{ key: "2026-03", label: "Mars" }, ...]
  const areaChartData = last6Months.map(m => ({
    label: m.label,
    Mensualités: groupedStudentPayments[m.key] || 0,
    Inscriptions: groupedInscriptionPayments[m.key] || 0
  }));

  // C. Paiements par Classe
  // Aggregate current month's payments per class
  const classPayments = useMemo(() => {
    const map = new Map<string, number>();
    // Reset map
    classes.forEach(c => map.set(c.id, 0));
    
    // Add student payments for current month
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
      fillRate: (map.get(c.id) || 0) / (c.monthlyFee * students.filter(s => s.classId === c.id).length || 1) // rough fill rate
    })).sort((a, b) => b.Montant - a.Montant);
  }, [classes, studentPayments, currentMonthKey, students]);

  // D. Tendance Impayés sur 6 mois
  // On estime l'impayé d'un mois = Montant Attendu - Montant Payé ce mois là
  const unpaidTrendData = last6Months.map(m => {
    // Calculer le total attendu pour ce mois (approximatif basé sur les élèves actuels)
    const expected = students.reduce((acc, s) => {
      const due = s.dues?.find((d: any) => d.period === m.key);
      return acc + (due ? due.amountDue : 0);
    }, 0);
    
    // Montant payé
    const paid = groupedStudentPayments[m.key] || 0;
    const unpaid = Math.max(0, expected - paid);
    
    return {
      label: m.label,
      Impayés: unpaid
    };
  });

  // Déterminer si la tendance est à la hausse
  const lastUnpaid = unpaidTrendData[5]?.Impayés || 0;
  const previousUnpaid = unpaidTrendData[4]?.Impayés || 0;
  const unpaidIsRising = lastUnpaid > previousUnpaid && lastUnpaid > 0;

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Tableau de bord</h1>
      
      {/* A. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Total Élèves */}
        <div className="rounded-xl p-5 border backdrop-blur-sm" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.muted }}>Total Élèves</p>
            <Users size={16} style={{ color: T.gold }} />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.text }}>{totalStudents}</p>
            {studentsTrend !== null ? (
              <div className="flex items-center text-xs mb-1" style={{ color: studentsTrend >= 0 ? T.green : T.rust }}>
                {studentsTrend >= 0 ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                {Math.abs(studentsTrend).toFixed(1)}%
              </div>
            ) : (
              <span className="text-xs mb-1" style={{ color: T.muted }}>—</span>
            )}
          </div>
        </div>

        {/* Taux de paiement mensuel */}
        <div className="rounded-xl p-5 border backdrop-blur-sm relative overflow-hidden" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between relative z-10 h-full">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: T.muted }}>Taux Recouvrement</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.text }}>
                {paymentRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-16 h-16 shrink-0 ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={6} data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: T.inkLine }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recettes du mois */}
        <div className="rounded-xl p-5 border backdrop-blur-sm" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.muted }}>Recettes (Mois)</p>
            <CircleDollarSign size={16} style={{ color: T.green }} />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.text }}>{money(currentReceipts)}</p>
          </div>
          <div className="mt-2 text-xs flex items-center">
            {receiptsTrend !== null ? (
              <span className="flex items-center" style={{ color: receiptsTrend >= 0 ? T.green : T.rust }}>
                {receiptsTrend >= 0 ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                {Math.abs(receiptsTrend).toFixed(1)}% vs mois préc.
              </span>
            ) : (
              <span style={{ color: T.muted }}>— vs mois préc.</span>
            )}
          </div>
        </div>

        {/* Dépenses du mois */}
        <div className="rounded-xl p-5 border backdrop-blur-sm" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.muted }}>Dépenses (Mois)</p>
            <TrendingDown size={16} style={{ color: T.rust }} />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.rust }}>{money(currentExpenses)}</p>
          </div>
        </div>

      </div>

      {/* Échéances & Impayés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Échéances à venir (jusqu'au 5 du mois) */}
        <div className="rounded-xl p-5 border backdrop-blur-sm flex flex-col h-72" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-sm font-medium" style={{ color: T.text }}>Échéances à venir</h2>
            <div className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(205,164,52,0.1)', color: T.gold }}>Avant le 5 du mois</div>
          </div>
          <div className="overflow-y-auto flex-1 hide-scrollbar -mx-2 px-2">
            {students.filter(s => {
              const cls = classMap.get(s.classId);
              if (!cls) return false;
              const due = s.dues?.find((d: any) => d.period === period);
              const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
              return remaining > 0;
            }).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center pb-4">
                <CheckCircle size={24} style={{ color: T.green, margin: "0 auto 8px" }} />
                <p className="text-xs" style={{ color: T.muted }}>Aucune échéance en attente.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.filter(s => {
                  const cls = classMap.get(s.classId);
                  if (!cls) return false;
                  const due = s.dues?.find((d: any) => d.period === period);
                  const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
                  return remaining > 0;
                }).map(s => {
                  const cls = classMap.get(s.classId);
                  const due = s.dues?.find((d: any) => d.period === period);
                  const remaining = due ? due.amountDue - due.amountAllocated : cls.monthlyFee;
                  
                  const today = new Date();
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), 5);
                  const diffTime = dueDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  let statusColor = T.text;
                  let statusText = "";
                  if (diffDays > 0) { statusColor = T.gold; statusText = `Dans ${diffDays} j`; }
                  else if (diffDays === 0) { statusColor = T.rust; statusText = "Aujourd'hui"; }
                  else { statusColor = T.rust; statusText = `Retard (${Math.abs(diffDays)} j)`; }

                  return (
                    <div key={s.id} className="p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: T.inkLine, background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: T.text }}>{s.name}</p>
                        <p className="text-xs" style={{ color: T.muted }}>{cls?.name} · Reste <span style={{ color: T.gold }}>{money(remaining)}</span></p>
                      </div>
                      <div className="text-xs font-semibold px-2 py-1 rounded border" style={{ color: statusColor, borderColor: statusColor, background: 'rgba(0,0,0,0.2)' }}>
                        {statusText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Salaires en attente */}
        <div className="rounded-xl p-5 border backdrop-blur-sm flex flex-col h-72" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-sm font-medium" style={{ color: T.text }}>Salaires en attente</h2>
            <GraduationCap size={16} style={{ color: T.muted }} />
          </div>
          <div className="overflow-y-auto flex-1 hide-scrollbar -mx-2 px-2">
            {staff.filter(m => {
              const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period === period).reduce((a: any, p: any) => a + p.amount, 0);
              return (m.salary - paidThisMonth) > 0;
            }).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center pb-4">
                <CheckCircle size={24} style={{ color: T.green, margin: "0 auto 8px" }} />
                <p className="text-xs" style={{ color: T.muted }}>Tous les salaires sont réglés.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {staff.filter(m => {
                  const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period === period).reduce((a: any, p: any) => a + p.amount, 0);
                  return (m.salary - paidThisMonth) > 0;
                }).map(m => {
                  const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period === period).reduce((a: any, p: any) => a + p.amount, 0);
                  const remaining = m.salary - paidThisMonth;
                  return (
                    <div key={m.id} className="p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: T.inkLine, background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: T.text }}>{m.name}</p>
                        <p className="text-xs capitalize" style={{ color: T.muted }}>{m.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: T.rust }}>{money(remaining)}</p>
                        <p className="text-[10px]" style={{ color: T.muted }}>à régler</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* B. Graphique des Recettes */}
        <div className="rounded-xl p-5 border backdrop-blur-sm" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <h2 className="text-sm font-medium mb-6" style={{ color: T.text }}>Évolution des Recettes (6 mois)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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

        {/* C. Graphique Paiements par Classe */}
        <div className="rounded-xl p-5 border backdrop-blur-sm" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <h2 className="text-sm font-medium mb-6" style={{ color: T.text }}>Encaissé par Classe (Ce mois)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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

        {/* D. Graphique Tendance Impayés */}
        <div className="rounded-xl p-5 border backdrop-blur-sm lg:col-span-2" style={{ borderColor: `${T.inkLine}80`, background: `${T.inkSoft}CC` }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium" style={{ color: T.text }}>Tendance des Impayés (6 mois)</h2>
            {unpaidIsRising && (
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(217, 83, 79, 0.15)', color: T.rust }}>
                ⚠️ Hausse des impayés
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={unpaidTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={T.muted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Impayés" stroke={unpaidIsRising ? T.rust : T.gold} strokeWidth={3} dot={{ r: 4, fill: unpaidIsRising ? T.rust : T.gold, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
