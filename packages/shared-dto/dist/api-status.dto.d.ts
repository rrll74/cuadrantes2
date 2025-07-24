export interface HealthStatus {
    status: "ok" | "error" | "pending";
    message?: string;
}
export interface ApiStatusResponse {
    welcomeMessage: string;
    databaseStatus: {
        new: HealthStatus;
        old: HealthStatus;
    };
}
