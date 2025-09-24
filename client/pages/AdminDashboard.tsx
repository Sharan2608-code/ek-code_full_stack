// AdminDashboard: Admin-only page to manage users (teams), tickets (Ek-codes),
// and view activity history. Uses server-backed APIs under /api/* and
// MongoDB via the Express server.
"use client";

import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

// Types and helpers used by this page.
// Local storage schema keys were removed after DB migration; only some
// local tracking remains (e.g., assigned_by_user for tooltip details).

type User = {
  id: string;
  teamName: string;
  email: string;
  password: string;
  type: "HSV" | "OSV";
  assigned: number;
};

type Pool = { available: string[]; used: string[] };
type TicketsStore = {
  HSV: Pool;
  OSV: Pool;
  Common: Pool;
};

// LocalStorage helpers removed after DB migration for users and tickets

// parseCsv: parse CSV text where each line is code,type (optional type).
// Validates code length and characters; defaults type to HSV when omitted.
function parseCsv(
  text: string
): { code: string; type: "HSV" | "OSV" | "Common" }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: { code: string; type: "HSV" | "OSV" | "Common" }[] = [];
  for (const line of lines) {
    const parts = line.split(/,|;|\t/).map((p) => p.trim());
    const code = (parts[0] || "").toUpperCase();
    const typeRaw = (parts[1] || "HSV").toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) continue;
    const type =
      typeRaw === "OSV" ? "OSV" : typeRaw === "COMMON" ? "Common" : "HSV";
    out.push({ code, type });
  }
  return out;
}

// Exported page component. Loads users and available tickets from the server,
// provides CRUD UI for users and tickets, and shows Activity History.
export default function AdminDashboard() {
  const { toast } = useToast();
  const isAdmin =
    typeof window !== "undefined" && sessionStorage.getItem("admin") === "true";
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  // Load users from DB instead of localStorage
  // On mount: fetch users list from /api/users
  useEffect(() => {
    const refreshUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          id: string;
          teamName: string;
          email: string;
          type: "HSV" | "OSV";
        }>;
        const list: User[] = data.map((u) => ({
          id: u.id,
          teamName: u.teamName,
          email: u.email,
          password: "",
          type: u.type,
          assigned: 0,
        }));
        setUsers(list);
      } catch {}
    };
    refreshUsers();
  }, []);
  const [tickets, setTickets] = useState<TicketsStore>(() => ({
    HSV: { available: [], used: [] },
    OSV: { available: [], used: [] },
    Common: { available: [], used: [] },
  }));
  // Periodic re-render tick used only to reflect localStorage-based counts
  // (assigned_by_user tooltip). We ignore the state value to avoid lint warnings.
  const [, setLsTick] = useState(0);

  // User form state
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Removed type selection from admin form; default is handled server-side (HSV if unspecified)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  // removed editingAssigned; assignment counts are derived on the fly from localStorage map

  // Ticket form state
  const [codesText, setCodesText] = useState("");
  const [codesType, setCodesType] = useState<"HSV" | "OSV" | "Common">("HSV");
  const [teamsQuery, setTeamsQuery] = useState("");
  const [poolsQuery, setPoolsQuery] = useState("");
  const [deleteCodesText, setDeleteCodesText] = useState("");

  // Users and tickets are persisted in DB now
  // Load pools from DB on mount
  // On mount: fetch available tickets by pool from /api/db/tickets/available
  useEffect(() => {
    const refreshFromDB = async () => {
      try {
        const res = await fetch("/api/db/tickets/available");
        if (!res.ok) return;
        const data = (await res.json()) as {
          byPool?: { HSV: string[]; OSV: string[]; Common: string[] };
        };
        const byPool = data.byPool || { HSV: [], OSV: [], Common: [] };
        setTickets({
          HSV: {
            available: Array.isArray(byPool.HSV) ? byPool.HSV : [],
            used: [],
          },
          OSV: {
            available: Array.isArray(byPool.OSV) ? byPool.OSV : [],
            used: [],
          },
          Common: {
            available: Array.isArray(byPool.Common) ? byPool.Common : [],
            used: [],
          },
        });
      } catch {}
    };
    refreshFromDB();
  }, []);
  // Force periodic re-render to reflect localStorage changes (assigned_by_user counts)
  // Periodic refresh to keep tooltip counts in sync with localStorage
  useEffect(() => {
    const id = setInterval(() => setLsTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Combined server-backed history
  type HistoryRow = {
    _id?: string;
    type: "generated" | "submitted" | "cleared";
    teamMember?: string;
    country?: string;
    code: string;
    comments?: string;
    clearanceId?: string;
    date: string;
    userId?: string;
  };
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history?limit=300");
        if (!res.ok) return;
        const data = (await res.json()) as { items: HistoryRow[] };
        const items = Array.isArray(data.items) ? data.items : [];
        // normalize id and sort desc
        items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setHistoryRows(items);
      } catch {}
    };
    fetchHistory();
    const id = setInterval(fetchHistory, 5000);
    return () => clearInterval(id);
  }, []);

  const totalAvailable =
    tickets.HSV.available.length +
    tickets.OSV.available.length +
    tickets.Common.available.length;
  const totalUsed =
    tickets.HSV.used.length +
    tickets.OSV.used.length +
    tickets.Common.used.length;
  const totalTickets = totalAvailable + totalUsed;

  const totalUsers = users.length;

  // handleCreateUser: creates a new team via POST /api/users, then refreshes list
  const handleCreateUser = () => {
    const t = teamName.trim();
    const e = email.trim();
    const p = password.trim();
    if (!t || !e || !p) {
      toast({ title: "Please fill all team fields" });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamName: t, email: e, password: p }),
        });
        if (!res.ok) {
          const msg =
            res.status === 409
              ? "Team already exists"
              : "Failed to create team";
          toast({ title: msg });
          return;
        }
        // refresh users
        const listRes = await fetch("/api/users");
        if (listRes.ok) {
          const data = (await listRes.json()) as Array<{
            id: string;
            teamName: string;
            email: string;
            type: "HSV" | "OSV";
          }>;
          const list: User[] = data.map((u) => ({
            id: u.id,
            teamName: u.teamName,
            email: u.email,
            password: "",
            type: u.type,
            assigned: 0,
          }));
          setUsers(list);
        }
        setTeamName("");
        setEmail("");
        setPassword("");
        // type not exposed in UI; server defaults will apply
        toast({ title: "Team created" });
      } catch {
        toast({ title: "Failed to create team" });
      }
    })();
  };

  // handleEditUser: loads an existing team into form state for editing
  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setTeamName(user.teamName);
    setEmail(user.email);
    setPassword(user.password);
    setEditingUserId(userId);
    // editingAssigned removed
    toast({ title: "Team loaded for editing" });
  };

  // handleUpdateUser: updates a team via PUT /api/users/:id, then refreshes list
  const handleUpdateUser = (userId: string) => {
    const t = teamName.trim();
    const e = email.trim();
    const p = password.trim();
    (async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName: t,
            email: e,
            password: p || undefined,
          }),
        });
        if (!res.ok) {
          toast({ title: "Failed to update team" });
          return;
        }
        const listRes = await fetch("/api/users");
        if (listRes.ok) {
          const data = (await listRes.json()) as Array<{
            id: string;
            teamName: string;
            email: string;
            type: "HSV" | "OSV";
          }>;
          const list: User[] = data.map((u) => ({
            id: u.id,
            teamName: u.teamName,
            email: u.email,
            password: "",
            type: u.type,
            assigned: 0,
          }));
          setUsers(list);
        }
        setTeamName("");
        setEmail("");
        setPassword("");
        // type not exposed in UI; server defaults will apply
        setEditingUserId(null);
        // editingAssigned removed
        toast({ title: "Team updated" });
      } catch {
        toast({ title: "Failed to update team" });
      }
    })();
  };

  // handleDeleteUser: deletes a team via DELETE /api/users/:id, then refreshes list
  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (
      !confirm(
        `Are you sure you want to delete team "${user.teamName}" (${user.email})?`
      )
    )
      return;
    (async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast({ title: "Failed to delete team" });
          return;
        }
        const listRes = await fetch("/api/users");
        if (listRes.ok) {
          const data = (await listRes.json()) as Array<{
            id: string;
            teamName: string;
            email: string;
            type: "HSV" | "OSV";
          }>;
          const list: User[] = data.map((u) => ({
            id: u.id,
            teamName: u.teamName,
            email: u.email,
            password: "",
            type: u.type,
            assigned: 0,
          }));
          setUsers(list);
        }
        toast({ title: "Team deleted" });
      } catch {
        toast({ title: "Failed to delete team" });
      }
    })();
  };

  // handleCsvUpload: import codes from CSV into DB via /api/db/tickets/import
  const handleCsvUpload = async (file: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast({ title: "Only CSV supported in UI for now" });
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      toast({ title: "No valid rows in CSV" });
      return;
    }
    try {
      const items = parsed.map(({ code, type }) => ({
        code,
        pool: type as any,
      }));
      const res = await fetch("/api/db/tickets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("import_failed");
      const { inserted } = (await res.json()) as { inserted: number };
      // Refresh pools from DB
      const avRes = await fetch("/api/db/tickets/available");
      if (avRes.ok) {
        const data = (await avRes.json()) as {
          byPool?: { HSV: string[]; OSV: string[]; Common: string[] };
        };
        const byPool = data.byPool || { HSV: [], OSV: [], Common: [] };
        setTickets({
          HSV: {
            available: Array.isArray(byPool.HSV) ? byPool.HSV : [],
            used: [],
          },
          OSV: {
            available: Array.isArray(byPool.OSV) ? byPool.OSV : [],
            used: [],
          },
          Common: {
            available: Array.isArray(byPool.Common) ? byPool.Common : [],
            used: [],
          },
        });
      }
      toast({
        title: `Imported ${inserted} code${inserted === 1 ? "" : "s"} from CSV`,
      });
    } catch {
      toast({ title: "Failed to import CSV" });
    }
  };

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <main className="container py-10 space-y-8">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              sessionStorage.removeItem("admin");
            } catch {}
            navigate("/admin/login", { replace: true });
          }}
        >
          Logout
        </Button>
      </div>
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage users, tickets, and monitoring
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {totalTickets}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Used Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {totalUsed}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {totalAvailable}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create/Edit Team account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-team">Team name</Label>
              <Input
                id="u-team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-mail">Team mail</Label>
              <Input
                id="u-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter team email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Password</Label>
              <Input
                id="u-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            {/* Type selection removed from admin form */}
            <Button
              onClick={() =>
                editingUserId
                  ? handleUpdateUser(editingUserId)
                  : handleCreateUser()
              }
              className="w-full"
            >
              {editingUserId ? "Update Team" : "Create Team"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Input
                placeholder="Search teams (name or email)"
                value={teamsQuery}
                onChange={(e) => setTeamsQuery(e.target.value)}
              />
            </div>
            <Table>
              <TableCaption>Total users: {totalUsers}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Codes assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter(
                    (u) =>
                      !teamsQuery.trim() ||
                      u.teamName
                        .toLowerCase()
                        .includes(teamsQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(teamsQuery.toLowerCase())
                  )
                  .map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.teamName}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.type}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="underline decoration-dotted cursor-help">
                                {(() => {
                                  try {
                                    const raw = localStorage.getItem(
                                      "app.assigned_by_user"
                                    );
                                    const map = raw
                                      ? (JSON.parse(raw) as Record<
                                          string,
                                          Array<
                                            | string
                                            | { code: string; section?: string }
                                          >
                                        >)
                                      : {};
                                    const list = Array.isArray(map[u.id])
                                      ? map[u.id]
                                      : [];
                                    return list.length;
                                  } catch {
                                    return 0;
                                  }
                                })()}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs text-left">
                                {(() => {
                                  try {
                                    const raw = localStorage.getItem(
                                      "app.assigned_by_user"
                                    );
                                    const map = raw
                                      ? (JSON.parse(raw) as Record<
                                          string,
                                          Array<
                                            | string
                                            | { code: string; section?: string }
                                          >
                                        >)
                                      : {};
                                    const list = Array.isArray(map[u.id])
                                      ? map[u.id]
                                      : [];
                                    return list.length ? (
                                      <ul className="list-disc pl-4">
                                        {list.map((item) => {
                                          const key =
                                            typeof item === "string"
                                              ? item
                                              : item?.code;
                                          const code =
                                            typeof item === "string"
                                              ? item
                                              : item?.code;
                                          const section =
                                            typeof item === "string"
                                              ? ""
                                              : item?.section || "";
                                          return (
                                            <li
                                              key={key}
                                              className="font-mono text-xs"
                                            >
                                              {code}
                                              {section ? ` — ${section}` : ""}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        No codes assigned
                                      </span>
                                    );
                                  } catch {
                                    return (
                                      <span className="text-xs text-muted-foreground">
                                        No codes
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(u.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            Delete
                          </Button>
                          {/* Removed arrow button that navigates to user page */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {!users.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No teams yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Ek-code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type for manual entries</Label>
              <RadioGroup
                value={codesType}
                onValueChange={(v) => setCodesType(v as any)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ct-hsv" value="HSV" />
                  <Label htmlFor="ct-hsv">HSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ct-osv" value="OSV" />
                  <Label htmlFor="ct-osv">OSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ct-common" value="Common" />
                  <Label htmlFor="ct-common">Common</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codes">
                Enter one code per line (10 chars A–Z, 0–9)
              </Label>
              <Textarea
                id="codes"
                value={codesText}
                onChange={(e) => setCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
                className="min-h-[120px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                className="text-sm"
                type="file"
                accept=".csv"
                onChange={(e) =>
                  e.target.files && handleCsvUpload(e.target.files[0])
                }
              />
              <span className="text-sm text-muted-foreground">
                CSV format: code,type (HSV|OSV|Common)
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleAddTickets}
              className="sm:w-auto w-full"
            >
              Add to available
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Ek-code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-codes">
                Enter codes to delete from available (one per line)
              </Label>
              <Textarea
                id="del-codes"
                value={deleteCodesText}
                onChange={(e) => setDeleteCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
                className="min-h-[120px]"
              />
            </div>
            <Button
              size="sm"
              className="sm:w-auto w-full"
              variant="destructive"
              onClick={handleDeleteTickets}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Ek-code Pools section */}
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            Ek-code Pools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input
              placeholder="Search Ek-codes across pools"
              value={poolsQuery}
              onChange={(e) => setPoolsQuery(e.target.value)}
            />
          </div>
          {poolsQuery.trim() && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Search results</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const q = poolsQuery.trim().toUpperCase();
                  const results: Array<{
                    code: string;
                    section: "HSV" | "OSV" | "Common";
                  }> = [];
                  tickets.HSV.available.forEach((c) => {
                    if (c.includes(q))
                      results.push({ code: c, section: "HSV" });
                  });
                  tickets.OSV.available.forEach((c) => {
                    if (c.includes(q))
                      results.push({ code: c, section: "OSV" });
                  });
                  tickets.Common.available.forEach((c) => {
                    if (c.includes(q))
                      results.push({ code: c, section: "Common" });
                  });
                  return results.length ? (
                    results.map(({ code, section }) => (
                      <span
                        key={`${section}-${code}`}
                        className="px-2 py-1 rounded bg-accent font-mono text-xs"
                      >
                        {code} — {section}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No matches
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="hsv">
              <AccordionTrigger>HSV Codes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {tickets.HSV.available.length} | Used:{" "}
                    {tickets.HSV.used.length}
                  </div>
                  {!!tickets.HSV.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.HSV.available
                          .filter(
                            (c) =>
                              !poolsQuery ||
                              c.includes(poolsQuery.toUpperCase())
                          )
                          .map((c) => (
                            <span
                              key={c}
                              className="px-2 py-1 rounded bg-accent font-mono text-xs"
                            >
                              {c}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="osv">
              <AccordionTrigger>OSV Codes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {tickets.OSV.available.length} | Used:{" "}
                    {tickets.OSV.used.length}
                  </div>
                  {!!tickets.OSV.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.OSV.available
                          .filter(
                            (c) =>
                              !poolsQuery ||
                              c.includes(poolsQuery.toUpperCase())
                          )
                          .map((c) => (
                            <span
                              key={c}
                              className="px-2 py-1 rounded bg-accent font-mono text-xs"
                            >
                              {c}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="common">
              <AccordionTrigger>Common Codes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {tickets.Common.available.length} | Used:{" "}
                    {tickets.Common.used.length}
                  </div>
                  {!!tickets.Common.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.Common.available
                          .filter(
                            (c) =>
                              !poolsQuery ||
                              c.includes(poolsQuery.toUpperCase())
                          )
                          .map((c) => (
                            <span
                              key={c}
                              className="px-2 py-1 rounded bg-accent font-mono text-xs"
                            >
                              {c}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input
              placeholder="Search by date, team, or EK-code"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
            />
          </div>
          <div className="overflow-auto">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-2">When</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Team</th>
                  <th className="py-2 px-2">Country</th>
                  <th className="py-2 px-2">EK-code</th>
                  <th className="py-2 px-2">Comments/Clearance</th>
                </tr>
              </thead>
              <tbody>
                {historyRows
                  .filter((h) => {
                    if (!historyQuery.trim()) return true;
                    const q = historyQuery.trim().toLowerCase();
                    return (
                      (h.teamMember || "").toLowerCase().includes(q) ||
                      (h.code || "").toLowerCase().includes(q) ||
                      (h.country || "").toLowerCase().includes(q) ||
                      new Date(h.date)
                        .toLocaleString()
                        .toLowerCase()
                        .includes(q)
                    );
                  })
                  .map((h, i) => {
                    const team = users.find(
                      (u) => u.id === (h as any).userId
                    )?.teamName;
                    return (
                      <tr
                        key={(h as any)._id || i}
                        className={"border-b"}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#a082ca" : "#f2eef9",
                          color: i % 2 === 0 ? "#ffffff" : "#111111",
                        }}
                      >
                        <td className="py-2 px-2 whitespace-nowrap">
                          {new Date(h.date).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 capitalize">{h.type}</td>
                        <td className="py-2 px-2">
                          {h.teamMember || team || "-"}
                        </td>
                        <td className="py-2 px-2">{h.country || "-"}</td>
                        <td className="py-2 px-2 font-mono">{h.code}</td>
                        <td className="py-2 px-2">
                          {h.type === "cleared"
                            ? h.clearanceId || "-"
                            : h.comments || "-"}
                        </td>
                      </tr>
                    );
                  })}
                {!historyRows.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No history yet
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />
    </main>
  );
}
