import axios from "axios";

export const api = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
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
