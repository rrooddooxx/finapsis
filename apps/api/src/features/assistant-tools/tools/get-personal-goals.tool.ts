import { tool } from "ai";
import { getPersonalGoalsSchema } from "../schemas/get-personal-goals.schema";
import type {
  GetPersonalGoalsResponse,
  PersonalGoalItem,
} from "../model/get-personal-goals.response";
import {
  getUserGoals,
  calculateGoalProgress,
} from "../../personal-goals/goals.service";

export const getPersonalGoalsTool = tool({
  description:
    "Retrieve user's personal financial goals with optional status filtering",
  inputSchema: getPersonalGoalsSchema,
  execute: async (
    params: any,
    context: any
  ): Promise<GetPersonalGoalsResponse> => {
    try {
      console.log("📋 GET_PERSONAL_GOALS tool called:", params);

      const { userId, status } = params;

      if (!userId) {
        return {
          success: false,
          message: "User authentication required",
          error: "No user ID provided",
        };
      }

      const goals = await getUserGoals(userId, status);

      // Transform goals with progress calculation
      const goalsWithProgress: PersonalGoalItem[] = goals.map((goal) => {
        let progress: number | undefined;
        if (goal.target_amount && goal.current_amount) {
          progress = calculateGoalProgress(
            goal.current_amount,
            goal.target_amount
          );
        }

        return {
          id: goal.id,
          goalType: goal.goal_type,
          targetAmount: goal.target_amount || null,
          currentAmount: goal.current_amount || "0",
          targetDate: goal.target_date || null,
          description: goal.description,
          status: goal.status,
          progress,
          createdAt: goal?.created_at,
          updatedAt: goal?.updated_at,
        };
      });

      // Calculate stats
      const totalGoals = goalsWithProgress.length;
      const activeGoals = goalsWithProgress.filter(
        (g) => g.status === "active"
      ).length;
      const completedGoals = goalsWithProgress.filter(
        (g) => g.status === "completed"
      ).length;

      const message =
        totalGoals === 0
          ? "No tienes metas financieras registradas"
          : `Encontradas ${totalGoals} meta(s) financiera(s)${
              status ? ` con estado: ${status}` : ""
            }`;

      return {
        success: true,
        message,
        goals: goalsWithProgress,
        totalGoals,
        activeGoals,
        completedGoals,
      };
    } catch (error: any) {
      console.error("❌ Error in GET_PERSONAL_GOALS tool:", error);
      return {
        success: false,
        message: "Error al obtener las metas financieras",
        error: error?.message || "Unknown error",
      };
    }
  },
});
