import { eq } from "drizzle-orm";
import { supabase } from "../../providers/supabase";
import { 
  users,
  NewUserParams,
  User
} from "../../providers/supabase/schema/users";
import { devLogger } from "../../utils/logger.utils";

export class UserRepository {
  
  async findOrCreateUser(email: string): Promise<User> {
    try {
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        return existingUser;
      }
      return this.createUser({ email });
    } catch (error) {
      devLogger('UserRepository', 'Error finding or creating user', error);
      throw new Error(`Failed to find or create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createUser(params: NewUserParams): Promise<User> {
    try {
      devLogger('UserRepository', 'Creating new user', { email: params.email });

      const [result] = await supabase
        .insert(users)
        .values(params)
        .returning();

      devLogger('UserRepository', 'User created successfully', { userId: result.id });

      return result;

    } catch (error) {
      devLogger('UserRepository', 'Error creating user', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const [result] = await supabase
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return result || null;

    } catch (error) {
      devLogger('UserRepository', 'Error finding user by email', error);
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const [result] = await supabase
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return result || null;

    } catch (error) {
      devLogger('UserRepository', 'Error finding user by ID', error);
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const userRepository = new UserRepository();