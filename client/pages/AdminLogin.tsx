// AdminLogin page: simple admin-only login screen.
// Imports UI components and hooks for navigation and toasts.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";

// Exported default React component for the admin login page.
export default function AdminLogin() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  // onAdminLogin: handles form submit. Currently validates against
  // a fixed credential pair and, on success, stores a session flag
  // and navigates to the Admin Dashboard.
  const onAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === "Instantink@2025" && adminPassword === "Rdl@12345") {
      sessionStorage.setItem("admin", "true");
      navigate("/admin", { replace: true });
    } else {
      toast({ title: "Invalid admin credentials" });
    }
  };

  return (
    <main className="container py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            Admin Login
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to manage users and tickets
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onAdminLogin}>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-pass">Password</Label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
