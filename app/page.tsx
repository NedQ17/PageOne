"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  CheckCircle2,
  User,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Note {
  id: string;
  text: string;
  time: string;
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function ThisDay() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [narrationPerspective, setNarrationPerspective] = useState<'first' | 'third'>('first');
  const profileLoadedRef = useRef(false);

  const BIO_LIMIT = 500;

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setEditingId(null);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.push("/login");
        return;
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("entries")
        .select("id, content, created_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (!error) {
        setNotes(
          (data || []).map((n) => ({
            id: n.id,
            text: n.content,
            time: new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      }
      setIsInitialLoading(false);
    };

    fetchNotes();
    return () => {
      cancelled = true;
    };
  }, [router, selectedDate]);

  useEffect(() => {
    if (!showCalendar) return;
    let cancelled = false;

    const fetchEntryDates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      const { data } = await supabase
        .from("entries")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (cancelled) return;

      const dates = new Set((data || []).map((e) => {
        const d = new Date(e.created_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }));
      setEntryDates(dates);
    };

    fetchEntryDates();
    return () => { cancelled = true; };
  }, [showCalendar, calendarMonth]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon-first
    const cells: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const hasEntry = (d: Date) =>
    entryDates.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  const openProfile = async () => {
    if (!profileLoadedRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name, bio, narration_perspective").eq("id", user.id).single();
      if (data) {
        setProfileName(data.full_name || "");
        setProfileBio(data.bio || "");
        setNarrationPerspective(data.narration_perspective === 'third' ? 'third' : 'first');
      }
      profileLoadedRef.current = true;
    }
    setShowProfile(true);
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").upsert(
        { id: user.id, full_name: profileName.trim(), bio: profileBio.trim(), narration_perspective: narrationPerspective, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      setShowProfile(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
      alert("Error saving: " + msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const closeProfile = () => {
    profileLoadedRef.current = false;
    setShowProfile(false);
  };

  const clearProfile = () => {
    setProfileName("");
    setProfileBio("");
  };

  const openCalendar = () => {
    const m = new Date(selectedDate);
    m.setDate(1);
    setCalendarMonth(m);
    setShowCalendar(true);
  };

  const selectDay = (d: Date) => {
    setSelectedDate(d);
    setEditingId(null);
    setShowCalendar(false);
  };

  const addNote = async () => {
    if (!inputValue.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("entries")
      .insert([{ content: inputValue, user_id: user.id }])
      .select();

    if (!error && data?.[0]) {
      const newNote: Note = {
        id: data[0].id,
        text: data[0].content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setNotes((prev) => [newNote, ...prev]);
      setInputValue("");
    }
  };

  const saveEdit = async (noteId: string) => {
    if (!editValue.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("entries").update({ content: editValue }).eq("id", noteId).eq("user_id", user.id);
    if (!error) {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text: editValue } : n)));
      setEditingId(null);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this entry?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("entries").delete().eq("id", noteId).eq("user_id", user.id);
    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setEditingId(null);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (editTextareaRef.current) {
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [editValue, editingId]);

  if (isInitialLoading) {
    return <div className="h-full bg-background" />;
  }

  const today = new Date();

  return (
    <div className="flex flex-col h-full bg-background animate-question font-sans selection:bg-foreground selection:text-background">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-end bg-background z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-muted rounded-full text-muted-foreground/40 hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={openCalendar} className="text-left">
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
              {isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
            </h1>
            <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1 opacity-50">
              {formattedDate}
            </p>
          </button>
          <button
            onClick={() => changeDate(1)}
            className={`p-1 hover:bg-muted rounded-full text-muted-foreground/40 hover:text-foreground transition-colors ${isToday ? "opacity-0 pointer-events-none" : ""}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openProfile}
            className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors"
          >
            <User size={18} />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={async () => { if (!confirm("Sign out?")) return; await supabase.auth.signOut(); router.push("/login"); }}
            className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <div
        className="overflow-y-auto px-6 py-4"
        style={{ height: "calc(100dvh - 120px)", WebkitOverflowScrolling: "touch" }}
      >
        {notes.length === 0 ? (
          <div className="h-full flex items-center justify-center pt-20">
            <p className="text-muted-foreground/30 text-[10px] uppercase tracking-widest text-center">
              No entries for <br /> {formattedDate}
            </p>
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={note.id} className={`group transition-all relative ${index !== 0 ? "border-t border-border/30 pt-8" : ""}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.15em]">
                  Entry {String(notes.length - index).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{note.time}</span>
              </div>

              {editingId === note.id ? (
                <div className="relative group/edit mt-2">
                  <textarea
                    ref={editTextareaRef}
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(note.id); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full p-4 pb-14 bg-muted/30 rounded-2xl border border-border/50 text-lg leading-relaxed resize-none focus:outline-none font-serif overflow-hidden"
                    rows={1}
                  />
                  <div className="absolute bottom-3 left-3">
                    <button onClick={() => deleteNote(note.id)} className="p-2 text-red-500/40 hover:text-red-600 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button onClick={() => setEditingId(null)} className="text-[10px] uppercase tracking-widest px-3 py-1.5 text-muted-foreground">Cancel</button>
                    <button onClick={() => saveEdit(note.id)} className="text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 bg-foreground text-background rounded-full">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-lg leading-relaxed text-foreground/90 font-serif whitespace-pre-wrap cursor-pointer py-1" onDoubleClick={() => { setEditingId(note.id); setEditValue(note.text); }}>
                  {note.text}
                </p>
              )}
            </div>
          ))
        )}
        <div className="h-[160px]" />
      </div>

      {/* INPUT AREA */}
      {isToday && (
        <div
          className="fixed left-0 right-0 px-6 pt-6 z-[60]"
          style={{ bottom: "calc(36px + max(16px, env(safe-area-inset-bottom)))" }}
        >
          <div className="max-w-screen-sm mx-auto bg-white dark:bg-zinc-100 rounded-[2.5rem] px-5 py-1.5 flex items-end gap-2 shadow-2xl border border-gray-200">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Record a thought..."
              className="flex-1 bg-transparent py-2.5 outline-none resize-none text-base text-black font-sans placeholder:text-gray-400 max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }
              }}
            />
            <button
              onClick={addNote}
              disabled={!inputValue.trim()}
              className="mb-1.5 p-2.5 bg-black text-white rounded-full disabled:opacity-20 transition-all active:scale-95 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL */}

      {showCalendar && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="absolute left-4 right-4 max-w-screen-sm mx-auto bg-background rounded-[2.5rem] p-6 pb-8 shadow-2xl"
            style={{ bottom: "calc(76px + max(16px, env(safe-area-inset-bottom)) + 70px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;

                const isSelectedDay = day.toDateString() === selectedDate.toDateString();
                const isTodayCell = day.toDateString() === today.toDateString();
                const hasNote = hasEntry(day);

                return (
                  <button
                    key={i}
                    onClick={() => selectDay(day)}
                    className={`
                      relative flex flex-col items-center justify-center h-10 rounded-xl transition-all active:scale-90
                      ${isSelectedDay ? "bg-foreground text-background" : isTodayCell ? "bg-muted text-foreground" : "text-foreground/70 hover:bg-muted/60"}
                    `}
                  >
                    <span className={`text-sm font-medium ${isSelectedDay ? "font-bold" : ""}`}>
                      {day.getDate()}
                    </span>
                    {hasNote && (
                      <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelectedDay ? "bg-background/60" : "bg-foreground/40"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={closeProfile}>
          <div className="w-full max-w-screen-sm bg-background rounded-[2.5rem] p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold">About me</h2>
              <button onClick={closeProfile} className="p-2 bg-muted rounded-full text-foreground/60 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 ml-1">Name</span>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-muted/50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-foreground/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center ml-1 mr-1">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40">About</span>
                  <span className={`text-[9px] tabular-nums ${profileBio.length > BIO_LIMIT ? "text-red-500" : "text-muted-foreground/30"}`}>
                    {profileBio.length} / {BIO_LIMIT}
                  </span>
                </div>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="A few words about yourself..."
                  rows={5}
                  className="w-full bg-muted/50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-foreground/10 transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 ml-1">Narration</span>
                <div className="flex rounded-2xl overflow-hidden bg-muted/50">
                  <button
                    onClick={() => setNarrationPerspective('first')}
                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${narrationPerspective === 'first' ? 'bg-foreground text-background' : 'text-muted-foreground/50'}`}
                  >
                    First person
                  </button>
                  <button
                    onClick={() => setNarrationPerspective('third')}
                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${narrationPerspective === 'third' ? 'bg-foreground text-background' : 'text-muted-foreground/50'}`}
                  >
                    Third person
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={clearProfile}
                className="py-3 px-5 rounded-full text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-red-500 border border-border/30 hover:border-red-500/20 transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={saveProfile}
                disabled={isSavingProfile || profileBio.length > BIO_LIMIT}
                className="flex-1 py-3 bg-foreground text-background rounded-full text-[11px] font-bold uppercase tracking-widest disabled:opacity-30 active:scale-[0.98] transition-all"
              >
                {isSavingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-screen-sm bg-background rounded-[2.5rem] p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold">How it works</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 bg-muted rounded-full text-foreground/60 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 text-sm text-foreground/80">
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 w-6 pt-0.5 shrink-0">1</span>
                <div>
                  <p className="font-semibold mb-0.5">Today — capture your thoughts</p>
                  <p className="text-muted-foreground/60 text-xs leading-relaxed">Throughout the day, write anything in the input field at the bottom. Press the arrow or Enter to save.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 w-6 pt-0.5 shrink-0">2</span>
                <div>
                  <p className="font-semibold mb-0.5">Interview — reflect on your day</p>
                  <p className="text-muted-foreground/60 text-xs leading-relaxed">At the end of the day, go to Interview. Tap "AI Insights" to get 5 personalized questions, answer each one, then tap "Complete Reflection".</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 w-6 pt-0.5 shrink-0">3</span>
                <div>
                  <p className="font-semibold mb-0.5">Diary — generate your diary page</p>
                  <p className="text-muted-foreground/60 text-xs leading-relaxed">Open Diary and tap the sync button next to today's date. The AI will write a literary narrative from your notes and answers.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 w-6 pt-0.5 shrink-0">4</span>
                <div>
                  <p className="font-semibold mb-0.5">Chronicle — review a period of life</p>
                  <p className="text-muted-foreground/60 text-xs leading-relaxed">Tap "+" in Chronicle, pick a date range, set detail and length, then tap "Generate". The AI will write a life summary for that period.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
