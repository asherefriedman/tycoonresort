import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Google sign-in failed");
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3"
      style={{
        background: "linear-gradient(170deg, #0a1628 0%, #0d2440 40%, #1a3a5c 70%, #0d2440 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(14px,2.5vw,20px)", color: "rgba(212,168,68,0.85)", letterSpacing: "8px" }}>
        The
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px,8vw,72px)", color: "#fff", letterSpacing: "5px", lineHeight: 0.9, textAlign: "center" }}>
        GRAND<br />MERIDIAN
      </div>
      <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,68,0.8), transparent)", margin: "2px 0" }} />
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 5, textTransform: "uppercase", marginBottom: 8 }}>
        Luxury Resort & Spa
      </div>

      <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 w-72">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 48px",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 4,
            background: "transparent",
            border: "1px solid rgba(212,168,68,0.5)",
            borderRadius: 2,
            color: "#d4a844",
            cursor: "pointer",
          }}>
          {loading ? "..." : isSignUp ? "SIGN UP" : "SIGN IN"}
        </button>
      </form>

      <button
        onClick={handleGoogleSignIn}
        style={{
          padding: "10px 32px",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 3,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 2,
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          width: 288,
        }}>
        SIGN IN WITH GOOGLE
      </button>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        style={{
          background: "none",
          border: "none",
          color: "rgba(212,168,68,0.55)",
          fontSize: 11,
          letterSpacing: 2,
          cursor: "pointer",
          marginTop: 4,
        }}>
        {isSignUp ? "ALREADY HAVE AN ACCOUNT? SIGN IN" : "NO ACCOUNT? SIGN UP"}
      </button>
    </div>
  );
};

export default Auth;
