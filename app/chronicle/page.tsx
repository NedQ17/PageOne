"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, ScrollText, X, Loader2, Trash2, Pencil, Check } from "lucide-react";

interface Chronicle {
  id: string;
  date_from: string;
  date_to: string;
  title: string;
  content: string;
  word_count: number;
  detail_level: string;
  length_level: string;
  created_at: string;
}

type DetailLevel = "brief" | "detailed";
type LengthLevel = "short" | "medium" | "long";

function formatRange(from: string, to: string) {
  const f = new Date(from).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const t = new Date(to).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${f} — ${t}`;
}

export default function ChroniclePage() {
  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Chronicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      const t = editTextareaRef.current;
      t.style.height = "auto";
      t.style.height = t.scrollHeight + "px";
    }
  }, [isEditing]);

  // form
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<DetailLevel>("brief");
  const [length, setLength] = useState<LengthLevel>("medium");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    fetchChronicles();
  }, []);

  const fetchChronicles = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("chronicles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setChronicles(data ?? []);
    setLoading(false);
  };

  const generate = async () => {
    if (!dateFrom || !dateTo) { setGenError("Select a date range"); return; }
    if (dateFrom > dateTo) { setGenError("Start date must be before end date"); return; }
    setGenError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-chronicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_from: dateFrom, date_to: dateTo, detail_level: detail, length_level: length }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error ?? "Generation failed"); return; }
      setChronicles((prev) => [data, ...prev]);
      setShowCreate(false);
      setDateFrom(""); setDateTo("");
      setDetail("brief"); setLength("medium");
    } finally {
      setGenerating(false);
    }
  };

  const openChronicle = (c: Chronicle) => {
    setSelected(c);
    setEditTitle(c.title);
    setEditContent(c.content);
    setIsEditing(false);
  };

  const saveChronicleEdit = async () => {
    if (!selected || !editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }
    const word_count = editContent.trim().split(/\s+/).length;
    const { error } = await supabase
      .from("chronicles")
      .update({ title: editTitle, content: editContent, word_count })
      .eq("id", selected.id)
      .eq("user_id", user.id);
    if (!error) {
      const updated = { ...selected, title: editTitle, content: editContent, word_count };
      setChronicles((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
      setSelected(updated);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const cancelEdit = () => {
    if (selected) { setEditTitle(selected.title); setEditContent(selected.content); }
    setIsEditing(false);
  };

  const deleteChronicle = async (id: string) => {
    setIsDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsDeleting(false); return; }
    await supabase.from("chronicles").delete().eq("id", id).eq("user_id", user.id);
    setChronicles((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
    setIsDeleting(false);
  };

  if (loading) {
    return <div className="h-full bg-background" />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background font-sans animate-question">

      {/* HEADER */}
      <div className="bg-background/95 backdrop-blur-md border-b border-border/10 z-10">
        <header className="px-6 pt-12 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Chronicle</h1>
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.2em] mt-1">Life in Review</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="p-2.5 bg-foreground text-background rounded-full transition-all active:scale-90 hover:opacity-80"
          >
            <Plus size={20} />
          </button>
        </header>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {loading ? (
          <div className="flex justify-center pt-32">
            <Loader2 size={24} className="animate-spin text-muted-foreground/30" />
          </div>
        ) : chronicles.length === 0 ? (
          <div className="text-center pt-32 opacity-20">
            <ScrollText size={40} className="mx-auto mb-4" />
            <p className="text-xs uppercase tracking-widest">No chronicles yet</p>
            <p className="text-xs mt-1 opacity-60">Tap + to create your first</p>
          </div>
        ) : (
          chronicles.map((c, i) => (
            <div
              key={c.id}
              onClick={() => openChronicle(c)}
              className={`py-10 cursor-pointer group ${i !== 0 ? "border-t border-border/30" : ""}`}
            >
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  {c.detail_level === "detailed" ? "Detailed" : "Brief"} · {c.length_level}
                </span>
                <span className="text-[10px] text-muted-foreground/40 italic">
                  {formatRange(c.date_from, c.date_to)}
                </span>
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-muted-foreground transition-colors leading-tight">
                {c.title}
              </h3>
              <p className="text-[1rem] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4 leading-relaxed">
                {c.content}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 uppercase tracking-tight">
                <ScrollText size={10} />
                {c.word_count} words
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-screen-sm bg-background rounded-[2.5rem] p-6 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold">New Chronicle</h2>
              <button onClick={() => { setShowCreate(false); setGenError(""); }} className="p-2 bg-muted rounded-full text-foreground/60 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>

            {/* date range */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Date Range</p>
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 w-8 shrink-0">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-muted/50 rounded-2xl py-2.5 px-4 text-sm outline-none focus:ring-1 focus:ring-foreground/10"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 w-8 shrink-0">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-muted/50 rounded-2xl py-2.5 px-4 text-sm outline-none focus:ring-1 focus:ring-foreground/10"
                />
              </div>
            </div>

            {/* detail level */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Detail</p>
            <div className="flex gap-2 mb-5">
              {(["brief", "detailed"] as DetailLevel[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setDetail(v)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                    detail === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* length */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Length</p>
            <div className="flex gap-2 mb-6">
              {(["short", "medium", "long"] as LengthLevel[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setLength(v)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                    length === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {genError && (
              <p className="text-xs text-red-500/80 mb-3 text-center">{genError}</p>
            )}

            <button
              onClick={generate}
              disabled={generating || !dateFrom || !dateTo}
              className="w-full py-4 bg-foreground text-background rounded-full font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-all"
            >
              {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : "Generate Chronicle"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={isEditing ? undefined : () => setSelected(null)} />
          <div
            className="relative w-full max-w-2xl bg-background rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-h-[95dvh] flex flex-col animate-in slide-in-from-bottom-10 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex justify-between items-center px-8 pt-8 pb-4 sticky top-0 bg-background z-20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  {formatRange(selected.date_from, selected.date_to)}
                </span>
                {!isEditing && (
                  <button
                    onClick={() => deleteChronicle(selected.id)}
                    disabled={isDeleting}
                    className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={cancelEdit} className="text-[10px] uppercase tracking-widest px-3 py-1.5 text-muted-foreground">
                      Cancel
                    </button>
                    <button
                      onClick={saveChronicleEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 bg-foreground text-background rounded-full disabled:opacity-40"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors">
                    <Pencil size={16} />
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-2 bg-muted rounded-full text-foreground/70 active:scale-90 transition-transform">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* fade top */}
            <div className="pointer-events-none absolute top-[72px] left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10" />

            {/* content */}
            <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6 no-scrollbar relative z-0">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-4xl font-serif font-bold leading-tight bg-transparent outline-none border-b border-border/30 pb-2 mb-6"
                  />
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full text-[1.1875rem] font-serif leading-relaxed bg-muted/20 rounded-2xl p-4 outline-none resize-none focus:ring-1 focus:ring-foreground/10 min-h-[300px]"
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = t.scrollHeight + "px";
                    }}
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-4xl font-serif font-bold mb-10 leading-tight">{selected.title}</h2>
                  <div className="space-y-8">
                    {selected.content.split("\n").filter(Boolean).map((p, i) => (
                      <p
                        key={i}
                        className={`text-[1.1875rem] font-serif leading-relaxed ${
                          i === 0 ? "first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left" : ""
                        }`}
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* fade bottom */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
          </div>
        </div>
      )}
    </div>
  );
}
