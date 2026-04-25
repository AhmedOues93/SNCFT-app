export type AdminRole = 'super_admin' | 'editor' | 'reviewer' | 'viewer';

export const canManageUsers = (role: AdminRole) => role === 'super_admin';
export const canEditData = (role: AdminRole) => ['super_admin', 'editor'].includes(role);
export const canPublish = (role: AdminRole) => ['super_admin', 'reviewer'].includes(role);
