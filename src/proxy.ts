import { AuthResponse, setAuthCookies } from "./app/api/auth/login/route";
import { NextRequest, NextResponse } from "next/server";

const loginUrl = "/login";
const registerUrl = "/register";
const verifyEmailUrl = "/verificar-email";
const resetPasswordUrl = "/redefinir-senha";
const pendingVerificationCookie = "pending_verification";
const pendingVerificationEmailCookie = "pending_verification_email";

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

function isPendingVerification(request: NextRequest) {
	return request.cookies.get(pendingVerificationCookie)?.value === "1";
}

export async function proxy(request: NextRequest) {
	const cookies = request.headers.get("cookie") ?? "";
	const hasAccessToken = cookies?.includes("access_token=");
	const hasRefreshToken = cookies?.includes("refresh_token=");
	const isLoginPage = request.nextUrl.pathname === loginUrl;
	const isRegisterPage = request.nextUrl.pathname === registerUrl;
	const isVerifyEmailPage = request.nextUrl.pathname === verifyEmailUrl;
	const isResetPasswordPage = request.nextUrl.pathname === resetPasswordUrl;
	const isPublicAuthPage =
		isLoginPage || isRegisterPage || isVerifyEmailPage || isResetPasswordPage;
	const hasPendingVerification = isPendingVerification(request);

	if (hasPendingVerification && !isVerifyEmailPage) {
		const url = request.nextUrl.clone();
		url.pathname = verifyEmailUrl;

		const pendingEmail = request.cookies.get(pendingVerificationEmailCookie)?.value;
		if (pendingEmail) {
			try {
				url.searchParams.set("email", decodeURIComponent(pendingEmail));
			} catch {
				url.searchParams.set("email", pendingEmail);
			}
		}

		return NextResponse.redirect(url);
	}

	if (!hasAccessToken && hasRefreshToken && cookies?.length) {
		const url = request.nextUrl.clone();
		const refreshToken = cookies
			.split(";")
			.find((cookie) => cookie.trim().startsWith("refresh_token="))
			?.split("=")[1];
		const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

		if (!backendBaseUrl) {
			const failedUrl = request.nextUrl.clone();
			failedUrl.pathname = loginUrl;
			return NextResponse.redirect(failedUrl);
		}

		const response = await fetch(
			`${normalizeBaseUrl(backendBaseUrl)}/auth/refresh`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: `refresh_token=${
						refreshToken ? encodeURIComponent(decodeURIComponent(refreshToken)) : ""
					}`,
				},
			},
		);

		if (!response.ok) {
			const failedUrl = request.nextUrl.clone();
			failedUrl.pathname = loginUrl;
			return NextResponse.redirect(failedUrl);
		}

		const data = (await response.json()) as AuthResponse;
		return setAuthCookies(NextResponse.redirect(url), data);
	}

	if (!hasAccessToken && !isPublicAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = loginUrl;
		return NextResponse.redirect(url);
	}

	if (hasAccessToken && (isLoginPage || isRegisterPage || isResetPasswordPage)) {
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
