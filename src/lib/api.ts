import axios from "axios";

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveApiBaseUrl() {
	const isServer = typeof window === "undefined";

	if (isServer) {
		// Server-side (route handlers/middleware): prefer backend internal URL.
		const serverUrl =
			process.env.API_CHAT_URL ??
			process.env.NEXT_PUBLIC_API_BASE_URL ??
			"http://localhost:3000";
		return normalizeBaseUrl(serverUrl);
	}

	// Browser: must use public URL reachable by the user agent.
	const clientUrl =
		process.env.NEXT_PUBLIC_API_BASE_URL ??
		process.env.API_CHAT_URL ??
		"http://localhost:3000";
	return normalizeBaseUrl(clientUrl);
}

export const api = axios.create({
	baseURL: resolveApiBaseUrl(),
	withCredentials: true,
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401 && typeof document !== "undefined") {
			document.cookie =
				"access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
		}

		return Promise.reject(error);
	}
);
