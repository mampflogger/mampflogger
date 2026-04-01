import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === "Invalid login credentials"
          ? "E-Mail oder Passwort falsch."
          : error.message);
      } else {
        navigate("/app");
      }
    } else {
      if (password.length < 6) {
        toast.error("Passwort muss mindestens 6 Zeichen lang sein.");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account erstellt! Du bist jetzt eingeloggt.");
        navigate("/app?settings=profile");
      }
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Passwort-Reset-Link wurde gesendet!");
      setShowReset(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="5" y="6" width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="9" y="8" width="3" height="9" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="13" y="3" width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">MampfLogger</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight mb-1">
              {showReset ? "Passwort zurücksetzen" : isLogin ? "Einloggen" : "Account erstellen"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showReset
                ? "Gib deine E-Mail ein und wir senden dir einen Reset-Link."
                : isLogin
                  ? "Melde dich an, um deine Daten zu synchronisieren."
                  : "Erstelle deinen kostenlosen Account."}
            </p>
          </div>

          {showReset ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-xs">E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 font-bold" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link senden
              </Button>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setShowReset(false)}>
                Zurück zum Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="display-name" className="text-xs">Name (optional)</Label>
                  <Input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Dein Name"
                    className="h-10"
                    maxLength={50}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    minLength={6}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-10 font-bold" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? "Einloggen" : "Registrieren"}
              </Button>
              {isLogin && (
                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setShowReset(true)}>
                  Passwort vergessen?
                </Button>
              )}
            </form>
          )}

          {!showReset && (
            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? "Noch kein Account? " : "Bereits registriert? "}
                <span className="text-primary font-semibold">{isLogin ? "Registrieren" : "Einloggen"}</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;
