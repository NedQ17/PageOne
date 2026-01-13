"use client";

import { X, Trash2, Loader2 } from "lucide-react";

interface FullStoryModalProps {
  page: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function FullStoryModal({ 
  page, 
  onClose, 
  onDelete, 
  isDeleting 
}: FullStoryModalProps) {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-xl"
        onClick={onClose}
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
              {new Date(page.date).toLocaleDateString("en-US", {
                dateStyle: "long",
              })}
            </span>

            {/* DELETE BUTTON */}
            <button
              onClick={() => onDelete(page.id)}
              disabled={isDeleting}
              className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors"
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>

          {/* CLOSE BUTTON */}
          <div className="flex items-center">
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
          <h2 className="text-4xl font-serif font-bold mb-10 leading-tight">
            {page.title}
          </h2>

          <div className="space-y-8">
            {page.content.split("\n").map((p: string, i: number) => (
              <p
                key={i}
                className={`text-[19px] font-serif leading-relaxed ${
                  i === 0
                    ? "first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left"
                    : ""
                }`}
              >
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* FADE BOTTOM */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      </div>
    </div>
  );
}