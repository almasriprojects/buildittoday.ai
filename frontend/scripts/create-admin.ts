/**
 * One-time script to create an admin user in Supabase Auth with
 * email_confirm: true (bypasses email confirmation).
 *
 * Usage:
 *   cd frontend
 *   npx tsx --env-file=.env.local scripts/create-admin.ts <email> <password>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in frontend/.env.local
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
const password = process.argv[3];

if (!url || !serviceRoleKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in frontend/.env.local");
  console.error("   Run with: npx tsx --env-file=.env.local scripts/create-admin.ts <email> <password>");
  process.exit(1);
}

if (!email || !password) {
  console.error("❌ Usage: npx tsx --env-file=.env.local scripts/create-admin.ts <email> <password>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("❌ Password must be at least 8 characters");
  process.exit(1);
}

async function main() {
  const supabase = createClient(url!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Creating admin user: ${email} ...`);

  // Create the user with the service role (bypasses RLS)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin", role: "admin" },
  });

  if (error) {
    // If the user already exists, try to update them instead
    if (error.message.includes("already been registered")) {
      console.log("⚠️  User already exists. Attempting to update password + confirm email...");
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("❌ Failed to list users:", listError.message);
        process.exit(1);
      }
      const existing = listData.users.find((u) => u.email === email);
      if (!existing) {
        console.error("❌ User not found in auth.users");
        process.exit(1);
      }
      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: "Admin", role: "admin" },
      });
      if (updateError) {
        console.error("❌ Failed to update user:", updateError.message);
        process.exit(1);
      }
      console.log("✅ Admin user updated with new password and confirmed email.");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }
    console.error("❌ Failed to create user:", error.message);
    process.exit(1);
  }

  console.log("✅ Admin user created successfully!");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   User ID: ${data.user.id}`);
  console.log("");
  console.log("You can now log in at http://localhost:3003/auth/login");
}

main();