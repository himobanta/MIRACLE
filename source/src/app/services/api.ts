const rawBaseUrl =
  (import.meta.env.VITE_API_URL as string) ||
  "https://miracle-production-e7d3.up.railway.app/api/v1";

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
};