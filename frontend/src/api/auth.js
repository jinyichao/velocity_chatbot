const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (response.status === 401) {
    throw new Error("Invalid username or password");
  }
  if (!response.ok) {
    throw new Error("Login failed. Please try again.");
  }

  return response.json(); // { token, username }
}

export function getToken() {
  return sessionStorage.getItem("auth_token");
}

export function getUsername() {
  return sessionStorage.getItem("auth_username");
}

export function saveSession(token, username) {
  sessionStorage.setItem("auth_token", token);
  sessionStorage.setItem("auth_username", username);
}

export function clearSession() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_username");
}
