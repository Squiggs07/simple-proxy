import { describe, expect, it } from "vitest";
import { chooseCloudSnapshot, type CloudStateRow, type LocalSyncMeta } from "@/lib/startHereCloud";

const remote = (overrides: Partial<CloudStateRow> = {}): CloudStateRow => ({
  user_id: "user",
  snapshot: {},
  state_version: 9,
  revision: 4,
  device_id: "remote",
  client_updated_at: "2026-08-20T12:00:00.000Z",
  updated_at: "2026-08-20T12:00:01.000Z",
  ...overrides,
});

const local = (overrides: Partial<LocalSyncMeta> = {}): LocalSyncMeta => ({
  deviceId: "local",
  dirty: true,
  localUpdatedAt: "2026-08-20T11:00:00.000Z",
  cloudRevision: 3,
  ...overrides,
});

describe("cloud snapshot reconciliation", () => {
  it("uses cloud when local state has no unsynced changes", () => {
    expect(chooseCloudSnapshot(local({ dirty: false }), remote())).toBe(true);
  });

  it("keeps newer unsynced local state", () => {
    expect(chooseCloudSnapshot(local({ localUpdatedAt: "2026-08-20T13:00:00.000Z" }), remote())).toBe(false);
  });

  it("uses revision as a deterministic tie-breaker", () => {
    expect(chooseCloudSnapshot(local({ localUpdatedAt: remote().client_updated_at, cloudRevision: 3 }), remote())).toBe(true);
    expect(chooseCloudSnapshot(local({ localUpdatedAt: remote().client_updated_at, cloudRevision: 5 }), remote())).toBe(false);
  });
});
