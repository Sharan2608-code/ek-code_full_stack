export interface AdminUser {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  team_name: string
  account_type: "HSV" | "OSV"
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  success: boolean
  user: AdminUser | User
  userType: "admin" | "user"
  error?: string
}

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch("/api/auth/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  return response.json()
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch("/api/auth/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  return response.json()
}

export async function createUser(userData: {
  email: string
  password: string
  teamName: string
  accountType: "HSV" | "OSV"
  adminId: string
}) {
  const response = await fetch("/api/auth/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })

  return response.json()
}

export async function updateUser(
  userId: string,
  userData: {
    email: string
    password?: string
    teamName: string
    accountType: "HSV" | "OSV"
  },
) {
  const response = await fetch(`/api/auth/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })

  return response.json()
}

export async function deleteUser(userId: string) {
  const response = await fetch(`/api/auth/admin/users/${userId}`, {
    method: "DELETE",
  })

  return response.json()
}

export async function fetchUsers() {
  const response = await fetch("/api/auth/admin/users")
  return response.json()
}
