"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, CheckCircle2, User, Box, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // 1. Загрузка заметок из Supabase
  useEffect(() => {
    const fetchNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching:", error);
      } else if (data) {
        setNotes(data.map(n => ({
          id: n.id,
          text: n.content,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
        setTimeout(scrollToBottom, 100);
      }
    };
    
    fetchNotes();
  }, [router]);

  // 2. Функция синхронизации с Shell (AI Extract)
  const syncWithShell = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/extract', { method: 'POST' });
      if (res.ok) {
        alert("The Shell has been updated with new insights!");
      } else {
        const err = await res.json();
        console.error("Sync error:", err);
      }
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Авто-высота текстового поля
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // 4. Добавление заметки
  const addNote = async () => {
    if (!inputValue.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('entries')
      .insert([{ content: inputValue, user_id: user.id }])
      .select();

    if (error) {
      console.error("Error saving note:", error);
      return;
    }

    if (data) {
      const newNote = {
        id: data[0].id,
        text: data[0].content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setNotes(prev => [...prev, newNote]);
      setInputValue("");
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-question">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-end bg-background z-10">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Today</h1>
          <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1">
            Sunday, Jan 11
          </p>
        </div>

        <div className="flex gap-1">
          <button 
            onClick={syncWithShell}
            disabled={isSyncing}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all disabled:opacity-30"
            title="Sync with Shell"
          >
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Box size={20} strokeWidth={1.5} />}
          </button>
          
          <button 
            className="p-2 text-muted-foreground hover:text-foreground transition-all"
            onClick={() => router.push('/settings')}
          >
            <User size={20} strokeWidth={1.5} />
          </button>
          
          <button 
            className="p-2 text-muted-foreground hover:text-foreground transition-all active:scale-90"
            onClick={() => router.push('/interview')}
          >
            <CheckCircle2 size={22} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-8 no-scrollbar touch-pan-y"
      >
        {notes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground/30 text-[10px] uppercase tracking-widest">Page One is blank</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={note.id} className="group transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                  Entry {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/40">{note.time}</span>
              </div>
              <p className="text-lg leading-relaxed text-foreground/90 font-sans whitespace-pre-wrap">
                {note.text}
              </p>
            </div>
          ))
        )}
        <div className="h-10" />
      </div>

      {/* INPUT AREA */}
      <div className="px-6 pb-8 pt-2 bg-background/80 backdrop-blur-lg border-t border-border/5">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex items-end gap-3">
            <button className="w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-border transition-colors flex-shrink-0">
              <Plus size={20} className="text-muted-foreground" />
            </button>

            <div className="flex-1 bg-white dark:bg-zinc-100 rounded-[2rem] px-5 py-1 flex items-end gap-2 shadow-sm border border-gray-200 transition-all focus-within:ring-2 focus-within:ring-gray-100">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Record a thought..."
                className="flex-1 bg-transparent py-2.5 outline-none resize-none text-sm max-h-32 text-black font-sans placeholder:text-gray-400"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addNote();
                  }
                }}
              />
              
              <button 
                onClick={addNote}
                disabled={!inputValue.trim()}
                className="mb-1.5 p-2 bg-black text-white rounded-full disabled:opacity-0 transition-all active:scale-90 flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}