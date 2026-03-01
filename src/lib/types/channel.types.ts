export type ChannelConnection = {
	id: string;
	kind: "whatsapp" | "instagram";
	provider: "evolution" | "whatsapp_cloud" | "instagram_graph";
	name: string;
	phone: string;
	status: "pending_qr" | "connected" | "disconnected" | "failed";
	providerInstanceKey: string | null;
	qrCodeBase64: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ConnectWhatsappPayload = {
	provider: "evolution" | "whatsapp_cloud";
	name?: string;
	phone?: string;
	useOrganizationPhone: boolean;
};
