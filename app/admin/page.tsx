"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getAllSchoolsWithDirectors, toggleSchoolSuspension } from "@/lib/api";
import { Shield, Power, Search, Home } from "lucide-react";
import Link from "next/link";
import { T, FONT_IMPORT } from "@/components/utils/theme";

export default function AdminPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSchoolsWithDirectors();
      setSchools(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des écoles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (schoolId: string, currentStatus: string) => {
    try {
      const newStatus = await toggleSchoolSuspension(schoolId, currentStatus);
      setSchools((prev) => 
        prev.map(s => s.id === schoolId ? { ...s, status: newStatus } : s)
      );
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.school_users?.[0]?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white" style={{ background: T.ink, fontFamily: "'Work Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      
      <header className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: T.inkLine }}>
        <div className="flex items-center gap-3">
          <Shield size={28} style={{ color: T.gold }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
            Wallu School <span className="text-gray-400 text-lg">Super Admin</span>
          </h1>
        </div>
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
          <Home size={16} /> Retour à l'app
        </Link>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold mb-1">Écoles Inscrites ({schools.length})</h2>
            <p className="text-sm text-gray-400">Gérez l'accès des directeurs à la plateforme.</p>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher une école..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-md bg-white/5 border text-sm w-64 focus:outline-none focus:border-white"
              style={{ borderColor: T.inkLine }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full text-[#D4AF37]" />
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden" style={{ borderColor: T.inkLine }}>
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 border-b" style={{ borderColor: T.inkLine }}>
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-300">Code / Nom</th>
                  <th className="px-6 py-4 font-medium text-gray-300">Directeur</th>
                  <th className="px-6 py-4 font-medium text-gray-300">Téléphone</th>
                  <th className="px-6 py-4 font-medium text-gray-300">Date d'inscription</th>
                  <th className="px-6 py-4 font-medium text-gray-300">Statut</th>
                  <th className="px-6 py-4 font-medium text-gray-300 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSchools.map((school) => {
                  const isSuspended = school.status === "suspendu";
                  const director = school.school_users?.[0];
                  
                  return (
                    <tr key={school.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{school.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{school.code}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {director?.full_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono">
                        {school.phone || director?.phone || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(school.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isSuspended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {school.status || "actif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(school.id, school.status || 'actif')}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${isSuspended ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                        >
                          <Power size={14} />
                          {isSuspended ? "Réactiver" : "Suspendre"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredSchools.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucune école trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
