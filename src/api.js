const API_HOST = window.location.hostname || "localhost";
const API_BASE = import.meta.env.VITE_API_URL || `http://${API_HOST}:8080/api`;

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(sessionStorage.getItem("moneta.auth") ? { Authorization: sessionStorage.getItem("moneta.auth") } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the finance API. Start the Spring Boot backend and try again.");
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `API request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const jsonBody = (value) => JSON.stringify(value);
