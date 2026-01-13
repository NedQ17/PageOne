"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import {
  Calendar,
  Filter,
  Loader2,
  Sparkles,
  X,
  BookOpen,
  Search,
} from "lucide-react";

// Динамический импорт модалки для оптимизации веса страницы
const FullStoryModal = dynamic(() => import("@/components/StoryModal"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[100]" />
});

export default function DiaryPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPage, setSelectedPage] = useState<any>(null);

  /* ---------------- effects ---------------- */

  useEffect(() => {
    fetchPages();
  }, []);

  // Блокировка скролла при открытой модалке
  useEffect(() => {
    document.body.style.overflow = selectedPage ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedPage]);

  /* ---------------- data ---------------- */

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_pages")
      .select("*")
      .order("date", { ascending: false });

    setPages(data || []);
    setLoading(false);
  };

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch =
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase());

      const pageDate = page.date;
      const matchesStart = !startDate || pageDate >= startDate;
      const matchesEnd = !endDate || pageDate <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [pages, searchQuery, startDate, endDate]);

  /* ---------------- actions ---------------- */

  const handleSyncDay = async () => {
    const today = new Date().toLocaleDateString("en-CA");
    const existingPage = pages.find((p) => p.date === today);

    if (existingPage) {
      if (!confirm("A story for today already exists. Re-generate and overwrite?"))
        return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-diary-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }

      await fetchPages();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter forever?")) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("daily_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPages((prev) => prev.filter((p) => p.id !== id));
      setSelectedPage(null);
    } catch (e: any) {
      alert("Error deleting: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background font-sans animate-question">
      
      {/* STICKY HEADER & FILTERS */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <header className="px-6 pt-12 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Diary</h1>
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.2em] mt-1">
              Life Archive
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`p-2.5 rounded-full transition-all ${
                showFilters
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground/30 hover:text-foreground hover:bg-muted"
              }`}
            >
              <Filter size={20} />
            </button>
            <button
              onClick={handleSyncDay}
              disabled={isGenerating}
              className="p-2.5 bg-foreground text-background rounded-full disabled:opacity-30 active:scale-95 transition-all shadow-lg"
            >
              {isGenerating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Sparkles size={20} />
              )}
            </button>
          </div>
        </header>

{/* FILTERS AREA */}
{showFilters && (
  <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
    {/* Поиск */}
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search memories..."
        className="w-full bg-muted/50 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-foreground/10 transition-all"
      />
    </div>

    {/* Календари (Даты) */}
    <div className="grid grid-cols-2 gap-3"> 
      <div className="relative flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 ml-2">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-muted/80 transition-all appearance-none"
        />
      </div>
      <div className="relative flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 ml-2">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-muted/80 transition-all appearance-none"
        />
      </div>
    </div>

    {/* Кнопка сброса — показывается только если фильтры активны */}
    {(startDate || endDate || searchQuery) && (
      <button 
        onClick={clearFilters} 
        className="w-full py-2 text-[10px] uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors border border-red-500/10 rounded-xl"
      >
        Reset Filters
      </button>
    )}
  </div>
)}      </div>

      {/* SCROLLABLE LIST */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {loading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="animate-spin opacity-20" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center pt-32 opacity-20">
            <Calendar size={40} className="mx-auto mb-4" />
            <p className="text-xs uppercase tracking-widest">No entries found</p>
          </div>
        ) : (
          filteredPages.map((page, i) => (
            <div
              key={page.id}
              onClick={() => setSelectedPage(page)}
              className={`py-10 cursor-pointer group ${
                i !== 0 ? "border-t border-border/30" : ""
              }`}
            >
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  Chapter {pages.length - i}
                </span>
                <span className="text-[10px] text-muted-foreground/40 italic">
                  {new Date(page.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-muted-foreground transition-colors">
                {page.title}
              </h3>

              <p className="text-[16px] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4 leading-relaxed">
                {page.content}
              </p>

              <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 uppercase tracking-tight">
                <BookOpen size={10} />
                {page.word_count} words
              </div>
            </div>
          ))
        )}
      </div>

      {/* DYNAMIC MODAL */}
      {selectedPage && (
        <FullStoryModal 
          page={selectedPage}
          onClose={() => setSelectedPage(null)}
          onDelete={deletePage}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}