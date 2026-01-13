"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Calendar,
  Filter,
  Loader2,
  Sparkles,
  X,
  BookOpen,
  Search,
  Trash2,
} from "lucide-react";

// Динамический импорт модалки
const FullStoryModal = dynamic(() => import("@/components/StoryModal"), {
  ssr: false,
});

export default function DiaryPage() {
  const router = useRouter();

  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  // lock body scroll when modal is open
  useEffect(() => {
    if (selectedPage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPage]);

  /* ---------------- data ---------------- */

  const fetchPages = async () => {
    const { data } = await supabase
      .from("daily_pages")
      .select("*")
      .order("date", { ascending: false });

    setPages(data || []);
    setLoading(false);
    setIsInitialLoading(false);
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
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Diary</h1>
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.2em] mt-1">
            Life Archive
          </p>
        </div>
        <div className="flex gap-5">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2.5 rounded-full transition-all ${
              showFilters
                ? "bg-muted text-foreground"
                : "text-muted-foreground/30 hover:text-foreground"
            }`}
          >
            <Filter size={20} />
          </button>
          <button
            onClick={handleSyncDay}
            disabled={isGenerating}
            className="p-2.5 bg-foreground text-background rounded-full disabled:opacity-30"
          >
            {isGenerating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} />
            )}
          </button>
        </div>
      </header>

      {/* FILTERS */}
      {showFilters && (
        <div className="px-6 mb-6 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30"
              size={16}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full bg-muted/30 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 bg-muted/30 rounded-xl px-3 py-2 text-[11px]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 bg-muted/30 rounded-xl px-3 py-2 text-[11px]"
            />
            {(startDate || endDate || searchQuery) && (
              <button onClick={clearFilters} className="p-2 text-red-500/40">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIST */}
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
              className={`py-8 cursor-pointer ${
                i !== 0 ? "border-t border-border/30" : ""
              }`}
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  Chapter {pages.length - i}
                </span>
                <span className="text-[10px] text-muted-foreground/40 italic">
                  {new Date(page.date).toLocaleDateString("en-US")}
                </span>
              </div>

              <h3 className="text-2xl font-serif font-bold mb-2">
                {page.title}
              </h3>

              <p className="text-[15px] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4">
                {page.content}
              </p>

              <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60 uppercase">
                <BookOpen size={10} />
                {page.word_count} words
              </div>
            </div>
          ))
        )}
      </div>

{/* ВМЕСТО СТАРОЙ МОДАЛКИ ПИШЕМ ЭТО: */}
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
