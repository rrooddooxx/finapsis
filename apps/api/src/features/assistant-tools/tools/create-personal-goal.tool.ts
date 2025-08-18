import { tool } from "ai";
import { createPersonalGoalSchema } from "../schemas/create-personal-goal.schema";
import type { CreatePersonalGoalResponse } from "../model/create-personal-goal.response";
import {
  createPersonalGoal,
  calculateGoalProgress,
} from "../../personal-goals/goals.service";

export const createPersonalGoalTool = tool({
  description:
    "Create a new personal financial goal when the user expresses intent to set a financial target or objective",
  inputSchema: createPersonalGoalSchema,
  execute: async (
    params: any,
    context: any
  ): Promise<CreatePersonalGoalResponse> => {
    try {
      console.log("🎯 CREATE_PERSONAL_GOAL tool called:", params);

      const {
        userId,
        goalType,
        targetAmount,
        currentAmount,
        targetDate,
        description,
      } = params;

      if (!userId) {
        return {
          success: false,
          message: "User authentication required",
          error: "No user ID provided",
        };
      }

      const goal = await createPersonalGoal({
        userId,
        goalType,
        targetAmount,
        currentAmount: currentAmount ?? 0,
        targetDate,
        description,
        status: "active",
      });

      // Calculate progress percentage if target amount is provided
      let progress: number | undefined;
      if (goal.target_amount && goal.current_amount) {
        progress = calculateGoalProgress(
          goal.current_amount,
          goal.target_amount
        );
      }

      return {
        success: true,
        message: `Meta financiera "${goalType}" creada exitosamente`,
        goal: {
          id: goal.id,
          goalType: goal.goal_type,
          targetAmount: goal.target_amount || null,
          currentAmount: goal.current_amount || "0",
          targetDate: goal.target_date || null,
          description: goal.description,
          status: goal.status,
          progress,
          createdAt: goal.created_at,
        },
      };
    } catch (error: any) {
      console.error("❌ Error in CREATE_PERSONAL_GOAL tool:", error);
      return {
        success: false,
        message: "Error al crear la meta financiera",
        error: error?.message || "Unknown error",
      };
    }
  },
});
