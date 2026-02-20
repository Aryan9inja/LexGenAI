const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: "include", // Always include cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || "An error occurred"
    );
  }

  return data as T;
}

export const api = {
  // Auth endpoints
  auth: {
    register: (name: string, email: string, password: string) =>
      fetchAPI<{ message: string; user: { _id: string; name: string; email: string } }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        }
      ),

    login: (email: string, password: string) =>
      fetchAPI<{ message: string; user: { _id: string; name: string; email: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      ),

    logout: () =>
      fetchAPI<{ message: string }>("/auth/logout", {
        method: "POST",
      }),

    getProfile: () =>
      fetchAPI<{ user: { _id: string; name: string; email: string } }>(
        "/auth/me"
      ),
  },

  // Document endpoints
  documents: {
    getAll: () =>
      fetchAPI<{
        documents: Array<{
          _id: string;
          title: string;
          description: string;
          contractText?: string;
          riskAnalysis?: Array<{
            text: string;
            riskLevel: "high" | "medium" | "low";
            explanation: string;
            suggestion: string;
          }>;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>;
      }>("/documents"),

    create: (title: string, plainTextDescription: string) =>
      fetchAPI<{
        message: string;
        document: {
          _id: string;
          title: string;
          plainTextDescription: string;
          status: string;
        };
      }>("/documents/create", {
        method: "POST",
        body: JSON.stringify({ title, plainTextDescription }),
      }),

    generate: (documentId: string) =>
      fetchAPI<{
        message: string;
        document: {
          _id: string;
          title: string;
          contractText?: string;
          status: string;
        };
      }>("/documents/generate", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }),

    analyzeRisk: (documentId: string) =>
      fetchAPI<{
        message: string;
        document: {
          _id: string;
          title: string;
          contractText?: string;
          riskAnalysis?: Array<{
            text: string;
            riskLevel: "high" | "medium" | "low";
            explanation: string;
            suggestion: string;
          }>;
          status: string;
        };
      }>("/documents/analyze-risk", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }),

    getById: (documentId: string) =>
      fetchAPI<{
        document: {
          _id: string;
          title: string;
          contractText?: string;
          riskAnalysis?: Array<{
            text: string;
            riskLevel: "high" | "medium" | "low";
            explanation: string;
            suggestion: string;
          }>;
          status: string;
        };
      }>(`/documents/${documentId}`),

    update: (documentId: string, contractText: string) =>
      fetchAPI<{
        message: string;
        document: {
          _id: string;
          title: string;
          contractText?: string;
          status: string;
        };
      }>(`/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ contractText }),
      }),
  },
};

export { ApiError };
