#!/usr/bin/env bun
import { clearAllData } from "../src/providers/supabase";

async function main() {
    try {
        await clearAllData();
        process.exit(0);
    } catch (error) {
        console.error('Failed to clear database:', error);
        process.exit(1);
    }
}

main();