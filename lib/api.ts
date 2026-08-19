import { supabase } from "./supabaseClient";
import { queueOfflineAction, getOfflineQueue, clearOfflineAction, getSchoolCache, saveSchoolCache, updateOfflineActionError } from "./db";

// ============================================================
// ÉCOLES & UTILISATEURS
// ============================================================
export async function createSchool(params: {
  name: string;
  directorName: string;
  phone: string;
  city?: string;
  authUserId: string;
}) {
  const code =
    "WS-" +
    params.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() +
    "-" +
    Math.floor(1000 + Math.random() * 9000);

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: params.name,
      director_name: params.directorName,
      phone: params.phone,
      city: params.city,
      code,
      created_by: params.authUserId,
    })
    .select()
    .single();
  if (schoolError) throw schoolError;

  const { error: userError } = await supabase
    .from("school_users")
    .insert({
      school_id: school.id,
      auth_user_id: params.authUserId,
      full_name: params.directorName,
      role: "directeur",
      phone: params.phone,
    });
  if (userError) throw userError;

  return school;
}

export async function updateSchoolLogo(schoolId: string, logoUrl: string) {
  const { error } = await supabase
    .from("schools")
    .update({ logo_url: logoUrl })
    .eq("id", schoolId);
  if (error) throw error;
}

export async function uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${schoolId}-${Math.random()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(fileName, file, { upsert: true });
    
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function updateSchoolStamp(schoolId: string, stampUrl: string) {
  const { error } = await supabase
    .from("schools")
    .update({ stamp_url: stampUrl })
    .eq("id", schoolId);
  if (error) throw error;
}

export async function uploadSchoolStamp(schoolId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `stamp-${schoolId}-${Math.random()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(fileName, file, { upsert: true });
    
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function getSchoolForUser(authUserId: string) {
  const { data: users, error: userError } = await supabase
    .from("school_users")
    .select("school_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1);
  
  if (userError || !users || users.length === 0) return null;

  const user = users[0];

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", user.school_id)
    .maybeSingle();
    
  if (schoolError) return null;
  return school;
}

// ============================================================
// NIVEAUX / CLASSES
// ============================================================
export async function getClasses(schoolId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function addClass(params: {
  schoolId: string;
  name: string;
  monthlyFee: number;
  inscriptionFee: number;
  academicYear: string;
}) {
  const { data, error } = await supabase
    .from("classes")
    .insert({
      school_id: params.schoolId,
      name: params.name,
      monthly_fee: params.monthlyFee,
      inscription_fee: params.inscriptionFee,
      academic_year: params.academicYear,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClassFees(classId: string, monthlyFee: number, inscriptionFee: number) {
  const { error } = await supabase
    .from("classes")
    .update({ monthly_fee: monthlyFee, inscription_fee: inscriptionFee })
    .eq("id", classId);
  if (error) throw error;
}

// ============================================================
// ÉLÈVES
// ============================================================
export async function getStudents(schoolId: string, options?: { limit?: number; offset?: number }) {
  let query = supabase
    .from("students")
    .select("*, student_dues(*), student_inscription_payments(*)", { count: "exact" })
    .eq("school_id", schoolId)
    .order("full_name");
  if (options?.limit != null && options?.offset != null) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function addStudent(params: {
  schoolId: string;
  classId: string;
  fullName: string;
  parentPhone: string;
}) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const matricule = `${yy}-${rand}`;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueOfflineAction(params.schoolId, 'addStudent', params);
    
    // Optimistic update in cache
    const cache = await getSchoolCache(params.schoolId);
    const fakeId = `offline-student-${Date.now()}`;
    if (cache) {
      const cls = cache.classes?.find((c: any) => c.id === params.classId);
      

      const student = {
        id: fakeId,
        school_id: params.schoolId,
        class_id: params.classId,
        full_name: params.fullName,
        parent_phone: params.parentPhone,
        matricule,
        status: "actif",
        name: params.fullName, // Keep compatibility with older cache maps
        parentPhone: params.parentPhone,
        classId: params.classId,
        className: cls ? cls.name : "",
        dues: [],
        inscriptionPaid: 0,
      };
      
      cache.students = [student, ...(cache.students || [])];
      await saveSchoolCache(params.schoolId, cache);
    }
    
    return { id: fakeId, full_name: params.fullName, parent_phone: params.parentPhone, matricule };
  }

  // 1. Insère l’élève
  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: params.schoolId,
      class_id: params.classId,
      full_name: params.fullName,
      parent_phone: params.parentPhone,
      matricule,
    })
    .select()
    .single();
  if (error) throw error;

  // L'échéance mensuelle (student_dues) n'est PAS créée à l'inscription.
  // Elle sera créée automatiquement lors du premier paiement de mensualité
  // via le trigger SQL allocate_student_payment, ou quand le mois arrive.
  // Cela évite d'afficher "À payer" en Août pour une échéance d'Octobre.

  return student;
}

export async function deleteStudent(studentId: string, schoolId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("Impossible de supprimer un élève en mode hors-ligne. Veuillez vous reconnecter.");
  }
  
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("school_id", schoolId);
    
  if (error) throw error;
}

export async function archiveStudent(studentId: string, schoolId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("Impossible d'archiver un élève en mode hors-ligne. Veuillez vous reconnecter.");
  }
  
  const { error } = await supabase
    .from("students")
    .update({ status: 'parti' })
    .eq("id", studentId)
    .eq("school_id", schoolId);
    
  if (error) throw error;
}

// ============================================================
// PAIEMENTS ÉLÈVES (mensualité)
// Le trigger SQL `after_student_payment_insert` fait l'allocation
// et le report automatique — il suffit d'insérer le paiement brut.
// ============================================================
export async function recordStudentPayment(params: {
  schoolId: string;
  studentId: string;
  amount: number;
  method: "especes" | "wave" | "orange_money" | "virement";
  receivedBy?: string;
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueOfflineAction(params.schoolId, 'recordStudentPayment', params);
    
    // Optimistic update in cache
    const cache = await getSchoolCache(params.schoolId);
    const fakeId = `offline-${Date.now()}`;
    if (cache) {
      const student = cache.students.find((s: any) => s.id === params.studentId);
      const fee = student ? (cache.classes.find((c: any) => c.id === student.classId)?.monthlyFee || 0) : 0;
      
      const receipt = {
        id: fakeId,
        receiptNumber: `REC-OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`,
        student: student?.name || "Inconnu",
        className: student ? (cache.classes.find((c: any) => c.id === student.classId)?.name || "") : "",
        amountDue: fee,
        amountPaid: params.amount,
        carried: 0,
        manque: Math.max(0, fee - params.amount),
        nextPeriodLabel: null,
        phone: student?.parentPhone,
        method: params.method,
        kind: "mensualite"
      };
      
      cache.receipts = [receipt, ...(cache.receipts || [])];
      
      if (student) {
        // Import it dynamically or use a simple logic here. 
        // Actually, it's better to just replicate allocate logic or import it.
        // We will just do a simple chronological allocation here for offline.
        let remaining = params.amount;
        const dues = student.dues.sort((a: any, b: any) => a.period.localeCompare(b.period));
        
        for (const due of dues) {
          if (remaining <= 0) break;
          const owed = due.amountDue - due.amountAllocated;
          if (owed > 0) {
            const alloc = Math.min(remaining, owed);
            due.amountAllocated += alloc;
            remaining -= alloc;
          }
        }
        
        // If remaining > 0, we create future months
        if (remaining > 0) {
          let lastPeriod = dues.length ? dues[dues.length - 1].period : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          while (remaining > 0 && fee > 0) {
            const [y, m] = lastPeriod.split("-").map(Number);
            const d = new Date(y, m, 1);
            lastPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const alloc = Math.min(remaining, fee);
            student.dues.push({ period: lastPeriod, amountDue: fee, amountAllocated: alloc });
            remaining -= alloc;
          }
        }
      }
      await saveSchoolCache(params.schoolId, cache);
    }

    return {
      payment: {
        id: fakeId,
        school_id: params.schoolId,
        student_id: params.studentId,
        amount: params.amount,
        method: params.method,
        received_by: params.receivedBy,
        created_at: new Date().toISOString()
      },
      dues: [] 
    };
  }
  const { data, error } = await supabase
    .from("student_payments")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      amount: params.amount,
      method: params.method,
      received_by: params.receivedBy,
    })
    .select()
    .single();
  if (error) throw error;

  // Création du reçu automatique
  const receiptNumber = "REC-" + new Date().getFullYear().toString().slice(-2) + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);
  await supabase.from("receipts").insert({ payment_id: data.id, receipt_number: receiptNumber });

  // Relit les échéances mises à jour pour construire le reçu (dû / payé / reporté)
  const { data: dues } = await supabase
    .from("student_dues")
    .select("*")
    .eq("student_id", params.studentId)
    .order("period");

  return { payment: data, dues };
}

export async function recordInscriptionPayment(params: {
  schoolId: string;
  studentId: string;
  amount: number;
  method: "especes" | "wave" | "orange_money" | "virement";
  receivedBy?: string;
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueOfflineAction(params.schoolId, 'recordInscriptionPayment', params);
    
    // Optimistic update in cache
    const cache = await getSchoolCache(params.schoolId);
    const fakeId = `offline-${Date.now()}`;
    if (cache) {
      const student = cache.students.find((s: any) => s.id === params.studentId);
      const fee = student ? (cache.classes.find((c: any) => c.id === student.classId)?.inscriptionFee || 0) : 0;
      
      const receipt = {
        id: fakeId,
        receiptNumber: `REC-OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`,
        student: student?.name || "Inconnu",
        className: student ? (cache.classes.find((c: any) => c.id === student.classId)?.name || "") : "",
        amountDue: fee,
        amountPaid: params.amount,
        carried: 0,
        manque: Math.max(0, fee - params.amount),
        nextPeriodLabel: null,
        phone: student?.parentPhone,
        method: params.method,
        kind: "inscription"
      };
      
      cache.receipts = [receipt, ...(cache.receipts || [])];
      
      if (student) {
        student.inscriptionPaid = (student.inscriptionPaid || 0) + params.amount;
      }
      await saveSchoolCache(params.schoolId, cache);
    }

    return {
      id: fakeId,
      school_id: params.schoolId,
      student_id: params.studentId,
      amount: params.amount,
      method: params.method,
      created_at: new Date().toISOString()
    };
  }
  const { data, error } = await supabase
    .from("student_inscription_payments")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      amount: params.amount,
      method: params.method,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllStudentPayments(schoolId: string) {
  const { data, error } = await supabase
    .from("student_payments")
    .select("*")
    .eq("school_id", schoolId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllInscriptionPayments(schoolId: string) {
  const { data, error } = await supabase
    .from("student_inscription_payments")
    .select("*")
    .eq("school_id", schoolId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function generateMissingReceipts(schoolId: string, studentIds: string[]) {
  // 1. Récupère tous les paiements des élèves sélectionnés
  const { data: payments } = await supabase
    .from("student_payments")
    .select("id")
    .in("student_id", studentIds)
    .eq("school_id", schoolId);
  
  if (!payments || payments.length === 0) return;

  // 2. Récupère les reçus existants pour ces paiements
  const { data: existingReceipts } = await supabase
    .from("receipts")
    .select("payment_id")
    .in("payment_id", payments.map(p => p.id));
    
  const existingSet = new Set(existingReceipts?.map(r => r.payment_id) || []);

  // 3. Crée les reçus manquants
  const toInsert = payments
    .filter(p => !existingSet.has(p.id))
    .map((p, i) => ({
      payment_id: p.id,
      receipt_number: "REC-" + new Date().getFullYear().toString().slice(-2) + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + Math.floor(1000 + i + Math.random() * 9000)
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("receipts").insert(toInsert);
    if (error) throw error;
  }
}

// ============================================================
// REÇUS
// ============================================================
export async function createReceipt(params: { paymentId: string; receiptNumber: string }) {
  const { data, error } = await supabase
    .from("receipts")
    .insert({ payment_id: params.paymentId, receipt_number: params.receiptNumber })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markReceiptSentWhatsapp(receiptId: string) {
  const { error } = await supabase
    .from("receipts")
    .update({ sent_whatsapp: true, sent_whatsapp_at: new Date().toISOString() })
    .eq("id", receiptId);
  if (error) throw error;
}

export async function getReceipts(schoolId: string) {
  const { data, error } = await supabase
    .from("receipts")
    .select("*, student_payments(*, students(*), payment_allocations(amount_allocated, student_dues(period)))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ============================================================
// PERSONNEL
// ============================================================
export async function getStaff(schoolId: string) {
  const { data, error } = await supabase.from("staff").select("*").eq("school_id", schoolId).order("full_name");
  if (error) throw error;
  return data;
}

export async function addStaff(params: {
  schoolId: string;
  fullName: string;
  role: string;
  monthlySalary: number;
  phone?: string;
}) {
  const { data, error } = await supabase
    .from("staff")
    .insert({
      school_id: params.schoolId,
      full_name: params.fullName,
      role: params.role,
      monthly_salary: params.monthlySalary,
      phone: params.phone || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStaffPayments(schoolId: string, options?: { limit?: number; offset?: number }) {
  let query = supabase
    .from("staff_payments")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .order("paid_at", { ascending: false });
  if (options?.limit != null && options?.offset != null) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function paySalary(params: { schoolId: string; staffId: string; period: string; amount: number }) {
  const { data, error } = await supabase
    .from("staff_payments")
    .insert({
      school_id: params.schoolId,
      staff_id: params.staffId,
      period: params.period,
      amount: params.amount,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// DÉPENSES
// ============================================================
export async function getExpenses(schoolId: string, options?: { limit?: number; offset?: number }) {
  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .order("spent_at", { ascending: false });
  if (options?.limit != null && options?.offset != null) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function addExpense(params: { schoolId: string; label: string; amount: number; category: string }) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      school_id: params.schoolId,
      label: params.label,
      amount: params.amount,
      category: params.category,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// JOURNAL DE CAISSE / BILAN
// Combine les trois flux directement en JS (plus simple à maintenir
// que la vue SQL tant que le volume reste raisonnable).
// ============================================================
export async function getCashJournal(schoolId: string, options?: { limit?: number; offset?: number }) {
  let query = supabase
    .from("cash_journal")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .order("date", { ascending: false });

  if (options?.limit != null && options?.offset != null) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else {
    // Default limit if not paginated to prevent OOM
    query = query.limit(500);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  
  return { movements: data, count };
}

let isProcessingQueue = false;

export async function processOfflineQueue(schoolId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (isProcessingQueue) return;
  
  const queue = await getOfflineQueue(schoolId);
  if (!queue || queue.length === 0) return;

  isProcessingQueue = true;
  console.log(`Processing ${queue.length} offline actions...`);
  
  try {
    for (const item of queue) {
      if ((item.retryCount || 0) >= 5) {
        console.warn(`Action ${item.action} failed too many times, skipping.`);
        continue;
      }
      
      try {
        if (item.action === 'recordStudentPayment') {
          await recordStudentPayment(item.payload);
        } else if (item.action === 'recordInscriptionPayment') {
          await recordInscriptionPayment(item.payload);
        } else if (item.action === 'addStudent') {
          await addStudent(item.payload);
        }
        
        if (item.id) {
          await clearOfflineAction(item.id);
        }
      } catch (err: any) {
        console.error(`Failed to process offline action ${item.action}`, err);
        if (item.id) {
          await updateOfflineActionError(item.id, err?.message || "Erreur inconnue", (item.retryCount || 0) + 1);
        }
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// ============================================================
// SUPER ADMIN
// ============================================================
export async function getAllSchoolsWithDirectors() {
  const { data, error } = await supabase
    .from("schools")
    .select("*, school_users(full_name, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleSchoolSuspension(schoolId: string, currentStatus: string) {
  const newStatus = currentStatus === "actif" ? "suspendu" : "actif";
  const { error } = await supabase
    .from("schools")
    .update({ status: newStatus })
    .eq("id", schoolId);
  if (error) throw error;
  return newStatus;
}
