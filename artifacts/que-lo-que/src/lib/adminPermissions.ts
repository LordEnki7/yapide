// All possible admin permission keys
export const ALL_PERMISSIONS = [
  "dashboard",
  "users",
  "drivers",
  "businesses",
  "orders",
  "promo_codes",
  "notifications",
  "command_center",
  "staff",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string; icon: string }> = {
  dashboard: { label: "Dashboard", description: "Ver estadísticas generales de la plataforma", icon: "📊" },
  users:     { label: "Usuarios", description: "Ver, buscar y gestionar cuentas de usuarios", icon: "👥" },
  drivers:   { label: "Drivers", description: "Aprobar, rechazar y gestionar conductores", icon: "🛵" },
  businesses:{ label: "Negocios", description: "Aprobar y gestionar negocios registrados", icon: "🏪" },
  orders:    { label: "Pedidos", description: "Ver y gestionar todos los pedidos", icon: "📦" },
  promo_codes:{ label: "Códigos Promo", description: "Crear y gestionar descuentos y promociones", icon: "🏷️" },
  notifications:{ label: "Notificaciones", description: "Ver log de mensajes WhatsApp", icon: "💬" },
  command_center:{ label: "Command Center", description: "Acceder a agentes IA y configuración de plataforma", icon: "🤖" },
  staff:     { label: "Gestión de Staff", description: "Crear y editar cuentas de personal interno", icon: "🔑" },
};

// Admin role levels
export type AdminRole = "owner" | "master" | "staff";

// Owner and master get everything; staff only gets what's assigned
export function getEffectivePermissions(adminRole: AdminRole | null | undefined, permissionsJson: string | null | undefined): Permission[] {
  if (adminRole === "owner" || adminRole === "master") return [...ALL_PERMISSIONS];
  if (!permissionsJson) return ["dashboard"];
  try {
    const parsed = JSON.parse(permissionsJson) as Permission[];
    return parsed.filter(p => ALL_PERMISSIONS.includes(p));
  } catch {
    return ["dashboard"];
  }
}

export function hasPermission(
  adminRole: AdminRole | null | undefined,
  permissionsJson: string | null | undefined,
  permission: Permission
): boolean {
  return getEffectivePermissions(adminRole, permissionsJson).includes(permission);
}
