export interface CreatePersonalGoalResponse {
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
        createdAt: string;
    };
    error?: string;
}