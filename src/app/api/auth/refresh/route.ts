import { api } from "@/lib/api";
import { AuthResponse, errorResponse, setAuthCookies } from "../login/route";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const { refreshToken } = (await request.json().catch(() => ({}))) as {
		refreshToken?: string;
	};

	if (!refreshToken) {
		return errorResponse("Refresh token is required", 400);
	}

	return api
		.post<AuthResponse>(
			"/auth/refresh",
			{},
			{
				headers: {
					Cookie: `refresh_token=${encodeURIComponent(refreshToken)}`,
				},
			}
		)
		.then((response) => setAuthCookies(NextResponse.json(response.data), response.data))
		.catch((error) => {
			const errorMessage =
				error.response?.data?.message || error.message || "Refresh failed";
			return errorResponse(errorMessage, error.response?.status || 500);
		});
}
