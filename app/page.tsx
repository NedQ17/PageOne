"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  CheckCircle2,
  User,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Note {
  id: string;
  text: string;
  time: string;
}

export default function ThisDay() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Состояние для предотвращения скачков

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setEditingId(null);
  };

  useEffect(() => {
    const fetchNotes = async () => {
      // При смене даты можно оставить текущий экран, либо добавить легкий лоадер
      const { data: { user } } = await supabase.auth.getUser();
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
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: true });

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
      // Выключаем загрузку только ПОСЛЕ того, как данные попали в state
      setIsInitialLoading(false);
      setTimeout(scrollToBottom, 50);
    };

    fetchNotes();
  }, [router, selectedDate]);

  const addNote = async () => {
    if (!inputValue.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("entries")
      .insert([{ content: inputValue, user_id: user.id }])
      .select();

    if (!error && data?.[0]) {
      const newNote = {
        id: data[0].id,
        text: data[0].content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setNotes((prev) => [...prev, newNote]);
      setInputValue("");
      setTimeout(scrollToBottom, 100);
    }
  };

  const saveEdit = async (noteId: string) => {
    if (!editValue.trim()) return;
    const { error } = await supabase.from("entries").update({ content: editValue }).eq("id", noteId);
    if (!error) {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text: editValue } : n)));
      setEditingId(null);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("entries").delete().eq("id", noteId);
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

  // Если данные еще грузятся, показываем пустой экран того же цвета, что и фон, 
  // чтобы не было вспышек белого или пустых блоков хедера
  if (isInitialLoading) {
    return <div className="h-full bg-background" />;
  }

  return (
    <div className="flex flex-col h-full bg-background animate-question font-sans selection:bg-foreground selection:text-background">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-end bg-background z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-muted rounded-full text-muted-foreground/40 hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
              {isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
            </h1>
            <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1 opacity-50">
              {formattedDate}
            </p>
          </div>
          <button
            onClick={() => changeDate(1)}
            className={`p-1 hover:bg-muted rounded-full text-muted-foreground/40 hover:text-foreground transition-colors ${isToday ? "opacity-0 pointer-events-none" : ""}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-1">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-all" onClick={() => router.push("/settings")}>
            <User size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-all active:scale-90" onClick={() => router.push("/interview")}>
            <CheckCircle2 size={22} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
<div
  ref={scrollContainerRef}
  className="overflow-y-auto px-6 py-4"
  style={{ height: "calc(100dvh - 120px)" }}
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
                  Entry {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{note.time}</span>
              </div>

              {editingId === note.id ? (
                <div className="relative group/edit mt-2">
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(note.id); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full p-4 pb-14 bg-muted/30 rounded-2xl border border-border/50 text-lg leading-relaxed resize-none focus:outline-none font-serif"
                    rows={Math.max(3, editValue.split("\n").length)}
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
        <div className="h-32" />
      </div>

      {/* INPUT AREA */}
      {isToday && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 pt-6 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
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
    </div>
  );
}