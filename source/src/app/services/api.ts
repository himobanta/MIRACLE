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

  socialLogin: async (data: {
    provider: 'google' | 'twitter' | 'facebook' | 'instagram';
    provider_id: string;
    name: string;
    email?: string;
    avatar_url?: string;
  }) => {
    const result = await request('/auth/social', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.access_token) {
      setAuthToken(result.access_token);
      localStorage.setItem(
        'miracle_user',
        JSON.stringify({
          id: result.user_id,
          name: result.name,
          email: data.email || '',
          role: result.role,
          avatar_url: data.avatar_url || '',
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

  getAllProducts: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: string;
    skin_type?: string;
    sort_by?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.search) query.append("search", params.search);
    if (params?.category) query.append("category", params.category);
    if (params?.skin_type) query.append("skin_type", params.skin_type);
    if (params?.sort_by) query.append("sort_by", params.sort_by);
    const qs = query.toString();
    return request(`/recommendations/products${qs ? `?${qs}` : ""}`);
  },

  listIngredients: (params?: {
    search?: string;
    category?: string;
    page?: number;
    per_page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.category) query.append("category", params.category);
    if (params?.page) query.append("page", String(params.page));
    if (params?.per_page) query.append("per_page", String(params.per_page));
    const qs = query.toString();
    return request(`/ingredients${qs ? `?${qs}` : ""}`);
  },

  changePassword: (data: { current_password: string; new_password: string }) =>
    request("/auth/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

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

  // ── Consultant Extended Endpoints ──────────────────────────────────────────
  getConsultantDashboard: () => request("/consultant/dashboard"),
  getConsultantRoster: (params?: { search?: string; skin_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.skin_type) q.append("skin_type", params.skin_type);
    const qs = q.toString();
    return request(`/consultant/roster${qs ? `?${qs}` : ""}`);
  },
  getConsultantAssessments: (params?: { search?: string; skin_type?: string; min_score?: number; max_score?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.skin_type) q.append("skin_type", params.skin_type);
    if (params?.min_score !== undefined) q.append("min_score", String(params.min_score));
    if (params?.max_score !== undefined) q.append("max_score", String(params.max_score));
    const qs = q.toString();
    return request(`/consultant/assessments${qs ? `?${qs}` : ""}`);
  },
  getConsultantRoutines: (patientId?: string) => {
    const q = new URLSearchParams();
    if (patientId) q.append("patient_id", patientId);
    const qs = q.toString();
    return request(`/consultant/routines${qs ? `?${qs}` : ""}`);
  },
  deleteConsultantRoutineStep: (id: string) =>
    request(`/consultant/routines/${id}`, { method: "DELETE" }),

  // Recommendations
  getConsultantRecommendations: (clientId?: string) => {
    const q = new URLSearchParams();
    if (clientId) q.append("client_id", clientId);
    const qs = q.toString();
    return request(`/consultant/recommendations${qs ? `?${qs}` : ""}`);
  },
  createConsultantRecommendation: (data: any) =>
    request("/consultant/recommendations", { method: "POST", body: JSON.stringify(data) }),
  deleteConsultantRecommendation: (id: string) =>
    request(`/consultant/recommendations/${id}`, { method: "DELETE" }),

  // Notes
  getConsultantNotes: (params?: { client_id?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.client_id) q.append("client_id", params.client_id);
    if (params?.category) q.append("category", params.category);
    const qs = q.toString();
    return request(`/consultant/notes${qs ? `?${qs}` : ""}`);
  },
  createConsultantNote: (data: any) =>
    request("/consultant/notes", { method: "POST", body: JSON.stringify(data) }),
  updateConsultantNote: (id: string, data: any) =>
    request(`/consultant/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteConsultantNote: (id: string) =>
    request(`/consultant/notes/${id}`, { method: "DELETE" }),

  // Follow-ups
  getConsultantFollowups: (params?: { status?: string; client_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.client_id) q.append("client_id", params.client_id);
    const qs = q.toString();
    return request(`/consultant/followups${qs ? `?${qs}` : ""}`);
  },
  createConsultantFollowup: (data: any) =>
    request("/consultant/followups", { method: "POST", body: JSON.stringify(data) }),
  updateConsultantFollowup: (id: string, data: any) =>
    request(`/consultant/followups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteConsultantFollowup: (id: string) =>
    request(`/consultant/followups/${id}`, { method: "DELETE" }),

  // Reminders
  getConsultantReminders: (params?: { priority?: string; completed?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.priority) q.append("priority", params.priority);
    if (params?.completed !== undefined) q.append("completed", String(params.completed));
    const qs = q.toString();
    return request(`/consultant/reminders${qs ? `?${qs}` : ""}`);
  },
  createConsultantReminder: (data: any) =>
    request("/consultant/reminders", { method: "POST", body: JSON.stringify(data) }),
  updateConsultantReminder: (id: string, data: any) =>
    request(`/consultant/reminders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteConsultantReminder: (id: string) =>
    request(`/consultant/reminders/${id}`, { method: "DELETE" }),

  // Knowledge Guides
  getConsultantTreatmentProtocols: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/consultant/treatment-protocols${qs ? `?${qs}` : ""}`);
  },
  getConsultantSkinConcernsGuide: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/consultant/skin-concerns${qs ? `?${qs}` : ""}`);
  },
  getConsultantIngredients: (params?: { search?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    const qs = q.toString();
    return request(`/consultant/ingredients${qs ? `?${qs}` : ""}`);
  },

  // Consultant Profile, Settings, Notifications
  getConsultantProfile: () => request("/consultant/profile"),
  updateConsultantProfile: (data: any) =>
    request("/consultant/profile", { method: "PUT", body: JSON.stringify(data) }),
  changeConsultantPassword: (data: any) =>
    request("/consultant/password", { method: "PUT", body: JSON.stringify(data) }),
  getConsultantNotifications: () => request("/consultant/notifications"),

  getConsultantProducts: (params?: { page?: number; per_page?: number; search?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    const qs = q.toString();
    return request(`/consultant/products${qs ? `?${qs}` : ""}`);
  },

  // ── Dermatologist Clinical Suite APIs ──────────────────────────────────────
  getDermaProfile: () => request("/dermatologist/profile"),
  updateDermaProfile: (data: any) =>
    request("/dermatologist/profile", { method: "PUT", body: JSON.stringify(data) }),
  getDermaDashboardOverview: () => request("/dermatologist/dashboard/overview"),
  getDermaPatients: (params?: { search?: string; skin_type?: string; concern?: string; sort_by?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.skin_type) q.append("skin_type", params.skin_type);
    if (params?.concern) q.append("concern", params.concern);
    if (params?.sort_by) q.append("sort_by", params.sort_by);
    const qs = q.toString();
    return request(`/dermatologist/patients${qs ? `?${qs}` : ""}`);
  },
  getDermaPatientDossier: (patientId: string) => request(`/dermatologist/patients/${patientId}/dossier`),
  getDermaAssessments: (params?: { search?: string; concern?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.concern) q.append("concern", params.concern);
    if (params?.severity) q.append("severity", params.severity);
    const qs = q.toString();
    return request(`/dermatologist/assessments${qs ? `?${qs}` : ""}`);
  },
  getDermaInsights: (params?: { risk_level?: string }) => {
    const q = new URLSearchParams();
    if (params?.risk_level) q.append("risk_level", params.risk_level);
    const qs = q.toString();
    return request(`/dermatologist/insights${qs ? `?${qs}` : ""}`);
  },
  getDermaTreatmentPlans: (params?: { status?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.patient_id) q.append("patient_id", params.patient_id);
    const qs = q.toString();
    return request(`/dermatologist/treatment-plans${qs ? `?${qs}` : ""}`);
  },
  createDermaTreatmentPlan: (data: any) =>
    request("/dermatologist/treatment-plans", { method: "POST", body: JSON.stringify(data) }),
  updateDermaTreatmentPlan: (planId: string, data: any) =>
    request(`/dermatologist/treatment-plans/${planId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDermaTreatmentPlan: (planId: string) =>
    request(`/dermatologist/treatment-plans/${planId}`, { method: "DELETE" }),
  getDermaPrescriptions: (params?: { status?: string; patient_id?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.patient_id) q.append("patient_id", params.patient_id);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/dermatologist/prescriptions${qs ? `?${qs}` : ""}`);
  },
  createDermaPrescription: (data: any) =>
    request("/dermatologist/prescriptions", { method: "POST", body: JSON.stringify(data) }),
  updateDermaPrescription: (rxId: string, data: any) =>
    request(`/dermatologist/prescriptions/${rxId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDermaPrescription: (rxId: string) =>
    request(`/dermatologist/prescriptions/${rxId}`, { method: "DELETE" }),
  getDermaReports: (params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/dermatologist/reports${qs ? `?${qs}` : ""}`);
  },
  getDermaResearchPublications: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request(`/dermatologist/research-publications${qs ? `?${qs}` : ""}`);
  },
};