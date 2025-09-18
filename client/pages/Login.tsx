import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const raw = localStorage.getItem("app.users");
      const list: any[] = raw ? JSON.parse(raw) : [];
      const uname = username.trim().toLowerCase();
      const pwd = password.trim();
      const found = list.find((u) => {
        const uEmail = String(u.email || "").trim().toLowerCase();
        const uTeam = String(u.teamName || "").trim().toLowerCase();
        const uPass = String(u.password || "").trim();
        return (uEmail === uname || uTeam === uname) && uPass === pwd;
      });
      if (found) {
        sessionStorage.setItem("auth", "true");
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({ id: found.id, email: found.email, teamName: found.teamName, type: found.type })
        );
        toast({ title: "Signed in" });
        setTimeout(() => navigate("/", { replace: true }), 10);
        return;
      }
    } catch {}
    if (username === "Instantink@123" && password === "Rdl@12345") {
      sessionStorage.setItem("auth", "true");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({ id: "legacy", email: username, teamName: "Legacy Team", type: "HSV" })
      );
      toast({ title: "Signed in" });
      setTimeout(() => navigate("/", { replace: true }), 10);
    } else {
      toast({ title: "Invalid credentials" });
    }
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
                <label htmlFor="username" className="text-sm font-medium">Email</label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter email" />
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
