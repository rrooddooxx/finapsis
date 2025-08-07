export interface UpdatePersonalGoalResponse {
    success: boolean;
    message: string;
    goal?: {
        id: string;
        goalType: string;
        targetAmount: string | null;
        currentAmount: string;
        targetDate: string | null;
        description: string;
        status: string;
        progress?: number;
        updatedAt: string;
    };
    error?: string;
}