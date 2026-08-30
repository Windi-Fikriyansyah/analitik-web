"use server";
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function resetSiteData(siteId: string) {
  const supabase = getSupabaseServer();
  // Ensure the user owns this site
  const { data: site } = await supabase.from('sites').select('id').eq('id', siteId).single();
  if (!site) throw new Error("Unauthorized or not found");

  const admin = getSupabaseAdmin();
  // Delete visitors (will cascade to sessions, section_views, and button_clicks)
  const { error } = await admin.from('visitors').delete().eq('site_id', siteId);
  
  if (error) {
    console.error("Delete error:", error);
    throw new Error("Failed to delete data");
  }
  
  revalidatePath(`/dashboard/${siteId}`);
}
