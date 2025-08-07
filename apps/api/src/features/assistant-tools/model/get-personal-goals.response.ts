export interface PersonalGoalItem {
    id: string;
    goalType: string;
    targetAmount: string | null;
    currentAmount: string;
    targetDate: string | null;
    description: string;
    status: string;
    progress?: number;
    createdAt: string;
    updatedAt: string;
}

export interface GetPersonalGoalsResponse {
    success: boolean;
    message: string;
    goals?: PersonalGoalItem[];
    totalGoals?: number;
    activeGoals?: number;
    completedGoals?: number;
    error?: string;
}