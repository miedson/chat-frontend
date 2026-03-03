import { api } from "@/lib/api";
import { errorResponse } from "../login/route";
import { NextResponse } from "next/server";

type RegisterResponse = {
	status: "created" | "verification_required";
	message: string;
};

export async function POST(request: Request) {
	const payload = await request.json();

	return api
		.post<RegisterResponse>("/auth/resend-verification", payload)
		.then((response) =>
			NextResponse.json(response.data, {
				status: response.status,
			}),
		)
		.catch((error) => {
			const errorMessage =
				error.response?.data?.message || error.message || "Resend failed";
			return errorResponse(errorMessage, error.response?.status || 500);
		});
}
