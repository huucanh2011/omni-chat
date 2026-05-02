export type Platform = "telegram" | "zalo" | "teams";

export interface Account {
  id: string;
  platform: Platform;
  displayName: string;
  serviceUrl: string;
  status: "connected" | "disconnected" | "expired";
  createdAt: string;
  updatedAt: string;
}
