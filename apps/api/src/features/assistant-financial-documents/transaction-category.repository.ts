import { eq, and, or, isNull, sql, inArray } from "drizzle-orm";
import { supabase } from "../../providers/supabase";
import { 
  transactionCategories,
  NewTransactionCategoryParams,
  UpdateTransactionCategoryParams,
  TransactionCategory,
  chileanExpenseCategories,
  chileanIncomeCategories
} from "../../providers/supabase/schema/transaction-categories";
import { devLogger } from "../../utils/logger.utils";

export interface CategoryHierarchy {
  category: TransactionCategory;
  children: TransactionCategory[];
  parent?: TransactionCategory;
}

export interface CategoryQueryFilters {
  transactionType?: 'INCOME' | 'EXPENSE';
  isActive?: boolean;
  isChileanSpecific?: boolean;
  parentCategoryId?: string | null;
  level?: number;
}

export class TransactionCategoryRepository {

  /**
   * Initialize Chilean categories in the database
   */
  async seedChileanCategories(): Promise<{ created: number; updated: number }> {
    try {
      devLogger('TransactionCategoryRepository', '🌱 Seeding Chilean categories');

      let created = 0;
      let updated = 0;

      // Seed expense categories
      for (const categoryData of chileanExpenseCategories) {
        await this.createOrUpdateCategory(categoryData, 'EXPENSE');
        created++;

        // Create subcategories if they exist
        if (categoryData.subcategories) {
          const parentCategory = await this.getByName(categoryData.name);
          if (parentCategory) {
            for (const subcategoryData of categoryData.subcategories) {
              await this.createOrUpdateCategory({
                name: subcategoryData.name,
                displayName: subcategoryData.displayName,
                keywords: subcategoryData.keywords,
                patterns: [],
                parentCategoryId: parentCategory.id,
                level: 1
              }, 'EXPENSE');
              created++;
            }
          }
        }
      }

      // Seed income categories
      for (const categoryData of chileanIncomeCategories) {
        await this.createOrUpdateCategory(categoryData, 'INCOME');
        created++;
      }

      devLogger('TransactionCategoryRepository', '✅ Chilean categories seeded', {
        created,
        updated
      });

      return { created, updated };

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error seeding categories', error);
      throw new Error(`Failed to seed categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new category or update if it exists
   */
  private async createOrUpdateCategory(
    categoryData: any, 
    transactionType: 'INCOME' | 'EXPENSE'
  ): Promise<TransactionCategory> {
    // Check if category exists
    const existingCategory = await this.getByName(categoryData.name);
    
    if (existingCategory) {
      // Update existing category
      return await this.update(existingCategory.id, {
        displayName: categoryData.displayName,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        keywords: categoryData.keywords,
        patterns: categoryData.patterns,
        parentCategoryId: categoryData.parentCategoryId,
        level: categoryData.level || 0
      });
    } else {
      // Create new category
      return await this.create({
        name: categoryData.name,
        displayName: categoryData.displayName,
        transactionType,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        keywords: categoryData.keywords,
        patterns: categoryData.patterns,
        parentCategoryId: categoryData.parentCategoryId,
        level: categoryData.level || 0,
        isChileanSpecific: true,
        isActive: true,
        isSystemCategory: true,
        sortOrder: 0
      });
    }
  }

  /**
   * Create a new transaction category
   */
  async create(category: NewTransactionCategoryParams): Promise<TransactionCategory> {
    try {
      devLogger('TransactionCategoryRepository', '💾 Creating new category', {
        name: category.name,
        type: category.transactionType
      });

      const [result] = await supabase
        .insert(transactionCategories)
        .values(category)
        .returning();

      devLogger('TransactionCategoryRepository', '✅ Category created successfully', {
        categoryId: result.id
      });

      return result;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error creating category', error);
      throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing category
   */
  async update(id: string, updates: UpdateTransactionCategoryParams): Promise<TransactionCategory> {
    try {
      devLogger('TransactionCategoryRepository', '📝 Updating category', {
        categoryId: id,
        updates: Object.keys(updates)
      });

      const [result] = await supabase
        .update(transactionCategories)
        .set({
          ...updates,
          updatedAt: sql`now()`
        })
        .where(eq(transactionCategories.id, id))
        .returning();

      if (!result) {
        throw new Error(`Category with id ${id} not found`);
      }

      devLogger('TransactionCategoryRepository', '✅ Category updated successfully');
      return result;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error updating category', error);
      throw new Error(`Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<TransactionCategory | null> {
    try {
      const [result] = await supabase
        .select()
        .from(transactionCategories)
        .where(eq(transactionCategories.id, id))
        .limit(1);

      return result || null;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error getting category by ID', error);
      throw new Error(`Failed to get category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get category by name
   */
  async getByName(name: string): Promise<TransactionCategory | null> {
    try {
      const [result] = await supabase
        .select()
        .from(transactionCategories)
        .where(eq(transactionCategories.name, name))
        .limit(1);

      return result || null;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error getting category by name', error);
      throw new Error(`Failed to get category by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get categories with filters
   */
  async getCategories(filters: CategoryQueryFilters = {}): Promise<TransactionCategory[]> {
    try {
      const conditions = [eq(transactionCategories.isActive, true)];

      if (filters.transactionType) {
        conditions.push(eq(transactionCategories.transactionType, filters.transactionType));
      }

      if (filters.isChileanSpecific !== undefined) {
        conditions.push(eq(transactionCategories.isChileanSpecific, filters.isChileanSpecific));
      }

      if (filters.parentCategoryId !== undefined) {
        if (filters.parentCategoryId === null) {
          conditions.push(isNull(transactionCategories.parentCategoryId));
        } else {
          conditions.push(eq(transactionCategories.parentCategoryId, filters.parentCategoryId));
        }
      }

      if (filters.level !== undefined) {
        conditions.push(eq(transactionCategories.level, filters.level));
      }

      const categories = await supabase
        .select()
        .from(transactionCategories)
        .where(and(...conditions))
        .orderBy(transactionCategories.sortOrder, transactionCategories.name);

      return categories;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error getting categories', error);
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get category hierarchy (parent with children)
   */
  async getCategoryHierarchy(
    transactionType?: 'INCOME' | 'EXPENSE'
  ): Promise<CategoryHierarchy[]> {
    try {
      const filters: CategoryQueryFilters = { 
        isActive: true,
        parentCategoryId: null // Get top-level categories first
      };

      if (transactionType) {
        filters.transactionType = transactionType;
      }

      const topLevelCategories = await this.getCategories(filters);
      const hierarchy: CategoryHierarchy[] = [];

      for (const category of topLevelCategories) {
        const children = await this.getCategories({
          ...filters,
          parentCategoryId: category.id
        });

        hierarchy.push({
          category,
          children
        });
      }

      return hierarchy;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error getting category hierarchy', error);
      throw new Error(`Failed to get category hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search categories by keyword
   */
  async searchByKeyword(
    keyword: string,
    transactionType?: 'INCOME' | 'EXPENSE'
  ): Promise<TransactionCategory[]> {
    try {
      const conditions = [eq(transactionCategories.isActive, true)];

      if (transactionType) {
        conditions.push(eq(transactionCategories.transactionType, transactionType));
      }

      // Search in name, displayName, and keywords JSONB field
      const searchConditions = or(
        sql`LOWER(${transactionCategories.name}) LIKE ${'%' + keyword.toLowerCase() + '%'}`,
        sql`LOWER(${transactionCategories.displayName}) LIKE ${'%' + keyword.toLowerCase() + '%'}`,
        sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${transactionCategories.keywords}) AS keyword_item WHERE LOWER(keyword_item) LIKE ${'%' + keyword.toLowerCase() + '%'})`
      );

      const categories = await supabase
        .select()
        .from(transactionCategories)
        .where(and(...conditions, searchConditions))
        .orderBy(transactionCategories.sortOrder, transactionCategories.name);

      devLogger('TransactionCategoryRepository', '🔍 Keyword search completed', {
        keyword,
        transactionType,
        resultsCount: categories.length
      });

      return categories;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error searching categories by keyword', error);
      throw new Error(`Failed to search categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get categories that match text patterns (for classification)
   */
  async findMatchingCategories(
    text: string,
    transactionType: 'INCOME' | 'EXPENSE'
  ): Promise<Array<{ category: TransactionCategory; matchScore: number; matchedKeywords: string[] }>> {
    try {
      const categories = await this.getCategories({
        transactionType,
        isActive: true
      });

      const matches: Array<{ category: TransactionCategory; matchScore: number; matchedKeywords: string[] }> = [];
      const lowerText = text.toLowerCase();

      for (const category of categories) {
        let matchScore = 0;
        const matchedKeywords: string[] = [];

        // Check keywords
        if (category.keywords && Array.isArray(category.keywords)) {
          for (const keyword of category.keywords as string[]) {
            if (lowerText.includes(keyword.toLowerCase())) {
              matchScore += 2; // Base keyword weight
              matchedKeywords.push(keyword);
            }
          }
        }

        // Check patterns
        if (category.patterns && Array.isArray(category.patterns)) {
          for (const pattern of category.patterns as string[]) {
            try {
              const regex = new RegExp(pattern, 'gi');
              if (regex.test(text)) {
                matchScore += 3; // Pattern weight higher than keyword
              }
            } catch (regexError) {
              // Skip invalid regex patterns
              devLogger('TransactionCategoryRepository', '⚠️ Invalid regex pattern', { pattern });
            }
          }
        }

        if (matchScore > 0) {
          matches.push({ category, matchScore, matchedKeywords });
        }
      }

      // Sort by match score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore);

      devLogger('TransactionCategoryRepository', '🎯 Found matching categories', {
        textLength: text.length,
        transactionType,
        matchCount: matches.length,
        topMatch: matches[0]?.category.name
      });

      return matches;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error finding matching categories', error);
      throw new Error(`Failed to find matching categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get popular categories (most used in transactions)
   */
  async getPopularCategories(
    transactionType?: 'INCOME' | 'EXPENSE',
    limit = 10
  ): Promise<Array<{ category: TransactionCategory; usageCount: number }>> {
    try {
      // This would require joining with financial_transactions table
      // For now, return all active categories ordered by sort order
      const categories = await this.getCategories({
        transactionType,
        level: 0 // Top-level categories only
      });

      // In a real implementation, you would join with financial_transactions
      // and count usage frequency
      const popularCategories = categories.slice(0, limit).map(category => ({
        category,
        usageCount: 0 // Placeholder - would be actual count from transactions
      }));

      return popularCategories;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error getting popular categories', error);
      throw new Error(`Failed to get popular categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deactivate a category (soft delete)
   */
  async deactivate(id: string): Promise<boolean> {
    try {
      await this.update(id, { isActive: false });
      devLogger('TransactionCategoryRepository', '🚫 Category deactivated', { categoryId: id });
      return true;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error deactivating category', error);
      throw new Error(`Failed to deactivate category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate a category
   */
  async activate(id: string): Promise<boolean> {
    try {
      await this.update(id, { isActive: true });
      devLogger('TransactionCategoryRepository', '✅ Category activated', { categoryId: id });
      return true;

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error activating category', error);
      throw new Error(`Failed to activate category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Chilean-specific categories
   */
  async getChileanCategories(transactionType?: 'INCOME' | 'EXPENSE'): Promise<TransactionCategory[]> {
    return this.getCategories({
      transactionType,
      isChileanSpecific: true,
      isActive: true
    });
  }

  /**
   * Update category sort order
   */
  async updateSortOrder(categoryUpdates: Array<{ id: string; sortOrder: number }>): Promise<void> {
    try {
      devLogger('TransactionCategoryRepository', '🔄 Updating category sort order', {
        updateCount: categoryUpdates.length
      });

      // Update categories in batch
      for (const update of categoryUpdates) {
        await this.update(update.id, { sortOrder: update.sortOrder });
      }

      devLogger('TransactionCategoryRepository', '✅ Sort order updated successfully');

    } catch (error) {
      devLogger('TransactionCategoryRepository', '❌ Error updating sort order', error);
      throw new Error(`Failed to update sort order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const transactionCategoryRepository = new TransactionCategoryRepository();