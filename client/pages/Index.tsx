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
  DialogFooter,
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
        setGenHistory([...gen].sort((a, b) => String(b.date).localeCompare(String(a.date))));
        setSubmitHistory([...sub].sort((a, b) => String(b.date).localeCompare(String(a.date))));
        setClearedHistory([...clr].sort((a, b) => String(b.date).localeCompare(String(a.date))));
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

  const handleGetCode = useCallback(async () => {
    if (!teamMember || !country) {
      toast({ title: "Please enter Team member and Country" });
      return;
    }
    if (!regionInfo.apiRegion) {
      toast({
        title: "Unsupported country",
        description:
          "Enter USA, Canada, Mexico, Cuba, UK, Germany, Italy, France, India, China, Singapore, or Thailand",
      });
      return;
    }

    if (!currentUser || !currentUser.type) {
      toast({
        title: "User type not found",
        description: "Please contact admin to set your account type",
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/tickets/generate?region=${encodeURIComponent(
          regionInfo.apiRegion
        )}&type=${encodeURIComponent(currentUser.type)}`
      );
      if (!res.ok) throw new Error("No tickets available");
      const data = (await res.json()) as { code: string };
      const code = data.code;
      try {
        await fetch("/api/tickets/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, userType: currentUser.type }),
        });
      } catch {}
      setGeneratedCode(code);
      const newEntry = {
        teamMember,
        country,
        date: new Date().toISOString(),
        code,
      };
      setGenHistory((prev) => {
        const next = [newEntry, ...prev];
        try { localStorage.setItem("app.ekcode_generated", JSON.stringify(next)); } catch {}
        return next;
      });
      setDialogOpen(true);
    } catch {
      toast({ title: `All ${currentUser.type} Ek-codes have been used 😢` });
    }
  }, [teamMember, country, regionInfo.apiRegion, currentUser, toast]);

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
      const res = await fetch("/api/tickets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.added) {
        const newEntry = {
          teamMember,
          date: new Date().toISOString(),
          code,
          comments: submitComments || undefined,
        };
        setSubmitHistory((prev) => {
          const next = [newEntry, ...prev];
          try { localStorage.setItem("app.ekcode_submitted", JSON.stringify(next)); } catch {}
          return next;
        });
        toast({ title: "Ek-code sent back successfully to use again" });
      } else if (data.reason === "already_available") {
        toast({ title: "This Ek-Code is already available" });
      } else if (data.reason === "unknown_code") {
        toast({ title: "Ek-code doesn't exist ❌" });
      } else {
        toast({ title: "Error", description: "Could not add ticket" });
      }
    } catch {
      toast({ title: "Error", description: "Could not add ticket" });
    }
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
      const res = await fetch("/api/tickets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.added) {
        const newEntry = { date: new Date().toISOString(), code, clearanceId };
        setClearedHistory((prev) => {
          const next = [newEntry, ...prev];
          try { localStorage.setItem("app.ekcode_cleared", JSON.stringify(next)); } catch {}
          return next;
        });
        toast({ title: "Ek-code sent back successfully to use again" });
      } else if (data.reason === "already_available") {
        toast({ title: "This Ek-Code is already available" });
      } else if (data.reason === "unknown_code") {
        toast({ title: "Ek-code doesn't exist ❌" });
      } else {
        toast({ title: "Error", description: "Could not restore ticket" });
      }
    } catch {
      toast({ title: "Error", description: "Could not restore ticket" });
    }
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
          Get your Ek-Code
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage Ek-Codes across regions in simple steps
        </p>
        {currentUser && (
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Account Type: {currentUser.type} | Team: {currentUser.teamName}
            </span>
          </div>
        )}
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
              <Button className="w-full" onClick={handleGetCode}>
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
            <DialogTitle>Code generated ✅</DialogTitle>
            <DialogDescription>
              Your Ek-Code is ready. Tap copy to use it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-lg tracking-widest">
              {generatedCode}
            </div>
            <Button onClick={handleCopyAndClose} aria-label="Copy Ek-Code">
              Copy
            </Button>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </main>
  );
}
