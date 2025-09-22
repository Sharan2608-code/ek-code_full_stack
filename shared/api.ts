/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface GenerateTicketResponse {
  code: string;
  availableCount: number;
}
export interface ConsumeTicketRequest { code: string }
export interface ConsumeTicketResponse { removed: boolean; availableCount: number; reason?: string }
export interface AppendTicketRequest { code: string }
export interface AppendTicketResponse { added: boolean; availableCount: number; reason?: string }
export interface ListAvailableResponse { available: string[] }

// Users
export interface UserDTO {
  id: string;
  teamName: string;
  email: string;
  type: "HSV" | "OSV";
}

// MongoDB Ticket APIs
export type TicketPool = "HSV" | "OSV" | "Common";
export interface TicketsImportItem { code: string; pool: TicketPool }
export interface TicketsImportRequest { items: TicketsImportItem[] }
export interface TicketsImportResponse { inserted: number }
export interface TicketsDeleteRequest { codes: string[] }
export interface TicketsDeleteResponse { deleted: number }
export interface TicketsAvailableResponse {
  available: string[];
  counts: { HSV: number; OSV: number; Common: number };
}
export interface NextTicketRequest { userType: TicketPool; userId?: string }
export interface NextTicketResponse { code: string; availableCount: number }
