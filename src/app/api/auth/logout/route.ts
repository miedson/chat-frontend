import { NextResponse } from "next/server";

export async function POST() {
	const response = NextResponse.json({ ok: true });

	response.cookies.set("access_token", "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		expires: new Date(0),
		path: "/",
	});

	response.cookies.set("refresh_token", "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		expires: new Date(0),
		path: "/",
	});

	return response;
}
