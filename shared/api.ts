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
