const VERIFY_FLAG_COOKIE = "pending_verification";
const VERIFY_EMAIL_COOKIE = "pending_verification_email";

export function setPendingVerification(email: string) {
	if (typeof document === "undefined") return;

	const encodedEmail = encodeURIComponent(email.trim());
	document.cookie = `${VERIFY_FLAG_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax`;
	document.cookie = `${VERIFY_EMAIL_COOKIE}=${encodedEmail}; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function clearPendingVerification() {
	if (typeof document === "undefined") return;

	document.cookie = `${VERIFY_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
	document.cookie = `${VERIFY_EMAIL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasPendingVerification() {
	if (typeof document === "undefined") return false;
	return document.cookie.includes(`${VERIFY_FLAG_COOKIE}=1`);
}
