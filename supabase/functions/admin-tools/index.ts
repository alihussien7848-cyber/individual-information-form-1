import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("BACKUP_CRON_SECRET") || "";
  const service = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const cronCall = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
  let actorId: string | null = null;
  if (!cronCall) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
    actorId = userData.user.id;
    const { data: role, error: roleError } = await service.from("admin_roles")
      .select("role,is_active").eq("user_id", actorId).maybeSingle();
    if (roleError || !role?.is_active) return json({ error: "Forbidden" }, 403);
    if (body.action === "create_user" && role.role !== "super_admin")
      return json({ error: "Only the primary administrator can add users" }, 403);
  }

  if (body.action === "create_user") {
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "super_admin" ? "admin" : (body.role || "admin");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
    if (!["admin"].includes(role)) return json({ error: "Invalid role" }, 400);
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: body.redirectTo || undefined,
    });
    if (error || !data.user) return json({ error: error?.message || "Invite failed" }, 400);
    const { error: roleError } = await service.from("admin_roles").upsert({
      user_id: data.user.id, role: "admin", is_active: true,
    });
    if (roleError) return json({ error: roleError.message }, 500);
    return json({ ok: true, invited: email });
  }

  if (body.action === "backup") {
    const records: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await service.from("submissions").select("*").order("id", { ascending: true }).range(from, from + pageSize - 1);
      if (error) return json({ error: error.message }, 500);
      records.push(...(data || []));
      if (!data || data.length < pageSize) break;
      if (records.length > 100000) return json({ error: "Backup exceeds safety limit; use database-native backup" }, 413);
    }
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const path = `submissions/${body.backupType === "scheduled" ? "scheduled" : "manual"}-${stamp}.json`;
    const payload = { format: "individual-information-form-backup-v1", created_at: now.toISOString(), records };
    const { error: uploadError } = await service.storage.from("private-backups")
      .upload(path, new Blob([JSON.stringify(payload)], { type: "application/json" }), { contentType: "application/json", upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);
    const { error: logError } = await service.from("backup_runs").insert({
      storage_path: path, record_count: records.length,
      backup_type: body.backupType === "scheduled" ? "scheduled" : "manual",
      created_by: actorId,
    });
    if (logError) return json({ error: logError.message }, 500);
    const { data: signed, error: signError } = await service.storage.from("private-backups").createSignedUrl(path, 120);
    return json({ ok: true, path, record_count: records.length, signed_url: signError ? null : signed.signedUrl });
  }

  if (body.action === "restore") {
    if (!Array.isArray(body.records) || body.records.length > 100000)
      return json({ error: "Invalid backup records" }, 400);
    const records = body.records;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error } = await service.from("submissions").upsert(chunk, { onConflict: "id" });
      if (error) return json({ error: error.message, restored_before_error: i }, 500);
    }
    const { error: seqError } = await service.rpc("sync_submissions_identity");
    if (seqError) return json({ error: seqError.message }, 500);
    return json({ ok: true, restored: records.length, mode: "merge_by_id" });
  }

  return json({ error: "Unknown action" }, 400);
});
