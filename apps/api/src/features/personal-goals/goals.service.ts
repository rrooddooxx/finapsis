import { eq, and, desc } from 'drizzle-orm';
import { supabase } from '../../providers/supabase';
import { personalFinancialGoals } from '../../providers/supabase/schema/personal-financial-goals';
import { createPersonalGoalEmbeddings } from '../assistant-retrieval/services/universal-embedding.service';
import type { 
    NewPersonalFinancialGoalParams, 
    UpdatePersonalFinancialGoalParams,
    GoalStatus 
} from '../../providers/supabase/schema/personal-financial-goals';

export interface CreateGoalParams {
    userId: string;
    goalType: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string;
    description: string;
    status?: GoalStatus;
}

export interface UpdateGoalParams {
    goalId: string;
    userId: string;
    currentAmount?: number;
    status?: GoalStatus;
    description?: string;
    targetAmount?: number;
    targetDate?: string;
}

export const createPersonalGoal = async (params: CreateGoalParams) => {
    try {
        console.log('💰 Creating personal financial goal:', { 
            userId: params.userId, 
            goalType: params.goalType,
            targetAmount: params.targetAmount 
        });

        const goalData = {
            userId: params.userId,
            goalType: params.goalType,
            targetAmount: params.targetAmount?.toString() || null,
            currentAmount: params.currentAmount?.toString() || "0",
            targetDate: params.targetDate || null,
            description: params.description,
            status: params.status || 'active',
        };

        const [goal] = await supabase
            .insert(personalFinancialGoals)
            .values(goalData)
            .returning();

        console.log('✅ Personal goal created:', { goalId: goal.id });

        // Create embeddings for the goal to make it searchable
        try {
            const goalContent = `Meta financiera: ${params.description}. Tipo: ${params.goalType}.${
                params.targetAmount ? ` Monto objetivo: $${params.targetAmount.toLocaleString('es-CL')}.` : ''
            }${params.targetDate ? ` Fecha objetivo: ${params.targetDate}.` : ''}`;

            await createPersonalGoalEmbeddings(
                goal.id,
                goalContent,
                params.userId,
                params.goalType,
                'active',
                params.targetAmount
            );

            console.log('✅ Goal embeddings created successfully');
        } catch (embeddingError) {
            console.error('⚠️ Failed to create goal embeddings (goal still saved):', embeddingError);
            // Don't throw here - goal creation succeeded, embeddings are optional
        }

        return goal;

    } catch (error) {
        console.error('❌ Error creating personal goal:', error);
        throw error;
    }
};

export const getUserGoals = async (userId: string, status?: GoalStatus) => {
    try {
        console.log('🔍 Getting user goals:', { userId, status });

        let whereCondition = eq(personalFinancialGoals.userId, userId);

        if (status) {
            whereCondition = and(whereCondition, eq(personalFinancialGoals.status, status))!;
        }

        const query = supabase
            .select()
            .from(personalFinancialGoals)
            .where(whereCondition);

        const goals = await query.orderBy(desc(personalFinancialGoals.createdAt));

        console.log('📊 Found goals:', goals.length);
        return goals;

    } catch (error) {
        console.error('❌ Error getting user goals:', error);
        throw error;
    }
};

export const updatePersonalGoal = async (params: UpdateGoalParams) => {
    try {
        console.log('📝 Updating personal goal:', { goalId: params.goalId, userId: params.userId });

        const updateData: any = {};
        
        if (params.currentAmount !== undefined) {
            updateData.currentAmount = params.currentAmount.toString();
        }
        if (params.status) {
            updateData.status = params.status;
        }
        if (params.description) {
            updateData.description = params.description;
        }
        if (params.targetAmount !== undefined) {
            updateData.targetAmount = params.targetAmount.toString();
        }
        if (params.targetDate) {
            updateData.targetDate = params.targetDate;
        }

        const [updatedGoal] = await supabase
            .update(personalFinancialGoals)
            .set(updateData)
            .where(
                and(
                    eq(personalFinancialGoals.id, params.goalId),
                    eq(personalFinancialGoals.userId, params.userId)
                )
            )
            .returning();

        if (!updatedGoal) {
            throw new Error('Goal not found or user unauthorized');
        }

        console.log('✅ Personal goal updated:', { goalId: updatedGoal.id });
        return updatedGoal;

    } catch (error) {
        console.error('❌ Error updating personal goal:', error);
        throw error;
    }
};

export const deletePersonalGoal = async (goalId: string, userId: string) => {
    try {
        console.log('🗑️ Deleting personal goal:', { goalId, userId });

        const [deletedGoal] = await supabase
            .delete(personalFinancialGoals)
            .where(
                and(
                    eq(personalFinancialGoals.id, goalId),
                    eq(personalFinancialGoals.userId, userId)
                )
            )
            .returning();

        if (!deletedGoal) {
            throw new Error('Goal not found or user unauthorized');
        }

        console.log('✅ Personal goal deleted:', { goalId });
        return deletedGoal;

    } catch (error) {
        console.error('❌ Error deleting personal goal:', error);
        throw error;
    }
};

export const getGoalById = async (goalId: string, userId: string) => {
    try {
        console.log('🔍 Getting goal by ID:', { goalId, userId });

        const [goal] = await supabase
            .select()
            .from(personalFinancialGoals)
            .where(
                and(
                    eq(personalFinancialGoals.id, goalId),
                    eq(personalFinancialGoals.userId, userId)
                )
            );

        if (!goal) {
            throw new Error('Goal not found or user unauthorized');
        }

        return goal;

    } catch (error) {
        console.error('❌ Error getting goal by ID:', error);
        throw error;
    }
};

// Helper function to calculate goal progress percentage
export const calculateGoalProgress = (currentAmount: string, targetAmount: string): number => {
    const current = parseFloat(currentAmount || '0');
    const target = parseFloat(targetAmount || '1');
    
    if (target === 0) return 0;
    
    return Math.min((current / target) * 100, 100);
};