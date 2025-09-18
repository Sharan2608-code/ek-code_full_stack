"use client"

import { useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/ui/use-toast"

// Local storage schema keys
const LS_USERS = "app.users"
const LS_TICKETS = "app.tickets"

type User = { id: string; teamName: string; email: string; password: string; type: "HSV" | "OSV"; assigned: number }

type TicketsStore = {
  HSV: { available: string[]; used: string[] }
  OSV: { available: string[]; used: string[] }
}

function loadTickets(): TicketsStore {
  try {
    const raw = localStorage.getItem(LS_TICKETS)
    if (raw) return JSON.parse(raw) as TicketsStore
  } catch {}
  const initial: TicketsStore = { HSV: { available: [], used: [] }, OSV: { available: [], used: [] } }
  localStorage.setItem(LS_TICKETS, JSON.stringify(initial))
  return initial
}

function saveTickets(t: TicketsStore) {
  localStorage.setItem(LS_TICKETS, JSON.stringify(t))
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(LS_USERS)
    if (raw) return JSON.parse(raw) as User[]
  } catch {}
  const initial: User[] = []
  localStorage.setItem(LS_USERS, JSON.stringify(initial))
  return initial
}

function saveUsers(u: User[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(u))
}

function parseCsv(text: string): { code: string; type: "HSV" | "OSV" }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: { code: string; type: "HSV" | "OSV" }[] = []
  for (const line of lines) {
    const parts = line.split(/,|;|\t/).map((p) => p.trim())
    const code = (parts[0] || "").toUpperCase()
    const typeRaw = (parts[1] || "HSV").toUpperCase()
    if (!/^[A-Z0-9]{10}$/.test(code)) continue
    const type = typeRaw === "OSV" ? "OSV" : "HSV"
    out.push({ code, type })
  }
  return out
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const isAdmin = typeof window !== "undefined" && sessionStorage.getItem("admin") === "true"
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>(() => loadUsers())
  const [tickets, setTickets] = useState<TicketsStore>(() => loadTickets())

  // User form state
  const [teamName, setTeamName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState<"HSV" | "OSV">("HSV")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingAssigned, setEditingAssigned] = useState<number>(0)

  // Ticket form state
  const [codesText, setCodesText] = useState("")
  const [codesType, setCodesType] = useState<"HSV" | "OSV">("HSV")
  const [deleteCodesText, setDeleteCodesText] = useState("")

  useEffect(() => saveUsers(users), [users])
  useEffect(() => saveTickets(tickets), [tickets])

  // History state (shared with user Index page via localStorage supabase.* keys)
  type GenHistory = { teamMember: string; country: string; date: string; code: string }
  type SubmitHistory = { teamMember: string; date: string; code: string; comments?: string }
  type ClearedHistory = { date: string; code: string; clearanceId: string }

  const [genHistory, setGenHistory] = useState<GenHistory[]>([])
  const [submitHistory, setSubmitHistory] = useState<SubmitHistory[]>([])
  const [clearedHistory, setClearedHistory] = useState<ClearedHistory[]>([])

  useEffect(() => {
    try {
      const g = localStorage.getItem("app.ekcode_generated")
      const s = localStorage.getItem("app.ekcode_submitted")
      const c = localStorage.getItem("app.ekcode_cleared")
      setGenHistory(g ? JSON.parse(g) : [])
      setSubmitHistory(s ? JSON.parse(s) : [])
      setClearedHistory(c ? JSON.parse(c) : [])
    } catch {}
  }, [])

  const totalAvailable = tickets.HSV.available.length + tickets.OSV.available.length
  const totalUsed = tickets.HSV.used.length + tickets.OSV.used.length
  const totalTickets = totalAvailable + totalUsed

  const totalUsers = users.length

  const handleCreateUser = () => {
    const t = teamName.trim()
    const e = email.trim()
    const p = password.trim()
    if (!t || !e || !p) {
      toast({ title: "Please fill all user fields" })
      return
    }
    if (users.some((u) => String(u.email).trim().toLowerCase() === e.toLowerCase())) {
      toast({ title: "User already exists" })
      return
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      teamName: t,
      email: e,
      password: p,
      type: userType,
      assigned: 0,
    }
    setUsers((prev) => [newUser, ...prev])
    setTeamName("")
    setEmail("")
    setPassword("")
    setUserType("HSV")
    toast({ title: "User created" })
  }

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setTeamName(user.teamName)
    setEmail(user.email)
    setPassword(user.password)
    setUserType(user.type)
    setEditingUserId(userId)
    setEditingAssigned(user.assigned)

    // Remove the user temporarily for editing
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    toast({ title: "User loaded for editing" })
  }

  const handleUpdateUser = (userId: string) => {
    const updated: User = {
      id: userId,
      teamName: teamName.trim(),
      email: email.trim(),
      password: password.trim(),
      type: userType,
      assigned: editingAssigned ?? 0,
    }
    setUsers((prev) => [updated, ...prev])
    setTeamName("")
    setEmail("")
    setPassword("")
    setUserType("HSV")
    setEditingUserId(null)
    setEditingAssigned(0)
    toast({ title: "User updated" })
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    if (confirm(`Are you sure you want to delete user "${user.teamName}" (${user.email})?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast({ title: "User deleted" })
    }
  }

  const handleAddTickets = () => {
    const parsed = parseCsv(codesText)
    if (parsed.length === 0 && codesText.trim()) {
      toast({ title: "No valid codes found" })
      return
    }
    const addManual = codesText
      .split(/\r?\n/)
      .map((l) => l.trim().toUpperCase())
      .filter((c) => /^[A-Z0-9]{10}$/.test(c))
      .map((code) => ({ code, type: codesType }))
    const all = [...parsed, ...addManual]
    if (all.length === 0) {
      toast({ title: "Enter codes or upload CSV (code,type)" })
      return
    }
    const next = { ...tickets, HSV: { ...tickets.HSV }, OSV: { ...tickets.OSV } }
    let added = 0
    for (const { code, type } of all) {
      const pool = next[type].available
      if (
        !next.HSV.available.includes(code) &&
        !next.OSV.available.includes(code) &&
        !next.HSV.used.includes(code) &&
        !next.OSV.used.includes(code)
      ) {
        pool.push(code)
        added++
      }
    }
    setTickets(next)
    setCodesText("")
    toast({ title: `Added ${added} codes` })
  }

  const handleDeleteTickets = () => {
    const list = deleteCodesText
      .split(/\r?\n/)
      .map((l) => l.trim().toUpperCase())
      .filter((c) => /^[A-Z0-9]{10}$/.test(c))
    if (list.length === 0) {
      toast({ title: "Enter codes to delete" })
      return
    }
    const next = { ...tickets, HSV: { ...tickets.HSV }, OSV: { ...tickets.OSV } }
    let removed = 0
    for (const code of list) {
      const idxA = next.HSV.available.indexOf(code)
      if (idxA !== -1) {
        next.HSV.available.splice(idxA, 1)
        removed++
      }
      const idxB = next.OSV.available.indexOf(code)
      if (idxB !== -1) {
        next.OSV.available.splice(idxB, 1)
        removed++
      }
    }
    setTickets(next)
    setDeleteCodesText("")
    toast({ title: `Deleted ${removed} codes` })
  }

  const handleCsvUpload = async (file: File) => {
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      toast({ title: "Only CSV supported in UI for now" })
      return
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.length === 0) {
      toast({ title: "No valid rows in CSV" })
      return
    }
    const next = { ...tickets, HSV: { ...tickets.HSV }, OSV: { ...tickets.OSV } }
    let added = 0
    for (const { code, type } of parsed) {
      if (
        !next.HSV.available.includes(code) &&
        !next.OSV.available.includes(code) &&
        !next.HSV.used.includes(code) &&
        !next.OSV.used.includes(code)
      ) {
        next[type].available.push(code)
        added++
      }
    }
    setTickets(next)
    toast({ title: `Imported ${added} codes from CSV` })
  }

  const assignedByUser = useMemo(() => {
    const map: Record<string, number> = {}
    for (const u of users) map[u.id] = u.assigned
    return map
  }, [users])

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <main className="container py-10 space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { try { sessionStorage.removeItem("admin") } catch {}; navigate("/admin/login", { replace: true }) }}>Logout</Button>
      </div>
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">Manage users, tickets, and monitoring</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total tickets</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalTickets}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total used</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalUsed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total available</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalAvailable}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create/Edit user account</CardTitle>
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
            <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup
                value={userType}
                onValueChange={(v) => setUserType(v as "HSV" | "OSV")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ut-hsv" value="HSV" />
                  <Label htmlFor="ut-hsv">HSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ut-osv" value="OSV" />
                  <Label htmlFor="ut-osv">OSV</Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              onClick={() => (editingUserId ? handleUpdateUser(editingUserId) : handleCreateUser())}
              className="w-full"
            >
              {editingUserId ? "Update user" : "Create user"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Total users: {totalUsers}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.teamName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.type}</TableCell>
                    <TableCell className="text-right">{assignedByUser[u.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(u.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No users yet
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
            <CardTitle>Add tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type for manual entries</Label>
              <RadioGroup
                value={codesType}
                onValueChange={(v) => setCodesType(v as "HSV" | "OSV")}
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
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codes">Enter one code per line (10 chars A–Z, 0–9)</Label>
              <Textarea
                id="codes"
                value={codesText}
                onChange={(e) => setCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
              />
            </div>
            <div className="flex items-center gap-3">
              <input type="file" accept=".csv" onChange={(e) => e.target.files && handleCsvUpload(e.target.files[0])} />
              <span className="text-sm text-muted-foreground">CSV format: code,type (HSV|OSV)</span>
            </div>
            <Button onClick={handleAddTickets}>Add to available</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-codes">Enter codes to delete from available (one per line)</Label>
              <Textarea
                id="del-codes"
                value={deleteCodesText}
                onChange={(e) => setDeleteCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
              />
            </div>
            <Button variant="destructive" onClick={handleDeleteTickets}>
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="user-activity">
              <AccordionTrigger>User Activity Log</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <div key={user.id} className="border rounded p-3 leading-relaxed">
                        <span className="font-medium">{user.teamName}</span> ({user.email}) -
                        <span className="ml-1">Type: {user.type}</span> -
                        <span className="ml-1">Codes assigned: {user.assigned}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No user activity yet</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="code-generation">
              <AccordionTrigger>Code Generation History</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Generated Ek-codes</h4>
                    {genHistory.length ? (
                      <ul className="space-y-2">
                        {genHistory.map((h, i) => (
                          <li key={i} className="border rounded p-3 leading-relaxed">
                            <span className="font-medium">{h.teamMember}</span> generated
                            <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                            for <span className="font-medium">{h.country}</span> on
                            <span className="font-medium ml-1">{new Date(h.date).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No generated entries yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Submitted back (unused)</h4>
                    {submitHistory.length ? (
                      <ul className="space-y-2">
                        {submitHistory.map((h, i) => (
                          <li key={i} className="border rounded p-3 leading-relaxed">
                            <span className="font-medium">{h.teamMember || "A team member"}</span> returned
                            <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                            on <span className="font-medium">{new Date(h.date).toLocaleString()}</span>
                            {h.comments ? (
                              <span className="block text-muted-foreground mt-1">Comments: {h.comments}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No submitted entries yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Cleared and returned</h4>
                    {clearedHistory.length ? (
                      <ul className="space-y-2">
                        {clearedHistory.map((h, i) => (
                          <li key={i} className="border rounded p-3 leading-relaxed">
                            Cleared
                            <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                            on <span className="font-medium">{new Date(h.date).toLocaleString()}</span>
                            <span className="text-muted-foreground ml-1">(Clearance ID: {h.clearanceId})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No cleared entries yet</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator />
    </main>
  )
}
