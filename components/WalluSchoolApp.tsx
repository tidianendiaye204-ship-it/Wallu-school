"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt, LayoutGrid, AlertCircle, GraduationCap, TrendingDown,
  History, PieChart, Settings, X, DownloadCloud, LogOut, LayoutDashboard
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

import { T, FONT_IMPORT } from "./utils/theme";
import { NavItem } from "./common/NavItem";
import { RlsErrorModal } from "./common/RlsErrorModal";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SchoolDataProvider, useSchoolData } from "./contexts/SchoolDataContext";
import { NotificationProvider, useNotifications } from "./contexts/NotificationContext";

import { ToastContainer } from "./features/notifications/ToastContainer";
import { NotificationCenter } from "./features/notifications/NotificationCenter";

import { LoginScreen } from "./features/auth/LoginScreen";
import { InscriptionScreen } from "./features/auth/InscriptionScreen";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { ClassesScreen } from "./features/classes/ClassesScreen";
import { StaffScreen } from "./features/staff/StaffScreen";
import { RecouvrementScreen } from "./features/reports/RecouvrementScreen";
import { ExpensesScreen } from "./features/expenses/ExpensesScreen";
import { ReceiptScreen } from "./features/receipts/ReceiptScreen";
import { CaisseScreen } from "./features/reports/CaisseScreen";
import { BilanScreen } from "./features/reports/BilanScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { processOfflineQueue } from "../lib/api";

function AppContent() {
  const { session, loading: authLoading, schoolName, schoolId, schoolStatus } = useAuth();
  const { addToast } = useNotifications();
  const [authMode, setAuthMode] = useState("login");
  
  const [tab, setTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  const { rlsError, setRlsError, isGenerating, bulkProgress, unpaidStudentsCount, pendingSalariesCount, refreshData } = useSchoolData();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      if (session && schoolId) {
        addToast('info', 'Retour de la connexion, synchronisation des données...', 'Mode en ligne');
        await processOfflineQueue(schoolId);
        refreshData();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [session, schoolId, addToast, refreshData]);

  const handleInstallApp = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then(() => setInstallPromptEvent(null));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-ink">
        <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full text-gold" />
      </div>
    );
  }

  if (!session) {
    if (authMode === "register") {
      return <InscriptionScreen onGoLogin={() => setAuthMode("login")} />;
    }
    return <LoginScreen onGoRegister={() => setAuthMode("register")} />;
  }

  if (schoolStatus === "suspendu") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center bg-ink">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <h1 className="text-2xl font-bold mb-2 text-white">Compte Suspendu</h1>
        <p className="text-gray-400 mb-6 max-w-md">
          L'accès à Wallu School pour cette école a été suspendu. Veuillez contacter l'administrateur pour régulariser votre situation.
        </p>
        <button 
          onClick={handleLogout} 
          className="px-6 py-2 rounded-md font-medium bg-gold text-ink"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ink font-sans">
      <style>{FONT_IMPORT}</style>
      
      {/* ── Modale d'erreur RLS ── */}
      <RlsErrorModal error={rlsError} onClose={() => setRlsError(null)} />

      {/* ── Barre de progression bulk generate ── */}
      {isGenerating && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center gap-3 bg-inkSoft border-b-2 border-gold">
          <span className="text-xs font-medium text-gold">Génération en cours…</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-inkLine">
            <div className="h-full rounded-full transition-all duration-300 bg-gold" style={{ width: `${Math.round(bulkProgress * 100)}%` }} />
          </div>
          <span className="text-xs text-muted">{Math.round(bulkProgress * 100)}%</span>
        </div>
      )}

      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-inkLine print:hidden">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-gold" />
          <span className="font-serif text-text font-semibold">Wallu School</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-text">
            {mobileMenuOpen ? <X size={24} /> : <div className="space-y-1"><div className="w-6 h-0.5 bg-current"></div><div className="w-6 h-0.5 bg-current"></div><div className="w-6 h-0.5 bg-current"></div></div>}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`w-56 shrink-0 border-r border-inkLine px-4 py-6 flex-col gap-1 print:hidden ${mobileMenuOpen ? "flex absolute inset-0 z-40 bg-inherit" : "hidden md:flex"}`}>
        <div className="flex items-center justify-between px-2 mb-6 md:mb-6">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-gold" />
            <span className="font-serif text-text font-semibold">Wallu School</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block"><NotificationCenter /></div>
            {mobileMenuOpen && (
              <button className="md:hidden text-text" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
            )}
          </div>
        </div>
        <NavItem icon={LayoutDashboard} label="Tableau de bord" active={tab === "dashboard"} onClick={() => { setTab("dashboard"); setMobileMenuOpen(false); }} />
        <NavItem icon={LayoutGrid} label="Classes" active={tab === "classes"} onClick={() => { setTab("classes"); setMobileMenuOpen(false); }} badge={unpaidStudentsCount} />
        <NavItem icon={AlertCircle} label="Impayés" active={tab === "impayes"} onClick={() => { setTab("impayes"); setMobileMenuOpen(false); }} />
        <NavItem icon={GraduationCap} label="Personnel" active={tab === "staff"} onClick={() => { setTab("staff"); setMobileMenuOpen(false); }} badge={pendingSalariesCount} />
        <NavItem icon={TrendingDown} label="Dépenses" active={tab === "expenses"} onClick={() => { setTab("expenses"); setMobileMenuOpen(false); }} />
        <NavItem icon={Receipt} label="Reçus" active={tab === "receipts"} onClick={() => { setTab("receipts"); setMobileMenuOpen(false); }} />
        <NavItem icon={History} label="Caisse" active={tab === "caisse"} onClick={() => { setTab("caisse"); setMobileMenuOpen(false); }} />
        <NavItem icon={PieChart} label="Bilan" active={tab === "bilan"} onClick={() => { setTab("bilan"); setMobileMenuOpen(false); }} />
        <NavItem icon={Settings} label="Paramètres" active={tab === "settings"} onClick={() => { setTab("settings"); setMobileMenuOpen(false); }} />
        
        <div className="mt-auto px-2 pt-6 pb-2">
          {installPromptEvent && (
            <button
              onClick={handleInstallApp}
              className="w-full mb-4 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-gold text-ink"
            >
              <DownloadCloud size={16} /> Installer l'app
            </button>
          )}
          <div className="text-[11px] text-muted">{schoolName}</div>
        </div>

        {/* Bouton de déconnexion */}
        <div className="mt-2 pt-4 border-t border-inkLine">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 md:px-10 py-8 overflow-y-auto" style={{ display: mobileMenuOpen ? 'none' : 'block' }}>
        {tab === "dashboard" && <DashboardScreen navigate={setTab} />}
        {tab === "classes" && <ClassesScreen onGoToSettings={() => setTab("settings")} onGoToReceipts={() => setTab("receipts")} />}
        {tab === "staff" && <StaffScreen />}
        {tab === "impayes" && <RecouvrementScreen />}
        {tab === "expenses" && <ExpensesScreen />}
        {tab === "receipts" && <ReceiptScreen />}
        {tab === "caisse" && <CaisseScreen />}
        {tab === "bilan" && <BilanScreen />}
        {tab === "settings" && <SettingsScreen />}
      </main>
    </div>
  );
}

export default function WalluSchoolApp() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <SchoolDataProvider>
          <AppContent />
          <ToastContainer />
        </SchoolDataProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
