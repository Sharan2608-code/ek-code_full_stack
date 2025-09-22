"use client"

import { useEffect, useState } from "react"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

// Local storage schema keys removed after DB migration

type User = { id: string; teamName: string; email: string; password: string; type: "HSV" | "OSV"; assigned: number }

type Pool = { available: string[]; used: string[] }
type TicketsStore = {
  HSV: Pool
  OSV: Pool
  Common: Pool
}

// LocalStorage helpers removed after DB migration for users and tickets

function parseCsv(text: string): { code: string; type: "HSV" | "OSV" | "Common" }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: { code: string; type: "HSV" | "OSV" | "Common" }[] = []
  for (const line of lines) {
    const parts = line.split(/,|;|\t/).map((p) => p.trim())
    const code = (parts[0] || "").toUpperCase()
    const typeRaw = (parts[1] || "HSV").toUpperCase()
    if (!/^[A-Z0-9]{10}$/.test(code)) continue
    const type = typeRaw === "OSV" ? "OSV" : typeRaw === "COMMON" ? "Common" : "HSV"
    out.push({ code, type })
  }
  return out
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const isAdmin = typeof window !== "undefined" && sessionStorage.getItem("admin") === "true"
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  // Load users from DB instead of localStorage
  useEffect(() => {
    const refreshUsers = async () => {
      try {
        const res = await fetch('/api/users')
        if (!res.ok) return
        const data = await res.json() as Array<{ id: string; teamName: string; email: string; type: 'HSV'|'OSV' }>
        const list: User[] = data.map(u => ({ id: u.id, teamName: u.teamName, email: u.email, password: '', type: u.type, assigned: 0 }))
        setUsers(list)
      } catch {}
    }
    refreshUsers()
  }, [])
  const [tickets, setTickets] = useState<TicketsStore>(() => ({
    HSV: { available: [], used: [] },
    OSV: { available: [], used: [] },
    Common: { available: [], used: [] },
  }))
  const [lsTick, setLsTick] = useState(0)

  // User form state
  const [teamName, setTeamName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState<"HSV" | "OSV">("HSV")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  // removed editingAssigned; assignment counts are derived on the fly from localStorage map

  // Ticket form state
  const [codesText, setCodesText] = useState("")
  const [codesType, setCodesType] = useState<"HSV" | "OSV" | "Common">("HSV")
  const [teamsQuery, setTeamsQuery] = useState("")
  const [poolsQuery, setPoolsQuery] = useState("")
  const [deleteCodesText, setDeleteCodesText] = useState("")

  // Users and tickets are persisted in DB now
  // Load pools from DB on mount
  useEffect(() => {
    const refreshFromDB = async () => {
      try {
        const res = await fetch('/api/db/tickets/available')
        if (!res.ok) return
        const data = await res.json() as { byPool?: { HSV: string[]; OSV: string[]; Common: string[] } }
        const byPool = data.byPool || { HSV: [], OSV: [], Common: [] }
        setTickets({
          HSV: { available: Array.isArray(byPool.HSV) ? byPool.HSV : [], used: [] },
          OSV: { available: Array.isArray(byPool.OSV) ? byPool.OSV : [], used: [] },
          Common: { available: Array.isArray(byPool.Common) ? byPool.Common : [], used: [] },
        })
      } catch {}
    }
    refreshFromDB()
  }, [])
  // Force periodic re-render to reflect localStorage changes (assigned_by_user counts)
  useEffect(() => {
    const id = setInterval(() => setLsTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // History state (shared with user Index page via localStorage app.* keys)
  type GenHistory = { teamMember: string; country: string; date: string; code: string; userId?: string }
  type SubmitHistory = { teamMember: string; date: string; code: string; comments?: string; userId?: string }
  type ClearedHistory = { date: string; code: string; clearanceId: string; userId?: string }

  const [genHistory, setGenHistory] = useState<GenHistory[]>([])
  const [submitHistory, setSubmitHistory] = useState<SubmitHistory[]>([])
  const [clearedHistory, setClearedHistory] = useState<ClearedHistory[]>([])

  useEffect(() => {
    const readAll = () => {
      try {
        const g = localStorage.getItem("app.ekcode_generated")
        const s = localStorage.getItem("app.ekcode_submitted")
        const c = localStorage.getItem("app.ekcode_cleared")
        const gList: GenHistory[] = g ? JSON.parse(g) : []
        const sList: SubmitHistory[] = s ? JSON.parse(s) : []
        const cList: ClearedHistory[] = c ? JSON.parse(c) : []
        // sort desc by date
        gList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
        sList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
        cList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
        setGenHistory(gList)
        setSubmitHistory(sList)
        setClearedHistory(cList)
      } catch {}
    }
    readAll()
  }, [])

  // Periodic refresh tied to lsTick so admin sees all teams' updates live
  useEffect(() => {
    try {
      const g = localStorage.getItem("app.ekcode_generated")
      const s = localStorage.getItem("app.ekcode_submitted")
      const c = localStorage.getItem("app.ekcode_cleared")
      const gList: GenHistory[] = g ? JSON.parse(g) : []
      const sList: SubmitHistory[] = s ? JSON.parse(s) : []
      const cList: ClearedHistory[] = c ? JSON.parse(c) : []
      gList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      sList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      cList.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      setGenHistory(gList)
      setSubmitHistory(sList)
      setClearedHistory(cList)
    } catch {}
  }, [lsTick])

  const totalAvailable = tickets.HSV.available.length + tickets.OSV.available.length + tickets.Common.available.length
  const totalUsed = tickets.HSV.used.length + tickets.OSV.used.length + tickets.Common.used.length
  const totalTickets = totalAvailable + totalUsed

  const totalUsers = users.length

  const handleCreateUser = () => {
    const t = teamName.trim()
    const e = email.trim()
    const p = password.trim()
    if (!t || !e || !p) {
      toast({ title: "Please fill all team fields" })
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName: t, email: e, password: p, type: userType })
        })
        if (!res.ok) {
          const msg = res.status === 409 ? 'Team already exists' : 'Failed to create team'
          toast({ title: msg })
          return
        }
        // refresh users
        const listRes = await fetch('/api/users')
        if (listRes.ok) {
          const data = await listRes.json() as Array<{ id: string; teamName: string; email: string; type: 'HSV'|'OSV' }>
          const list: User[] = data.map(u => ({ id: u.id, teamName: u.teamName, email: u.email, password: '', type: u.type, assigned: 0 }))
          setUsers(list)
        }
        setTeamName("")
        setEmail("")
        setPassword("")
        setUserType("HSV")
        toast({ title: "Team created" })
      } catch {
        toast({ title: 'Failed to create team' })
      }
    })()
  }

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setTeamName(user.teamName)
    setEmail(user.email)
    setPassword(user.password)
    setUserType(user.type)
    setEditingUserId(userId)
    // editingAssigned removed
    toast({ title: "Team loaded for editing" })
  }

  const handleUpdateUser = (userId: string) => {
    const t = teamName.trim()
    const e = email.trim()
    const p = password.trim()
    ;(async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName: t, email: e, password: p || undefined, type: userType })
        })
        if (!res.ok) {
          toast({ title: 'Failed to update team' })
          return
        }
        const listRes = await fetch('/api/users')
        if (listRes.ok) {
          const data = await listRes.json() as Array<{ id: string; teamName: string; email: string; type: 'HSV'|'OSV' }>
          const list: User[] = data.map(u => ({ id: u.id, teamName: u.teamName, email: u.email, password: '', type: u.type, assigned: 0 }))
          setUsers(list)
        }
        setTeamName("")
        setEmail("")
        setPassword("")
        setUserType("HSV")
        setEditingUserId(null)
        // editingAssigned removed
        toast({ title: "Team updated" })
      } catch {
        toast({ title: 'Failed to update team' })
      }
    })()
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    if (!confirm(`Are you sure you want to delete team "${user.teamName}" (${user.email})?`)) return
    ;(async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
        if (!res.ok) {
          toast({ title: 'Failed to delete team' })
          return
        }
        const listRes = await fetch('/api/users')
        if (listRes.ok) {
          const data = await listRes.json() as Array<{ id: string; teamName: string; email: string; type: 'HSV'|'OSV' }>
          const list: User[] = data.map(u => ({ id: u.id, teamName: u.teamName, email: u.email, password: '', type: u.type, assigned: 0 }))
          setUsers(list)
        }
        toast({ title: "Team deleted" })
      } catch {
        toast({ title: 'Failed to delete team' })
      }
    })()
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
    ;(async () => {
      try {
        const items = all.map(({ code, type }) => ({ code, pool: type as any }))
        const res = await fetch('/api/db/tickets/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        if (!res.ok) throw new Error('import_failed')
        const avRes = await fetch('/api/db/tickets/available')
        if (avRes.ok) {
          const data = await avRes.json() as { byPool?: { HSV: string[]; OSV: string[]; Common: string[] } }
          const byPool = data.byPool || { HSV: [], OSV: [], Common: [] }
          setTickets({
            HSV: { available: Array.isArray(byPool.HSV) ? byPool.HSV : [], used: [] },
            OSV: { available: Array.isArray(byPool.OSV) ? byPool.OSV : [], used: [] },
            Common: { available: Array.isArray(byPool.Common) ? byPool.Common : [], used: [] },
          })
        }
        setCodesText('')
        toast({ title: `Added ${all.length} codes` })
      } catch {
        toast({ title: 'Failed to add codes' })
      }
    })()
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
    ;(async () => {
      try {
        const res = await fetch('/api/db/tickets/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codes: list }),
        })
        if (!res.ok) throw new Error('delete_failed')
        const avRes = await fetch('/api/db/tickets/available')
        if (avRes.ok) {
          const data = await avRes.json() as { byPool?: { HSV: string[]; OSV: string[]; Common: string[] } }
          const byPool = data.byPool || { HSV: [], OSV: [], Common: [] }
          setTickets({
            HSV: { available: Array.isArray(byPool.HSV) ? byPool.HSV : [], used: [] },
            OSV: { available: Array.isArray(byPool.OSV) ? byPool.OSV : [], used: [] },
            Common: { available: Array.isArray(byPool.Common) ? byPool.Common : [], used: [] },
          })
        }
        setDeleteCodesText('')
        toast({ title: `Deleted ${list.length} codes` })
      } catch {
        toast({ title: 'Failed to delete codes' })
      }
    })()
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
    const next = { ...tickets, HSV: { ...tickets.HSV }, OSV: { ...tickets.OSV }, Common: { ...tickets.Common } }
    let added = 0
    for (const { code, type } of parsed) {
      if (
        !next.HSV.available.includes(code) &&
        !next.OSV.available.includes(code) &&
        !next.Common.available.includes(code) &&
        !next.HSV.used.includes(code) &&
        !next.OSV.used.includes(code) &&
        !next.Common.used.includes(code)
      ) {
        ;(next as any)[type].available.push(code)
        added++
      }
    }
    setTickets(next)
    toast({ title: `Imported ${added} codes from CSV` })
  }

  

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
            <CardTitle>Total Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalTickets}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Used Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalUsed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available Ek-codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalAvailable}</CardContent>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="ut-common" value="Common" />
                  <Label htmlFor="ut-common">Common</Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              onClick={() => (editingUserId ? handleUpdateUser(editingUserId) : handleCreateUser())}
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
                  .filter((u) =>
                    !teamsQuery.trim() ||
                    u.teamName.toLowerCase().includes(teamsQuery.toLowerCase()) ||
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
                                  const raw = localStorage.getItem("app.assigned_by_user")
                                  const map = raw ? (JSON.parse(raw) as Record<string, Array<string | { code: string; section?: string }>>) : {}
                                  const list = Array.isArray(map[u.id]) ? map[u.id] : []
                                  return list.length
                                } catch { return 0 }
                              })()}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs text-left">
                              {(() => {
                                try {
                                  const raw = localStorage.getItem("app.assigned_by_user")
                                  const map = raw ? (JSON.parse(raw) as Record<string, Array<string | { code: string; section?: string }>>) : {}
                                  const list = Array.isArray(map[u.id]) ? map[u.id] : []
                                  return list.length ? (
                                    <ul className="list-disc pl-4">
                                      {list.map((item) => {
                                        const key = typeof item === 'string' ? item : item?.code
                                        const code = typeof item === 'string' ? item : item?.code
                                        const section = typeof item === 'string' ? '' : (item?.section || '')
                                        return (
                                          <li key={key} className="font-mono text-xs">
                                            {code}{section ? ` — ${section}` : ''}
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No codes assigned</span>
                                  )
                                } catch {
                                  return <span className="text-xs text-muted-foreground">No codes</span>
                                }
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(u.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            try {
                              sessionStorage.setItem("auth", "true")
                              sessionStorage.setItem(
                                "currentUser",
                                JSON.stringify({ id: u.id, email: u.email, teamName: u.teamName, type: u.type })
                              )
                            } catch {}
                            navigate("/", { replace: true })
                          }}
                          title="Open user ↗"
                        >
                          ↗
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
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
              <Label htmlFor="codes">Enter one code per line (10 chars A–Z, 0–9)</Label>
              <Textarea
                id="codes"
                value={codesText}
                onChange={(e) => setCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
                className="min-h-[120px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input className="text-sm" type="file" accept=".csv" onChange={(e) => e.target.files && handleCsvUpload(e.target.files[0])} />
              <span className="text-sm text-muted-foreground">CSV format: code,type (HSV|OSV|Common)</span>
            </div>
            <Button size="sm" onClick={handleAddTickets} className="sm:w-auto w-full">Add to available</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Ek-code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-codes">Enter codes to delete from available (one per line)</Label>
              <Textarea
                id="del-codes"
                value={deleteCodesText}
                onChange={(e) => setDeleteCodesText(e.target.value)}
                placeholder="EXAMPLE123\nABCDEFGH12"
                className="min-h-[120px]"
              />
            </div>
            <Button size="sm" className="sm:w-auto w-full" variant="destructive" onClick={handleDeleteTickets}>
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Ek-code Pools section */}
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">Ek-code Pools</CardTitle>
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
                  const q = poolsQuery.trim().toUpperCase()
                  const results: Array<{ code: string; section: "HSV"|"OSV"|"Common" }> = []
                  tickets.HSV.available.forEach((c) => { if (c.includes(q)) results.push({ code: c, section: "HSV" }) })
                  tickets.OSV.available.forEach((c) => { if (c.includes(q)) results.push({ code: c, section: "OSV" }) })
                  tickets.Common.available.forEach((c) => { if (c.includes(q)) results.push({ code: c, section: "Common" }) })
                  return results.length ? results.map(({ code, section }) => (
                    <span key={`${section}-${code}`} className="px-2 py-1 rounded bg-accent font-mono text-xs">
                      {code} — {section}
                    </span>
                  )) : (
                    <span className="text-sm text-muted-foreground">No matches</span>
                  )
                })()}
              </div>
            </div>
          )}
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="hsv">
              <AccordionTrigger>HSV Codes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Available: {tickets.HSV.available.length} | Used: {tickets.HSV.used.length}</div>
                  {!!tickets.HSV.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.HSV.available.filter((c) => !poolsQuery || c.includes(poolsQuery.toUpperCase())).map((c) => (
                          <span key={c} className="px-2 py-1 rounded bg-accent font-mono text-xs">{c}</span>
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
                  <div className="text-sm text-muted-foreground">Available: {tickets.OSV.available.length} | Used: {tickets.OSV.used.length}</div>
                  {!!tickets.OSV.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.OSV.available.filter((c) => !poolsQuery || c.includes(poolsQuery.toUpperCase())).map((c) => (
                          <span key={c} className="px-2 py-1 rounded bg-accent font-mono text-xs">{c}</span>
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
                  <div className="text-sm text-muted-foreground">Available: {tickets.Common.available.length} | Used: {tickets.Common.used.length}</div>
                  {!!tickets.Common.available.length && (
                    <div>
                      <div className="text-sm font-medium mb-1">Available</div>
                      <div className="flex flex-wrap gap-2">
                        {tickets.Common.available.filter((c) => !poolsQuery || c.includes(poolsQuery.toUpperCase())).map((c) => (
                          <span key={c} className="px-2 py-1 rounded bg-accent font-mono text-xs">{c}</span>
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
          <Accordion type="multiple" className="w-full">
            

            <AccordionItem value="code-generation">
              <AccordionTrigger>Code Generation History</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Generated Ek-codes</h4>
                    {genHistory.length ? (
                      <ul className="space-y-2">
                        {genHistory.map((h, i) => {
                          const team = users.find((u) => u.id === (h as any).userId)?.teamName
                          return (
                            <li key={i} className="border rounded p-3 leading-relaxed">
                              <span className="font-medium">{h.teamMember}</span>
                              {team ? <span className="ml-1 text-xs text-muted-foreground">({team})</span> : null} generated
                              <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                              for <span className="font-medium">{h.country}</span> on
                              <span className="font-medium ml-1">{new Date(h.date).toLocaleString()}</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No generated entries yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Submitted back (unused)</h4>
                    {submitHistory.length ? (
                      <ul className="space-y-2">
                        {submitHistory.map((h, i) => {
                          const team = users.find((u) => u.id === (h as any).userId)?.teamName
                          return (
                            <li key={i} className="border rounded p-3 leading-relaxed">
                              <span className="font-medium">{h.teamMember || "A team member"}</span>
                              {team ? <span className="ml-1 text-xs text-muted-foreground">({team})</span> : null} returned
                              <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                              on <span className="font-medium">{new Date(h.date).toLocaleString()}</span>
                              {h.comments ? (
                                <span className="block text-muted-foreground mt-1">Comments: {h.comments}</span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No submitted entries yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Cleared and returned</h4>
                    {clearedHistory.length ? (
                      <ul className="space-y-2">
                        {clearedHistory.map((h, i) => {
                          const team = users.find((u) => u.id === (h as any).userId)?.teamName
                          return (
                            <li key={i} className="border rounded p-3 leading-relaxed">
                              {team ? <span className="font-medium">{team}</span> : <span className="font-medium">A team</span>} cleared
                              <span className="px-1.5 py-0.5 mx-1 rounded bg-accent font-mono font-semibold">{h.code}</span>
                              on <span className="font-medium">{new Date(h.date).toLocaleString()}</span>
                              <span className="text-muted-foreground ml-1">(Clearance ID: {h.clearanceId})</span>
                            </li>
                          )
                        })}
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
