"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Filter, Loader2, Sparkles, X, BookOpen } from "lucide-react";

export default function DiaryPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Состояние для модального окна
  const [selectedPage, setSelectedPage] = useState<any>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data } = await supabase
      .from('daily_pages')
      .select('*')
      .order('date', { ascending: false });
    setPages(data || []);
    setLoading(false);
  };

  const handleSyncDay = async () => {
    const today = new Date().toISOString().split('T')[0];
    const existingPage = pages.find(p => p.date === today);

    if (existingPage) {
      const confirmOverwrite = confirm(
        "A story for today already exists. Do you want to re-generate it? This will overwrite the current version."
      );
      if (!confirmOverwrite) return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-diary-page', { method: 'POST' });
      if (res.ok) await fetchPages();
    } catch (e) {
      alert("Error generating page");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background px-6 relative">
      {/* Header */}
      <header className="pt-12 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Diary</h1>
          <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1">
            Archive of your life
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncDay}
            disabled={isGenerating}
            className="p-2 bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          </button>
          <button className="p-2 text-muted-foreground/50 hover:text-foreground">
            <Filter size={20} />
          </button>
        </div>
      </header>

      {/* Список страниц */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20">
        {loading ? (
          <div className="flex justify-center pt-20"><Loader2 className="animate-spin opacity-20" /></div>
        ) : pages.length === 0 ? (
          <div className="text-center pt-20 opacity-40">
            <Calendar size={40} className="mx-auto mb-4" />
            <p className="text-sm font-serif italic">Your story begins today...</p>
          </div>
        ) : (
          pages.map((page, i) => (
            <div 
              key={page.id} 
              onClick={() => setSelectedPage(page)}
              className="relative p-6 rounded-[2rem] border border-border/40 hover:border-border transition-all group cursor-pointer bg-muted/5 active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-foreground text-background text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                  Ch. {pages.length - i}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/40 italic">
                  {new Date(page.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <h3 className="text-xl font-serif font-medium text-foreground mb-1 group-hover:translate-x-1 transition-transform">
                {page.title}
              </h3>
              
              <p className="text-sm text-muted-foreground line-clamp-2 font-serif italic opacity-80 mb-4">
                {page.content}
              </p>
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">
                  {page.word_count} words
                </span>
                <BookOpen size={12} className="text-muted-foreground/30 group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL OVERLAY */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setSelectedPage(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-background border-t sm:border border-border/50 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">
                  Archive
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(selectedPage.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                </span>
              </div>
              <button 
                onClick={() => setSelectedPage(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-8 pb-12 pt-4 no-scrollbar">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-8 leading-tight">
                {selectedPage.title}
              </h2>
              
              <div className="prose prose-stone">
                {selectedPage.content.split('\n').map((paragraph: string, idx: number) => {
                  // Базовые стили для всех параграфов
                  const baseStyles = "text-lg font-serif text-foreground/90 leading-relaxed mb-6";
                  // Стили буквицы только для первого параграфа (idx === 0)
                  const dropCapStyles = idx === 0 ? "first-letter:text-3xl first-letter:font-bold first-letter:mr-1" : "";
                  
                  return (
                    <p 
                      key={idx} 
                      className={`${baseStyles} ${dropCapStyles}`}
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              <div className="mt-12 pt-8 border-t border-border/20 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
                <span>End of Chapter</span>
                <span>{selectedPage.word_count} Words Total</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}