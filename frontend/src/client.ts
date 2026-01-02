import type { User } from "./types";

const API_HOST = import.meta.env.VITE_API_HOST || "";
const API_BASE = `${API_HOST}/api`;

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export interface CreateUserRequest {
  username: string;
  email: string;
}

export interface CreateUserResponse {
  id: string;
}

export interface DeleteUserResponse {
  message: string;
}

export const userApi = {
  get: async (userId: string) => apiFetch<User>(`/users/${userId}`),
  getAll: async () => apiFetch<User[]>("/users"),
  create: async (user: CreateUserRequest) =>
    apiFetch<CreateUserResponse>("/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),
  delete: async (userId: string) =>
    apiFetch<DeleteUserResponse>(`/users/${userId}`, { method: "DELETE" }),
};
