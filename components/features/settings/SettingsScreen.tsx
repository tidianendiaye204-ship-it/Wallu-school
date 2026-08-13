import React, { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { T } from "../../utils/theme";
import { money } from "../../utils/helpers";
import { Field } from "../../common/Field";
import { useSchoolData } from "../../contexts/SchoolDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { addClass, updateClassFees, uploadSchoolLogo, updateSchoolLogo, uploadSchoolStamp, updateSchoolStamp } from "../../../lib/api";

export function SettingsScreen() {
  const { classes, refreshData } = useSchoolData();
  const { schoolId, schoolLogo, setSchoolLogo, schoolStamp, setSchoolStamp } = useAuth();
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [monthlyFee, setMonthlyFee] = useState("");
  const [inscriptionFee, setInscriptionFee] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newMonthly, setNewMonthly] = useState("");
  const [newInscription, setNewInscription] = useState("");

  const startEdit = (c: any) => {
    setEditing(c.id);
    setMonthlyFee(String(c.monthlyFee));
    setInscriptionFee(String(c.inscriptionFee));
  };

  const save = async (id: string) => {
    try {
      await updateClassFees(id, Number(monthlyFee), Number(inscriptionFee));
      refreshData();
    } catch (err) {
      console.error(err);
    }
    setEditing(null);
  };

  const handleAddClass = async () => {
    if (!newName || !schoolId) return;
    try {
      await addClass({ schoolId, name: newName, monthlyFee: Number(newMonthly) || 0, inscriptionFee: Number(newInscription) || 0, academicYear: new Date().getFullYear().toString() });
      refreshData();
      setNewName(""); setNewMonthly(""); setNewInscription("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !schoolId) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    try {
      const publicUrl = await uploadSchoolLogo(schoolId, file);
      await updateSchoolLogo(schoolId, publicUrl);
      setSchoolLogo(publicUrl);
    } catch (err) {
      console.error("Erreur lors de l'upload du logo", err);
      alert("Erreur lors de l'upload du logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !schoolId) return;
    const file = e.target.files[0];
    setUploadingStamp(true);
    try {
      const publicUrl = await uploadSchoolStamp(schoolId, file);
      await updateSchoolStamp(schoolId, publicUrl);
      setSchoolStamp(publicUrl);
    } catch (err) {
      console.error("Erreur lors de l'upload du tampon", err);
      alert("Erreur lors de l'upload du tampon");
    } finally {
      setUploadingStamp(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Paramètres</h1>
      
      {/* SECTION LOGO */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg mb-2" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Logo de l'école</h2>
          <p className="text-xs mb-4" style={{ color: T.muted }}>Ce logo apparaîtra en haut à gauche des reçus.</p>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs" style={{ color: T.muted }}>Aucun</span>
              )}
            </div>
            <div>
              <label className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors" style={{ background: T.inkLine, color: T.text }}>
                {uploadingLogo ? "Upload en cours..." : "Changer le logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg mb-2" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Tampon de l'école</h2>
          <p className="text-xs mb-4" style={{ color: T.muted }}>Ce cachet apparaîtra en bas à droite des reçus (signature).</p>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
              {schoolStamp ? (
                <img src={schoolStamp} alt="Tampon" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs" style={{ color: T.muted }}>Aucun</span>
              )}
            </div>
            <div>
              <label className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors" style={{ background: T.inkLine, color: T.text }}>
                {uploadingStamp ? "Upload en cours..." : "Changer le tampon"}
                <input type="file" accept="image/*" className="hidden" onChange={handleStampUpload} disabled={uploadingStamp} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-8" style={{ borderColor: T.inkLine }} />

      <h2 className="text-lg mb-2" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Niveaux et frais</h2>
      <p className="text-xs mb-6" style={{ color: T.muted }}>Définissez la mensualité et les frais d'inscription pour chaque niveau.</p>

      <div className="rounded-lg border overflow-hidden mb-6" style={{ borderColor: T.inkLine }}>
        {classes.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between px-5 py-4 border-b last:border-b-0" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
            {editing === c.id ? (
              <div className="flex items-center gap-3 flex-wrap w-full">
                <span className="text-sm w-28" style={{ color: T.text }}>{c.name}</span>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="Mensualité" className="rounded-md px-2 py-1.5 text-xs border w-28" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }} />
                <input type="number" value={inscriptionFee} onChange={(e) => setInscriptionFee(e.target.value)} placeholder="Inscription" className="rounded-md px-2 py-1.5 text-xs border w-28" style={{ borderColor: T.inkLine, background: "#0C1626", color: T.text }} />
                <button onClick={() => save(c.id)} className="text-xs px-3 py-1.5 rounded-md" style={{ background: T.gold, color: T.ink }}>Enregistrer</button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm" style={{ color: T.text }}>{c.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>Mensualité {money(c.monthlyFee)} · Inscription {money(c.inscriptionFee || 0)}</p>
                </div>
                <button onClick={() => startEdit(c)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md" style={{ border: `1px solid ${T.inkLine}`, color: T.gold }}>
                  <Pencil size={12} /> Modifier
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg p-5 border" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
        <p className="text-sm mb-3" style={{ color: T.text }}>Ajouter un niveau</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Nom du niveau" value={newName} onChange={(e: any) => setNewName(e.target.value)} placeholder="Ex : CI, CP, CE1..." />
          <Field label="Mensualité (FCFA)" type="number" value={newMonthly} onChange={(e: any) => setNewMonthly(e.target.value)} />
          <Field label="Inscription (FCFA)" type="number" value={newInscription} onChange={(e: any) => setNewInscription(e.target.value)} />
        </div>
        <button
          onClick={handleAddClass}
          className="mt-4 flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium"
          style={{ background: T.gold, color: T.ink }}
        >
          <Plus size={16} /> Ajouter le niveau
        </button>
      </div>
    </div>
  );
}
