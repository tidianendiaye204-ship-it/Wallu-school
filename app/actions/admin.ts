"use server";

export async function checkIsSuperAdmin(email: string | undefined | null) {
  if (!email) return false;
  const adminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",");
  return adminEmails.includes(email);
}
