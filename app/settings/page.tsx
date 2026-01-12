"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Check, ChevronLeft, BrainCircuit, LogOut } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const bioRef = useRef<HTMLTextAreaElement>(null);

  // auto-resize bio
  useEffect(() => {
    if (bioRef.current) {
      bioRef.current.style.height = "auto";
      bioRef.current.style.height = `${bioRef.current.scrollHeight}px`;
    }
  }, [bio]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, bio, ai_extraction_enabled")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAiEnabled(data.ai_extraction_enabled ?? true);
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        bio,
        ai_extraction_enabled: aiEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user?.id);

    router.push("/");
    router.refresh();
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="p-8 font-serif animate-pulse text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background animate-question">
      {/* SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pt-20 pb-32">
        {/* BACK */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} />
          <span className="text-[10px] uppercase tracking-widest">Back</span>
        </button>

        {/* HEADER */}
        <div className="mb-12">
          <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-6">
            <User size={24} className="text-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">
            Profile
          </h1>
        </div>

        {/* FORM */}
        <div className="space-y-10">
          <div className="space-y-3">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground ml-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-muted rounded-2xl px-6 py-4 outline-none text-lg"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground ml-1">
              About You
            </label>
            <textarea
              ref={bioRef}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-muted rounded-2xl px-6 py-4 outline-none text-lg leading-relaxed resize-none"
              rows={3}
            />
          </div>

          {/* AI TOGGLE */}
          <div className="flex items-center justify-between p-6 bg-muted/50 rounded-3xl border border-border/5">
            <div className="flex gap-4 items-center">
              <BrainCircuit
                size={24}
                className={aiEnabled ? "text-foreground" : "text-muted-foreground/30"}
              />
              <div>
                <p className="text-sm font-bold">AI Autopilot</p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  Extract Shell entities
                </p>
              </div>
            </div>

            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                aiEnabled ? "bg-foreground" : "bg-muted-foreground/20"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-background rounded-full transition-all ${
                  aiEnabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* SAVE */}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-foreground text-background rounded-full py-5 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {saving ? "Saving..." : "Save Changes"}
            <Check size={18} />
          </button>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="w-full mt-4 py-4 text-red-500 text-[10px] font-bold border border-red-500/10 rounded-2xl flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
