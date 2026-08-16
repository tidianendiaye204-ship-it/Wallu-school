"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { checkIsSuperAdmin } from "@/app/actions/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userEmail = session?.user?.email;
      
      if (!session || !userEmail) {
        router.replace("/");
        return;
      }
      
      const isSuperAdmin = await checkIsSuperAdmin(userEmail);
      if (!isSuperAdmin) {
        router.replace("/");
      } else {
        setIsAuthorized(true);
      }
    });
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C30]">
        <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full text-[#D4AF37]" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}
