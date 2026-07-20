import type { DashboardUserRole } from "@/types";

export type LoginUser = {
  email: string;
  role: DashboardUserRole;
  name: string;
  clientName?: string;
};

export const REMEMBERED_LOGIN_STORAGE_KEY = "bs-remembered-login";
export const REMEMBER_LOGIN_AFTER_OAUTH_STORAGE_KEY = "bs-remember-login-after-oauth";
