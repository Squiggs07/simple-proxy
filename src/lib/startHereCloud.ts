import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { mergeStoredState, type AppState } from "@/lib/startHereModels";

export const CLOUD_TABLE = "start_here_state";
export const LOCAL_SYNC_META_KEY = "start-here-sync-meta-v1";
export const LOCAL_BACKUP_KEY = "start-here-state-before-cloud-v1";

export interface CloudStateRow {
  user_id: string;
  snapshot: unknown;
  state_version: number;
  revision: number;
  device_id: string;
  client_updated_at: string;
  updated_at: string;
}

export interface LocalSyncMeta {
  deviceId: string;
  dirty: boolean;
  localUpdatedAt: string;
  cloudRevision: number;
}

let client: SupabaseClient | null | undefined;

export function cloudIsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

function newDeviceId() {
  const cryptoApi = typeof globalThis.crypto === "undefined"
    ? undefined
    : globalThis.crypto as unknown as { randomUUID?: () => string; getRandomValues?: (array: Uint8Array) => Uint8Array };
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function readSyncMeta(): LocalSyncMeta {
  const fallback: LocalSyncMeta = {
    deviceId: newDeviceId(),
    dirty: true,
    localUpdatedAt: new Date(0).toISOString(),
    cloudRevision: 0,
  };
  try {
    const saved = localStorage.getItem(LOCAL_SYNC_META_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<LocalSyncMeta>;
    return {
      deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : fallback.deviceId,
      dirty: parsed.dirty !== false,
      localUpdatedAt: typeof parsed.localUpdatedAt === "string" ? parsed.localUpdatedAt : fallback.localUpdatedAt,
      cloudRevision: typeof parsed.cloudRevision === "number" ? parsed.cloudRevision : 0,
    };
  } catch {
    return fallback;
  }
}

export function writeSyncMeta(meta: LocalSyncMeta) {
  localStorage.setItem(LOCAL_SYNC_META_KEY, JSON.stringify(meta));
}

export function markLocalStateChanged() {
  const meta = readSyncMeta();
  const changed = { ...meta, dirty: true, localUpdatedAt: new Date().toISOString() };
  writeSyncMeta(changed);
  return changed;
}

export function chooseCloudSnapshot(localMeta: LocalSyncMeta, remote: CloudStateRow) {
  if (!localMeta.dirty) return true;
  const localTime = Date.parse(localMeta.localUpdatedAt);
  const remoteTime = Date.parse(remote.client_updated_at || remote.updated_at);
  if (Number.isNaN(localTime)) return true;
  if (Number.isNaN(remoteTime)) return false;
  if (remoteTime !== localTime) return remoteTime > localTime;
  return remote.revision > localMeta.cloudRevision;
}

export async function fetchCloudState(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase.from(CLOUD_TABLE).select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data as CloudStateRow | null;
}

export async function pushCloudState(supabase: SupabaseClient, user: User, state: AppState, meta: LocalSyncMeta) {
  const clientUpdatedAt = meta.localUpdatedAt === new Date(0).toISOString() ? new Date().toISOString() : meta.localUpdatedAt;
  const { data, error } = await supabase.from(CLOUD_TABLE).upsert({
    user_id: user.id,
    snapshot: state,
    state_version: state.version,
    device_id: meta.deviceId,
    client_updated_at: clientUpdatedAt,
  }, { onConflict: "user_id" }).select("*").single();
  if (error) throw error;
  const row = data as CloudStateRow;
  const synced = { ...meta, dirty: false, cloudRevision: row.revision, localUpdatedAt: row.client_updated_at };
  writeSyncMeta(synced);
  return synced;
}

export function stateFromCloud(row: CloudStateRow) {
  return mergeStoredState(row.snapshot);
}
