import { AuthResponse, setAuthCookies } from "./app/api/auth/login/route";
import { NextRequest, NextResponse } from "next/server";

const loginUrl = "/login";

export async function proxy(request: NextRequest) {
	const cookies = request.headers.get("cookie");
	const hasAccessToken = cookies?.includes("access_token=");
	const hasRefreshToken = cookies?.includes("refresh_token=");
	const isLoginPage = request.nextUrl.pathname === loginUrl;

	if (!hasAccessToken && hasRefreshToken && cookies?.length) {
		const url = request.nextUrl.clone();
		const refreshToken = cookies
			.split(";")
			.find((cookie) => cookie.trim().startsWith("refresh_token="))
			?.split("=")[1];

		const response = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				refreshToken: refreshToken ? decodeURIComponent(refreshToken) : undefined,
			}),
		});

		if (!response.ok) {
			const failedUrl = request.nextUrl.clone();
			failedUrl.pathname = loginUrl;
			return NextResponse.redirect(failedUrl);
		}

		const data = (await response.json()) as AuthResponse;
		return setAuthCookies(NextResponse.redirect(url), data);
	}

	if (!hasAccessToken && !isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = loginUrl;
		return NextResponse.redirect(url);
	}

	if (hasAccessToken && isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/board";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
