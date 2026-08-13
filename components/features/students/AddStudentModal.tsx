import React, { useState } from "react";
import { X, User, Phone, UserPlus } from "lucide-react";
import { T } from "../../utils/theme";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { addStudent } from "../../../lib/api";
import { useNotifications } from "../../contexts/NotificationContext";

export function AddStudentModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { classes, setRlsError, refreshData } = useSchoolData();
  const { schoolId } = useAuth();
  const { addToast, addNotification } = useNotifications();
  
  const [name, setName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(classId || classes[0]?.id);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Le nom de l'élève est obligatoire."); return; }
    if (!selectedClassId) { setError("Sélectionnez une classe."); return; }
    if (!schoolId) return;

    setError("");
    setLoading(true);
    
    try {
      await addStudent({ schoolId, classId: selectedClassId, fullName: name.trim(), parentPhone: phone.trim() });
      addToast('success', `${name.trim()} a été ajouté avec succès.`, 'Élève ajouté');
      addNotification({ type: 'success', title: 'Nouvel élève', message: `${name.trim()} a rejoint la classe.`, category: 'system' });
      refreshData();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message?.includes("row-level security")
        ? "Policy RLS manquante / utilisateur non membre de l'école / school_users absent"
        : (err?.message || "Erreur inconnue lors de l'ajout.");
      
      addToast('error', msg, 'Erreur');
      setRlsError({ message: msg, details: err?.message, docLink: "/docs/rls-policy" });
      onClose(); // Close modal on RLS error so they see the main error modal
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-lg p-6 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Ajouter un élève</h3>
          <button onClick={onClose} style={{ color: T.muted }}><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 rounded-md px-3 py-2.5 text-xs" style={{ background: "#2D1A1A", color: T.rust, border: `1px solid ${T.rust}` }}>
            ⚠ {error}
          </div>
        )}

        <div className="space-y-4">
          <Field icon={User} label="Nom complet de l'élève" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ex : Ibrahima Ba" />
          <label className="block">
            <span className="text-xs uppercase tracking-wide" style={{ color: T.muted }}>Classe</span>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full mt-1.5 rounded-md px-3 py-2.5 border text-sm" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Field icon={Phone} label="Téléphone parent (WhatsApp)" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="77 000 00 00" />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: loading ? T.inkLine : T.gold, color: T.ink, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <UserPlus size={16} />
          )}
          {loading ? "Enregistrement..." : "Ajouter l'élève"}
        </button>
      </div>
    </div>
  );
}
