import { tool } from "ai";
import { updatePersonalGoalSchema } from "../schemas/update-personal-goal.schema";
import type { UpdatePersonalGoalResponse } from "../model/update-personal-goal.response";
import {
  updatePersonalGoal,
  calculateGoalProgress,
} from "../../personal-goals/goals.service";

export const updatePersonalGoalTool = tool({
  description:
    "Update an existing personal financial goal's progress, status, or details",
  inputSchema: updatePersonalGoalSchema,
  execute: async (
    params: any,
    context: any
  ): Promise<UpdatePersonalGoalResponse> => {
    try {
      console.log("📝 UPDATE_PERSONAL_GOAL tool called:", params);

      const {
        userId,
        goalId,
        currentAmount,
        status,
        description,
        targetAmount,
        targetDate,
      } = params;

      if (!userId) {
        return {
          success: false,
          message: "User authentication required",
          error: "No user ID provided",
        };
      }

      const updatedGoal = await updatePersonalGoal({
        goalId,
        userId,
        currentAmount,
        status,
        description,
        targetAmount,
        targetDate,
      });

      // Calculate progress percentage if target amount exists
      let progress: number | undefined;
      if (updatedGoal.target_amount && updatedGoal.current_amount) {
        progress = calculateGoalProgress(
          updatedGoal.current_amount,
          updatedGoal.target_amount
        );
      }

      let message = "Meta financiera actualizada exitosamente";

      // Add specific status messages
      if (status === "completed") {
        message = "¡Felicidades! Meta financiera completada exitosamente";
      } else if (status === "paused") {
        message = "Meta financiera pausada temporalmente";
      } else if (status === "cancelled") {
        message = "Meta financiera cancelada";
      } else if (currentAmount !== undefined) {
        message = `Progreso actualizado. ${
          progress ? `Progreso actual: ${progress.toFixed(1)}%` : ""
        }`;
      }

      return {
        success: true,
        message,
        goal: {
          id: updatedGoal.id,
          goalType: updatedGoal.goal_type,
          targetAmount: updatedGoal.target_amount || null,
          currentAmount: updatedGoal.current_amount || "0",
          targetDate: updatedGoal.target_date || null,
          description: updatedGoal.description,
          status: updatedGoal.status,
          progress,
          updatedAt: updatedGoal.updated_at,
        },
      };
    } catch (error: any) {
      console.error("❌ Error in UPDATE_PERSONAL_GOAL tool:", error);
      return {
        success: false,
        message: "Error al actualizar la meta financiera",
        error: error?.message || "Unknown error",
      };
    }
  },
});
