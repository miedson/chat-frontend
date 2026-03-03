import { AuthResponse } from "@/app/api/auth/login/route";
import axios from "axios";

export type RegisterPayload = {
	name: string;
	displayName?: string | null;
	email: string;
	password: string;
	organization: {
		name: string;
		document: string;
		phone: string;
		domain?: string | null;
		supportEmail?: string | null;
	};
};

export type RegisterResponse = {
	status: "created" | "verification_required";
	message: string;
};

export type VerifyEmailPayload = {
	email: string;
	code: string;
};

export type ResendVerificationPayload = {
	email: string;
	password: string;
};
export type ForgotPasswordPayload = {
	email: string;
};
export type ResetPasswordPayload = {
	token: string;
	password: string;
};

export const authService = {
	async login(email: string, password: string): Promise<AuthResponse> {
		return axios
			.post<AuthResponse>(`/api/auth/login`, { email, password })
			.then((response) => response.data)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async register(payload: RegisterPayload): Promise<RegisterResponse> {
		return axios
			.post<RegisterResponse>("/api/auth/register", payload)
			.then((response) => response.data)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async verifyEmail(payload: VerifyEmailPayload): Promise<void> {
		return axios
			.post("/api/auth/verify-email", payload)
			.then(() => undefined)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async resendVerification(payload: ResendVerificationPayload): Promise<RegisterResponse> {
		return axios
			.post<RegisterResponse>("/api/auth/resend-verification", payload)
			.then((response) => response.data)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
		return axios
			.post("/api/auth/forgot-password", payload)
			.then(() => undefined)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async resetPassword(payload: ResetPasswordPayload): Promise<void> {
		return axios
			.post("/api/auth/reset-password", payload)
			.then(() => undefined)
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
	async logout(): Promise<void> {
		return axios
			.post("/api/auth/logout")
			.then(() => {})
			.catch((error) => {
				throw new Error(error.response?.data?.message);
			});
	},
};
