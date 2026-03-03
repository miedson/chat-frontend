import { api } from "@/lib/api";
import { errorResponse } from "../login/route";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const payload = await request.json();

	return api
		.post("/auth/forgot-password", payload)
		.then(() => NextResponse.json({ ok: true }, { status: 200 }))
		.catch((error) => {
			const errorMessage =
				error.response?.data?.message || error.message || "Forgot password failed";
			return errorResponse(errorMessage, error.response?.status || 500);
		});
}
