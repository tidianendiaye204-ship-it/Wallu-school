import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Route API pour alimenter un éventuel assistant IA (ex: GPT-4) 
// avec le contexte de l'école (statistiques globales).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');

  if (!schoolId) {
    return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
  }

  try {
    // 1. Récupération des élèves
    const { count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // 2. Récupération des revenus totaux (Paiements)
    const { data: payments } = await supabase
      .from('student_payments')
      .select('amount')
      .eq('school_id', schoolId);
      
    const totalRevenue = payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

    // 3. Récupération du staff
    const { count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    const aiContext = {
      school_id: schoolId,
      metrics: {
        total_students: studentsCount || 0,
        total_staff: staffCount || 0,
        total_revenue_fcfa: totalRevenue,
      },
      generated_at: new Date().toISOString(),
      instruction: "Utilisez ces données pour répondre aux questions du directeur sur la santé financière et les effectifs de l'école."
    };

    return NextResponse.json(aiContext);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
