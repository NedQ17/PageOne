"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background px-8 pt-safe justify-center animate-question">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">
          Welcome
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest mt-2 leading-relaxed">
          Continue your story
        </p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-foreground text-background rounded-full py-4 font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="currentColor" fillOpacity=".6"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="currentColor" fillOpacity=".8"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="currentColor"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="currentColor" fillOpacity=".7"/>
            </svg>
            Sign in with Google
          </>
        )}
      </button>
    </div>
  );
}
