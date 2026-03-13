"use client";

import { useState } from "react";
import { X, Trash2, Loader2, Pencil, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DiaryPage {
  id: string;
  date: string;
  title: string;
  content: string;
  word_count: number;
}

interface FullStoryModalProps {
  page: DiaryPage;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: DiaryPage) => void;
  isDeleting: boolean;
}

export default function FullStoryModal({
  page,
  onClose,
  onDelete,
  onUpdate,
  isDeleting
}: FullStoryModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(page.title);
  const [editContent, setEditContent] = useState(page.content);
  const [isSaving, setIsSaving] = useState(false);

  if (!page) return null;

  const saveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    const word_count = editContent.trim().split(/\s+/).length;
    const { error } = await supabase
      .from("daily_pages")
      .update({ title: editTitle, content: editContent, word_count })
      .eq("id", page.id);
    if (!error) {
      onUpdate({ ...page, title: editTitle, content: editContent, word_count });
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const cancelEdit = () => {
    setEditTitle(page.title);
    setEditContent(page.content);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-xl"
        onClick={isEditing ? undefined : onClose}
      />

      {/* MODAL WINDOW */}
      <div
        className="relative w-full max-w-2xl bg-background rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-h-[95dvh] flex flex-col animate-in slide-in-from-bottom-10 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center px-8 pt-8 pb-4 sticky top-0 bg-background z-20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
              {new Date(page.date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </span>

            {!isEditing && (
              <button
                onClick={() => onDelete(page.id)}
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
                <button
                  onClick={cancelEdit}
                  className="text-[10px] uppercase tracking-widest px-3 py-1.5 text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 bg-foreground text-background rounded-full disabled:opacity-40"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-muted rounded-full text-foreground/70 active:scale-90 transition-transform"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FADE TOP */}
        <div className="pointer-events-none absolute top-[72px] left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10" />

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6 no-scrollbar relative z-0">
          {isEditing ? (
            <div className="space-y-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-4xl font-serif font-bold leading-tight bg-transparent outline-none border-b border-border/30 pb-2 mb-6"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-[1.1875rem] font-serif leading-relaxed bg-muted/20 rounded-2xl p-4 outline-none resize-none focus:ring-1 focus:ring-foreground/10 min-h-[300px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-serif font-bold mb-10 leading-tight">
                {page.title}
              </h2>
              <div className="space-y-8">
                {page.content.split("\n").map((p, i) => (
                  <p
                    key={i}
                    className={`text-[1.1875rem] font-serif leading-relaxed ${
                      i === 0
                        ? "first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left"
                        : ""
                    }`}
                  >
                    {p}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FADE BOTTOM */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      </div>
    </div>
  );
}
