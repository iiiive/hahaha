export interface AuditLog {
  auditLogId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  performedByUserId?: number | null;
  performedByRole: string;
  performedAt: string;

  // ✅ NEW (optional)
  performedByName?: string | null;
}
