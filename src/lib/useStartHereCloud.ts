"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import {
  LOCAL_BACKUP_KEY,
  chooseCloudSnapshot,
  cloudIsConfigured,
  fetchCloudState,
  getSupabaseClient,
  markLocalStateChanged,
  pushCloudState,
  readSyncMeta,
  stateFromCloud,
  writeSyncMeta,
} from "@/lib/startHereCloud";
import type { AppState } from "@/lib/startHereModels";

export type CloudSyncPhase = "local-only" | "connecting" | "synced" | "pending" | "offline" | "error";

export function useStartHereCloud(state: AppState, setState: Dispatch<SetStateAction<AppState>>, ready: boolean) {
  const configured = cloudIsConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<CloudSyncPhase>(configured ? "connecting" : "local-only");
  const [message, setMessage] = useState(configured ? "Checking your account…" : "Saved on this device");
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const trackingReadyRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const reconciledRef = useRef(false);
  const reconcilingUserRef = useRef<string | null>(null);
  const applyingCloudRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const upload = useCallback(async (activeUser: User, nextState = stateRef.current) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setPhase("pending");
    setMessage("Saving to your account…");
    try {
      await pushCloudState(supabase, activeUser, nextState, readSyncMeta());
      setPhase("synced");
      setMessage("Saved on this device and your account");
    } catch {
      setPhase("offline");
      setMessage("Saved on this device. Cloud sync will retry.");
    }
  }, []);

  const reconcile = useCallback(async (activeUser: User) => {
    if (reconcilingUserRef.current === activeUser.id || (reconciledRef.current && userRef.current?.id === activeUser.id)) return;
    reconcilingUserRef.current = activeUser.id;
    const supabase = getSupabaseClient();
    if (!supabase) {
      reconcilingUserRef.current = null;
      return;
    }
    setPhase("connecting");
    setMessage("Checking for your saved plan…");
    try {
      const remote = await fetchCloudState(supabase, activeUser);
      const meta = readSyncMeta();
      if (!remote) {
        await upload(activeUser);
      } else if (chooseCloudSnapshot(meta, remote)) {
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(stateRef.current));
        applyingCloudRef.current = true;
        const cloudState = stateFromCloud(remote);
        stateRef.current = cloudState;
        setState(cloudState);
        writeSyncMeta({
          ...meta,
          dirty: false,
          cloudRevision: remote.revision,
          localUpdatedAt: remote.client_updated_at,
        });
        setPhase("synced");
        setMessage("Your saved plan is up to date");
      } else {
        await upload(activeUser);
      }
      reconciledRef.current = true;
    } catch {
      reconciledRef.current = true;
      setPhase("offline");
      setMessage("Saved on this device. Cloud sync is unavailable.");
    } finally {
      reconcilingUserRef.current = null;
    }
  }, [setState, upload]);

  useEffect(() => {
    if (!configured || !ready) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const nextUser = data.session?.user ?? null;
      userRef.current = nextUser;
      setUser(nextUser);
      if (nextUser) void reconcile(nextUser);
      else {
        reconciledRef.current = false;
        reconcilingUserRef.current = null;
        setPhase("local-only");
        setMessage("Saved on this device");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const previousUserId = userRef.current?.id ?? null;
      userRef.current = nextUser;
      setUser(nextUser);
      if (nextUser && previousUserId !== nextUser.id) {
        reconciledRef.current = false;
        reconcilingUserRef.current = null;
      }
      if (nextUser && (!reconciledRef.current || previousUserId !== nextUser.id)) window.setTimeout(() => void reconcile(nextUser), 0);
      else {
        if (!nextUser) {
          reconciledRef.current = false;
          reconcilingUserRef.current = null;
          setPhase("local-only");
          setMessage("Signed out. Your plan is still saved on this device.");
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [configured, ready, reconcile]);

  useEffect(() => {
    stateRef.current = state;
    if (!ready) {
      observedStateRef.current = state;
      return;
    }
    if (!trackingReadyRef.current) {
      trackingReadyRef.current = true;
      observedStateRef.current = state;
      return;
    }
    if (observedStateRef.current === state) return;
    observedStateRef.current = state;
    if (applyingCloudRef.current) {
      applyingCloudRef.current = false;
      return;
    }
    markLocalStateChanged();
    if (!user || !reconciledRef.current) return;
    setPhase("pending");
    setMessage("Saved here. Waiting to sync…");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => void upload(user, state), 1400);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [state, ready, user, upload]);

  async function sendMagicLink(email: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud accounts are not configured yet.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    setMessage("Check your email for the secure sign-in link.");
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (userRef.current && readSyncMeta().dirty) await upload(userRef.current);
    await supabase.auth.signOut();
  }

  return {
    configured,
    user,
    phase,
    message,
    sendMagicLink,
    signOut,
    syncNow: () => userRef.current ? upload(userRef.current) : Promise.resolve(),
  };
}
