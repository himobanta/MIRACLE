const rawBaseUrl =
  (import.meta.env.VITE_API_URL as string) ||
  "http://127.0.0.1:8000/api/v1";


export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function getAuthToken(): string | null {
  return localStorage.getItem("miracle_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("miracle_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("miracle_token");
  localStorage.removeItem("miracle_user");
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "#";

  const trimmed = url.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return "#";
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  let res: Response;

  try {
    res = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "Network error: Unable to connect to Miracle server."
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      removeAuthToken();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("miracle_unauthorized")
        );
      }
    }

    const errorData = await res
      .json()
      .catch(() => ({ detail: res.statusText }));

    let message = errorData?.detail;

    if (!message || typeof message !== "string") {
      switch (res.status) {
        case 400:
          message = "Bad request. Please verify your input.";
          break;
        case 401:
          message =
            "Session expired or invalid credentials. Please log in.";
          break;
        case 403:
          message =
            "Access forbidden. You do not have permission for this operation.";
          break;
        case 404:
          message = "Requested resource not found.";
          break;
        case 409:
          message = "Conflict detected. Please try again.";
          break;
        case 422:
          message = "Invalid input data provided.";
          break;
        case 429:
          message =
            "Too many requests. Please slow down and try again later.";
          break;
        case 500:
          message =
            "Internal server error. Please try again later.";
          break;
        default:
          message = `API request failed with status ${res.status}`;
      }
    }

    throw new ApiError(res.status, message);
  }

  return res.json();
}

export const api = {
  // Auth
  register: async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    const result = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (result.access_token) {
      setAuthToken(result.access_token);

      localStorage.setItem(
        "miracle_user",
        JSON.stringify({
          id: result.user_id,
          name: result.name || data.name,
          email: data.email,
          role: result.role,
        })
      );
    }

    return result;
  },

  login: async (data: {
    email: string;
    password: string;
  }) => {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (result.access_token) {
      setAuthToken(result.access_token);

      localStorage.setItem(
        "miracle_user",
        JSON.stringify({
          id: result.user_id,
          name: result.name,
          email: data.email,
          role: result.role,
        })
      );
    }

    return result;
  },

  getMe: () => request("/auth/me"),

  // Assessment & Scoring
  evaluateAssessment: (data: any) =>
    request("/assessment/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getLatestScore: () => request("/assessment/score"),

  // Routine
  getRoutine: () => request<any[]>("/routine"),

  logRoutineProgress: (data: any) =>
    request("/routine/log", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRoutineLogs: () => request("/routine/logs"),

  // Ingredient Intelligence
  evaluateIngredients: (data: any) =>
    request("/ingredients/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Product Recommendations
  getRecommendations: (params?: {
    skin_type?: string;
    max_budget?: number;
  }) => {
    const query = new URLSearchParams();

    if (params?.skin_type) {
      query.append("skin_type", params.skin_type);
    }

    if (params?.max_budget) {
      query.append("max_budget", params.max_budget.toString());
    }

    const queryString = query.toString();

    return request(
      `/recommendations${queryString ? `?${queryString}` : ""}`
    );
  },

  // Analytics & Progress Photos
  uploadPhoto: (data: {
    image_url: string;
    tag?: string;
  }) =>
    request("/analytics/photos/upload", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAnalytics: () => request("/analytics"),

  // Consultant & Dermatologist Portal
  getRoster: () => request("/consultant/roster"),

  getStats: () => request("/consultant/stats"),

  getPatientDetails: (patientId: string) =>
    request(`/consultant/patient/${patientId}`),

  prescribeRoutine: (data: any) =>
    request("/consultant/prescribe", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Appointments
  listProfessionals: () =>
    request("/appointments/professionals"),

  requestAppointment: (data: any) =>
    request("/appointments/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyAppointments: () =>
    request<any[]>("/appointments/my"),

  updateAppointmentStatus: (id: string, data: any) =>
    request(`/appointments/${id}/status`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  referToDermatologist: (id: string, data: any) =>
    request(`/appointments/${id}/refer`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // User Profile
  getProfile: () => request("/assessment/profile"),

  updateProfile: (data: any) =>
    request("/assessment/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSkinTypes: () =>
    request<any[]>("/assessment/skin-types"),

  getSkinConcerns: () =>
    request<any[]>("/assessment/skin-concerns"),

  getAssessmentHistory: () =>
    request<any[]>("/assessment/history"),

  getAssessmentById: (id: string) =>
    request(`/assessment/${id}`),

  deletePhoto: (id: string) =>
    request(`/analytics/photos/${id}`, { method: "DELETE" }),

  // Administrator Portal
  getAdminStats: () => request("/admin/stats"),

  getAdminUsers: (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (search) params.append("search", search);
    const qs = params.toString();
    return request(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  getAdminActivity: (limit = 10) =>
    request(`/admin/activity?limit=${limit}`),

  // Admin User CRUD
  updateAdminUser: (userId: string, data: { role?: string; name?: string }) =>
    request(`/admin/users/${userId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAdminUser: (userId: string) =>
    request(`/admin/users/${userId}`, { method: "DELETE" }),

  getAdminUserDetail: (userId: string) =>
    request(`/admin/users/${userId}/detail`),

  // Admin Assessments
  getAdminAssessments: (params?: { page?: number; per_page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/admin/assessments${qs ? `?${qs}` : ""}`);
  },

  // Admin Routines
  getAdminRoutines: (params?: { page?: number; per_page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/admin/routines${qs ? `?${qs}` : ""}`);
  },

  // Admin Products CRUD
  getAdminProducts: (params?: { page?: number; per_page?: number; search?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    const qs = q.toString();
    return request(`/admin/products${qs ? `?${qs}` : ""}`);
  },

  createAdminProduct: (data: any) =>
    request("/admin/products", { method: "POST", body: JSON.stringify(data) }),

  updateAdminProduct: (id: string, data: any) =>
    request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAdminProduct: (id: string) =>
    request(`/admin/products/${id}`, { method: "DELETE" }),

  // Admin Ingredients CRUD
  getAdminIngredients: (params?: { page?: number; per_page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/admin/ingredients${qs ? `?${qs}` : ""}`);
  },

  createAdminIngredient: (data: any) =>
    request("/admin/ingredients", { method: "POST", body: JSON.stringify(data) }),

  updateAdminIngredient: (id: string, data: any) =>
    request(`/admin/ingredients/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAdminIngredient: (id: string) =>
    request(`/admin/ingredients/${id}`, { method: "DELETE" }),

  // Admin Content CMS
  getAdminContent: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/admin/content${qs ? `?${qs}` : ""}`);
  },

  createAdminContent: (data: any) =>
    request("/admin/content", { method: "POST", body: JSON.stringify(data) }),

  updateAdminContent: (id: string, data: any) =>
    request(`/admin/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteAdminContent: (id: string) =>
    request(`/admin/content/${id}`, { method: "DELETE" }),

  // Admin Notifications
  getAdminNotifications: () => request("/admin/notifications"),

  createAdminNotification: (data: any) =>
    request("/admin/notifications", { method: "POST", body: JSON.stringify(data) }),

  deleteAdminNotification: (id: string) =>
    request(`/admin/notifications/${id}`, { method: "DELETE" }),

  // Admin Audit Logs
  getAdminAuditLogs: (params?: { page?: number; per_page?: number; search?: string; action?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    if (params?.action) q.append("action", params.action);
    const qs = q.toString();
    return request(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },

  // Admin System Settings
  getAdminSettings: () => request("/admin/settings"),

  updateAdminSetting: (key: string, value: string) =>
    request(`/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),

  // Admin Backup
  getAdminBackupStatus: () => request("/admin/backup/status"),

  createAdminBackup: () =>
    request("/admin/backup/create", { method: "POST" }),

  // Admin Security
  getAdminSecurityEvents: (limit = 50) =>
    request(`/admin/security/events?limit=${limit}`),

  getAdminSecurityStats: () => request("/admin/security/stats"),

  // Admin Reports
  getAdminReportsOverview: () => request("/admin/reports/overview"),
};