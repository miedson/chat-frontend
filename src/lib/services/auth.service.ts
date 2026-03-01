import { AuthResponse } from "@/app/api/auth/login/route";
import axios from "axios";

export const authService = {
    async login(email: string, password: string): Promise<AuthResponse> {
        return axios.post<AuthResponse>(`/api/auth/login`, { email, password })
        .then((response) => response.data)
        .catch((error) => {
            throw new Error(error.response?.data?.message);
        });
    },
    async logout(): Promise<void> {
        return axios.post("/api/auth/logout")
        .then(() => {})
        .catch((error) => {
            throw new Error(error.response?.data?.message);
        })
    }
}
