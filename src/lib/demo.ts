import type { AdminOverview, UserRow } from "@/lib/admin";
import { adminActivity, adminOverview, adminRoleChanges, adminRoleHolders, adminUserDetail, adminUsers, spendByUser } from "@/lib/sample-admin";

/**
 * Invented data for the public admin demo: invented people and numbers only. This module must never import the
 * database client or read anything from the live app; the demo route imports nothing else.
 */
export const demoOverview: AdminOverview = adminOverview;
export const demoUsers: UserRow[] = adminUsers;
export const demoUserDetail = adminUserDetail;
export const demoActivity = adminActivity;
export const demoSpendByUser = spendByUser;
export const demoRoles = { holders: adminRoleHolders, changes: adminRoleChanges };
