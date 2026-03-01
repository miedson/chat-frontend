import axios from "axios";

export const sessionService = {
	logout(): Promise<void> {
		return axios.post("/api/auth/logout").then(() => undefined);
	},
};
