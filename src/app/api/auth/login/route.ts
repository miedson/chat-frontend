import { api } from "@/lib/api";
import { NextResponse } from "next/server";

export type AuthResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

export const errorResponse = (message: string, status: number) => {
	return new Response(JSON.stringify({ message }), { status });
};

export const setAuthCookies = (response: NextResponse, data: AuthResponse) => {
	const { access_token, refresh_token, expires_in } = data;

	response.cookies.set("access_token", access_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: expires_in,
	});
	response.cookies.set("refresh_token", refresh_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
	});

	return response;
};

export async function POST(request: Request) {
	const { email, password } = await request.json();
	return api
		.post<AuthResponse>("/auth/login", { email, password })
		.then((response) => setAuthCookies(NextResponse.json(response.data), response.data))
		.catch((error) => {
			const errorMessage =
				error.response?.data?.message || error.message || "Login failed";
			return errorResponse(errorMessage, error.response?.status || 500);
		});
}
