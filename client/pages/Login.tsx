// Login page: authenticates a team user by calling the server's admin/login endpoint.
// Imports common UI components and hooks for navigation and toasts.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

// Exported default React component for user login.
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // handleLogin: attempts to sign in via POST /api/admin/login.
  // On success, stores a minimal session profile and navigates to '/'.
  // A small legacy fallback is kept for development; remove if not needed.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = username.trim();
    const pwd = password.trim();
    // Try server login for both admin and users
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string; teamName: string; email: string; type: "HSV" | "OSV" };
        sessionStorage.setItem("auth", "true");
        sessionStorage.setItem("currentUser", JSON.stringify(data));
        toast({ title: "Signed in" });
        setTimeout(() => navigate("/", { replace: true }), 10);
        return;
      }
    } catch {}
    // Legacy admin fallback
    if (email === "Instantink@123" && pwd === "Rdl@12345") {
      sessionStorage.setItem("auth", "true");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({ id: "legacy", email, teamName: "Legacy Team", type: "HSV" })
      );
      toast({ title: "Signed in" });
      setTimeout(() => navigate("/", { replace: true }), 10);
      return;
    }
    toast({ title: "Invalid credentials" });
  };

  return (
    <main className="container py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            Get your Ek-Code
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage Ek-Codes across regions in simple steps
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or email" />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
              </div>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
