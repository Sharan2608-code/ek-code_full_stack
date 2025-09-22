"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function copyToClipboard(text: string) {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function formatPrettyDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  const day = d.getDate();
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const suffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    const last = n % 10;
    if (last === 1) return "st";
    if (last === 2) return "nd";
    if (last === 3) return "rd";
    return "th";
  };
  return `${day}${suffix(day)} ${month} ${year}`;
}

function detectRegion(countryInput: string): {
  apiRegion: "NA" | "EU" | "FE" | "";
  display: "NA" | "EU" | "Asia" | "";
} {
  const c = countryInput.trim().toLowerCase();
  if (!c) return { apiRegion: "", display: "" };
  const NA = new Set(["usa", "united states", "canada", "mexico", "cuba"]);
  const EU = new Set(["uk", "united kingdom", "germany", "italy", "france"]);
  const ASIA = new Set(["india", "china", "singapore", "thailand"]);
  if (NA.has(c)) return { apiRegion: "NA", display: "NA" };
  if (EU.has(c)) return { apiRegion: "EU", display: "EU" };
  if (ASIA.has(c)) return { apiRegion: "FE", display: "Asia" };
  return { apiRegion: "", display: "" };
}

export default function Index() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Section 1 state
  const [teamMember, setTeamMember] = useState("");
  const [country, setCountry] = useState("");
  const regionInfo = detectRegion(country);

  // Generated code dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);

  // Section 2 state
  const [submitCode, setSubmitCode] = useState("");
  const [submitComments, setSubmitComments] = useState("");

  // Section 3 state
  const [confirmCode, setConfirmCode] = useState("");
  const [clearanceId, setClearanceId] = useState("");

  type GenHistory = {
    teamMember: string;
    country: string;
    date: string;
    code: string;
  };
  type SubmitHistory = {
    teamMember: string;
    date: string;
    code: string;
    comments?: string;
  };
  type ClearedHistory = { date: string; code: string; clearanceId: string };

  const [genHistory, setGenHistory] = useState<GenHistory[]>([]);
  const [submitHistory, setSubmitHistory] = useState<SubmitHistory[]>([]);
  const [clearedHistory, setClearedHistory] = useState<ClearedHistory[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const genRaw = localStorage.getItem("app.ekcode_generated");
        const subRaw = localStorage.getItem("app.ekcode_submitted");
        const clrRaw = localStorage.getItem("app.ekcode_cleared");
        const gen = genRaw ? JSON.parse(genRaw) : [];
        const sub = subRaw ? JSON.parse(subRaw) : [];
        const clr = clrRaw ? JSON.parse(clrRaw) : [];
        const uid = (typeof window !== "undefined" && sessionStorage.getItem("currentUser")
          ? JSON.parse(String(sessionStorage.getItem("currentUser"))).id
          : null) as string | null;
        const onlyMine = (list: any[]) =>
          Array.isArray(list)
            ? list.filter((e) => e && typeof e === "object" && e.userId && uid && e.userId === uid)
            : [];
        setGenHistory([...onlyMine(gen)].sort((a, b) => String(b.date).localeCompare(String(a.date))));
        setSubmitHistory([...onlyMine(sub)].sort((a, b) => String(b.date).localeCompare(String(a.date))));
        setClearedHistory([...onlyMine(clr)].sort((a, b) => String(b.date).localeCompare(String(a.date))));
      } catch {}
    }
    fetchHistory();
  }, []);

  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const userStr = sessionStorage.getItem("currentUser");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, []);

  const inputValid = useMemo(
    () => /^[A-Z0-9]{10}$/.test(submitCode),
    [submitCode]
  );
  const confirmValid = useMemo(
    () => /^[A-Z0-9]{10}$/.test(confirmCode),
    [confirmCode]
  );

  const handleGenerate = useCallback(async () => {
    if (!teamMember || !country) {
      toast({ title: "Please enter Team member and Country" });
      return;
    }
    if (!regionInfo.apiRegion) {
      toast({ title: "Unsupported country" });
      return;
    }
    try {
      const res = await fetch('/api/db/tickets/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: (currentUser?.type as 'HSV' | 'OSV') || 'HSV', userId: currentUser?.id })
      });
      if (!res.ok) {
        toast({ title: "No Ek-codes available" });
        return;
      }
      const data = await res.json() as { code: string };
      // Record selection locally for history and assignment tracking
      await onSelectCode(data.code);
      setDialogOpen(true);
    } catch {
      toast({ title: "Could not get Ek-code from server" });
    }
  }, [teamMember, country, currentUser, regionInfo.apiRegion, toast]);

  const onSelectCode = useCallback(async (code: string) => {
    let selectedPool: "HSV" | "OSV" | "Common" | null = (currentUser?.type as any) || "HSV";
    setGeneratedCode(code);
    const newEntry = { teamMember, country, date: new Date().toISOString(), code, userId: currentUser?.id } as any;
    setGenHistory((prev) => {
      const next = [newEntry, ...prev];
      try { localStorage.setItem("app.ekcode_generated", JSON.stringify(next)); } catch {}
      return next;
    });
    // Best-effort server history
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'generated', userId: currentUser?.id, teamMember, country, code })
      }).catch(() => {});
    } catch {}
    // Track assigned codes by user
    try {
      const mapRaw = localStorage.getItem("app.assigned_by_user");
      const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, Array<string | { code: string; section: string }>>) : {};
      const uid = currentUser?.id as string;
      const list = Array.isArray(map[uid]) ? map[uid] : [];
      const exists = list.some((c) => (typeof c === "string" ? c === code : c?.code === code));
      if (!exists) list.unshift({ code, section: (typeof window !== "undefined" ? (selectedPool || currentUser?.type || "HSV") : "HSV") });
      map[uid] = list;
      localStorage.setItem("app.assigned_by_user", JSON.stringify(map));
    } catch {}
    // hide selection list
    setAvailableCodes([]);
  }, [currentUser, teamMember, country]);

  const handleCopyAndClose = useCallback(async () => {
    if (!generatedCode) return;
    const ok = await copyToClipboard(generatedCode);
    if (!ok) {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access",
      });
      return;
    }
    setDialogOpen(false);
  }, [generatedCode, toast]);

  const onLogout = useCallback(() => {
    try {
      sessionStorage.removeItem("auth");
      sessionStorage.removeItem("currentUser");
    } catch {}
    navigate("/login", { replace: true });
  }, [navigate]);

  const onSubmitSection2 = useCallback(async () => {
    if (!inputValid) {
      toast({
        title: "Invalid ticket",
        description: "Enter a 10-character alphanumeric code",
      });
      return;
    }
    const code = submitCode;
    try {
      // Return the code to available in DB
      await fetch("/api/db/tickets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {}

    // Always record history locally and restore to pools
    const newEntry = {
      teamMember,
      date: new Date().toISOString(),
      code,
      comments: submitComments || undefined,
      userId: currentUser?.id,
    };
    setSubmitHistory((prev) => {
      const next = [newEntry, ...prev];
      try { localStorage.setItem("app.ekcode_submitted", JSON.stringify(next)); } catch {}
      return next;
    });
    // Best-effort server history
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'submitted', userId: currentUser?.id, teamMember, code, comments: submitComments })
      }).catch(() => {});
    } catch {}
    // Restore to correct pool locally (based on stored section or used pools)
    try {
      const ticketsRaw = localStorage.getItem("app.tickets");
      if (ticketsRaw) {
        const t = JSON.parse(ticketsRaw) as any;
        // Determine section from assigned_by_user map
        let target: "HSV" | "OSV" | "Common" | null = null;
        try {
          const mapRaw = localStorage.getItem("app.assigned_by_user");
          const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, Array<string | { code: string; section: string }>>) : {};
          const uid = currentUser?.id as string;
          const list = Array.isArray(map[uid]) ? map[uid] : [];
          const found = list.find((c) => (typeof c === "string" ? c === code : c?.code === code));
          target = typeof found === "string" ? null : (found?.section as any) || null;
        } catch {}
        if (!target) {
          // Fallback: check which used pool contains the code
          if (Array.isArray(t.Common?.used) && t.Common.used.includes(code)) target = "Common";
          else if (Array.isArray(t.HSV?.used) && t.HSV.used.includes(code)) target = "HSV";
          else if (Array.isArray(t.OSV?.used) && t.OSV.used.includes(code)) target = "OSV";
        }
        if (target) {
          t[target].used = Array.isArray(t[target].used) ? t[target].used.filter((c: string) => c !== code) : [];
          t[target].available = Array.isArray(t[target].available) ? t[target].available : [];
          if (!t[target].available.includes(code)) t[target].available.unshift(code);
          localStorage.setItem("app.tickets", JSON.stringify(t));
        }
      }
    } catch {}
    // Remove from assigned list for current user
    try {
      const mapRaw = localStorage.getItem("app.assigned_by_user");
      const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, Array<string | { code: string; section: string }>>) : {};
      const uid = currentUser?.id as string;
      const list = Array.isArray(map[uid]) ? map[uid] : [];
      map[uid] = list.filter((c) => (typeof c === "string" ? c !== code : c?.code !== code));
      localStorage.setItem("app.assigned_by_user", JSON.stringify(map));
    } catch {}
    toast({ title: "Ek-code sent back successfully to use again" });
    setSubmitCode("");
    setSubmitComments("");
  }, [inputValid, submitCode, submitComments, teamMember, toast]);

  const onSubmitSection3 = useCallback(async () => {
    if (!confirmValid) {
      toast({
        title: "Invalid ticket",
        description: "Enter a 10-character alphanumeric code",
      });
      return;
    }
    if (!clearanceId) return;
    const code = confirmCode;
    try {
      // Return the code to available in DB
      await fetch("/api/db/tickets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {}

    // Always record history locally and restore to pools
    const newEntry = { date: new Date().toISOString(), code, clearanceId, userId: currentUser?.id } as any;
    setClearedHistory((prev) => {
      const next = [newEntry, ...prev];
      try { localStorage.setItem("app.ekcode_cleared", JSON.stringify(next)); } catch {}
      return next;
    });
    // Best-effort server history
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cleared', userId: currentUser?.id, code, clearanceId })
      }).catch(() => {});
    } catch {}
    // Restore to correct pool locally (based on stored section or used pools)
    try {
      const ticketsRaw = localStorage.getItem("app.tickets");
      if (ticketsRaw) {
        const t = JSON.parse(ticketsRaw) as any;
        let target: "HSV" | "OSV" | "Common" | null = null;
        try {
          const mapRaw = localStorage.getItem("app.assigned_by_user");
          const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, Array<string | { code: string; section: string }>>) : {};
          const uid = currentUser?.id as string;
          const list = Array.isArray(map[uid]) ? map[uid] : [];
          const found = list.find((c) => (typeof c === "string" ? c === code : c?.code === code));
          target = typeof found === "string" ? null : (found?.section as any) || null;
        } catch {}
        if (!target) {
          if (Array.isArray(t.Common?.used) && t.Common.used.includes(code)) target = "Common";
          else if (Array.isArray(t.HSV?.used) && t.HSV.used.includes(code)) target = "HSV";
          else if (Array.isArray(t.OSV?.used) && t.OSV.used.includes(code)) target = "OSV";
        }
        if (target) {
          t[target].used = Array.isArray(t[target].used) ? t[target].used.filter((c: string) => c !== code) : [];
          t[target].available = Array.isArray(t[target].available) ? t[target].available : [];
          if (!t[target].available.includes(code)) t[target].available.unshift(code);
          localStorage.setItem("app.tickets", JSON.stringify(t));
        }
      }
    } catch {}
    // Remove from assigned list for current user
    try {
      const mapRaw = localStorage.getItem("app.assigned_by_user");
      const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, Array<string | { code: string; section: string }>>) : {};
      const uid = currentUser?.id as string;
      const list = Array.isArray(map[uid]) ? map[uid] : [];
      map[uid] = list.filter((c) => (typeof c === "string" ? c !== code : c?.code !== code));
      localStorage.setItem("app.assigned_by_user", JSON.stringify(map));
    } catch {}
    toast({ title: "Ek-code sent back successfully to use again" });
    setConfirmCode("");
    setClearanceId("");
  }, [confirmValid, confirmCode, clearanceId, toast]);

  if (typeof window !== "undefined" && sessionStorage.getItem("auth") !== "true") {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="container py-10">
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
      </div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
          {currentUser ? `Hi ${currentUser.teamName}, Get your Ek-Code for your team` : "Get your Ek-Code"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage Ek-Codes across regions in simple steps
        </p>
      </div>

      <div className="grid gap-6 md:gap-8 md:grid-cols-3">
        {/* Section 1 */}
        <Card className="backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Get your Ek-Code now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="team-member" className="text-sm font-medium">
                  Team member
                </label>
                <Input
                  id="team-member"
                  value={teamMember}
                  onChange={(e) => setTeamMember(e.target.value)}
                  placeholder="Enter member"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">
                  Country
                </label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Enter country"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="region-display" className="text-sm font-medium">
                  Region
                </label>
                <Input
                  id="region-display"
                  value={regionInfo.display}
                  placeholder=""
                  readOnly
                  disabled
                />
              </div>
            </div>
            <div>
              <Button className="w-full" onClick={handleGenerate}>
                Get code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Ek-Code is not used? submit it back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="submit-ticket">
                Enter your Ek-Code
              </label>
              <Input
                id="submit-ticket"
                value={submitCode}
                onChange={(e) => setSubmitCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD2345EF"
                className="font-mono tracking-widest uppercase"
                maxLength={10}
              />
              {!inputValid && submitCode.length > 0 && (
                <p className="text-xs text-destructive">
                  Enter a valid 10-character code
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="submit-comments">
                Comments
              </label>
              <Textarea
                id="submit-comments"
                value={submitComments}
                onChange={(e) => setSubmitComments(e.target.value)}
                placeholder="Add comments (optional)"
              />
            </div>
            <Button onClick={onSubmitSection2} className="w-full">
              Submit
            </Button>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader>
            <CardTitle>Ek-code is cleared?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm-ticket">
                Enter your Ek-Code
              </label>
              <Input
                id="confirm-ticket"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD2345EF"
                className="font-mono tracking-widest uppercase"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="clearance-id">
                Enter clearance ID
              </label>
              <Input
                id="clearance-id"
                value={clearanceId}
                onChange={(e) => setClearanceId(e.target.value)}
                placeholder="Enter clearance ID"
              />
            </div>
            <Button
              onClick={onSubmitSection3}
              className="w-full"
              disabled={!clearanceId}
            >
              Submit
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">History</h2>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="generated">
            <AccordionTrigger>Generated Ek-codes</AccordionTrigger>
            <AccordionContent>
              {genHistory.length ? (
                <ul className="space-y-2 text-sm">
                  {genHistory.map((h, i) => (
                    <li key={i} className="border rounded p-3 leading-relaxed">
                      <span className="font-medium">{h.teamMember}</span> has
                      generated the Ek-code{" "}
                      <span className="px-1.5 py-0.5 rounded bg-accent font-mono font-semibold">
                        {h.code}
                      </span>{" "}
                      for <span className="font-medium">{h.country}</span> on{" "}
                      <span className="font-medium">
                        {formatPrettyDate(h.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No entries yet</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="submitted">
            <AccordionTrigger>Submitted back (unused)</AccordionTrigger>
            <AccordionContent>
              {submitHistory.length ? (
                <ul className="space-y-2 text-sm">
                  {submitHistory.map((h, i) => (
                    <li key={i} className="border rounded p-3 leading-relaxed">
                      <span className="font-medium">
                        {h.teamMember || "A team member"}
                      </span>{" "}
                      has submitted the unused Ek-code{" "}
                      <span className="px-1.5 py-0.5 rounded bg-accent font-mono font-semibold">
                        {h.code}
                      </span>{" "}
                      on{" "}
                      <span className="font-medium">
                        {formatPrettyDate(h.date)}
                      </span>
                      {h.comments ? (
                        <span className="block text-muted-foreground mt-1">
                          Comments: {h.comments}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No entries yet</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cleared">
            <AccordionTrigger>Cleared and returned</AccordionTrigger>
            <AccordionContent>
              {clearedHistory.length ? (
                <ul className="space-y-2 text-sm">
                  {clearedHistory.map((h, i) => (
                    <li key={i} className="border rounded p-3 leading-relaxed">
                      Cleared EK-code{" "}
                      <span className="px-1.5 py-0.5 rounded bg-accent font-mono font-semibold">
                        {h.code}
                      </span>{" "}
                      and submitted it back on{" "}
                      <span className="font-medium">
                        {formatPrettyDate(h.date)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        (Clearance ID: {h.clearanceId})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No entries yet</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generated Ek-Code</DialogTitle>
            <DialogDescription>Copy and keep it safe</DialogDescription>
          </DialogHeader>
          {(!generatedCode && availableCodes.length > 0) ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select an Ek-code to use for your team:</p>
              <div className="max-h-[300px] overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCodes.map((c) => (
                  <Button key={c} variant="outline" onClick={() => onSelectCode(c)} className="font-mono">
                    {c}
                  </Button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-mono font-bold tracking-wider select-all">
                {generatedCode || "---------"}
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                <Button onClick={handleCopyAndClose}>Copy & Close</Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
