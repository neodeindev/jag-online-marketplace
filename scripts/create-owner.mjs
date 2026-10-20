#!/usr/bin/env node
/**
 * Create the store owner's account (or promote an existing account to owner).
 *
 *   npm run create-owner -- owner@yourstore.com "Owner Name"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from the environment
 * (.env or .env.local by default). For production, run it with the production values:
 *
 *   node --env-file=.env.production scripts/create-owner.mjs owner@yourstore.com "Owner Name"
 *
 * A strong temporary password is generated and printed once. The owner should
 * change it after signing in (Account → Profile & address → Change password).
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim() || null;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run create-owner -- owner@yourstore.com "Owner Name"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();

let userId = existing?.id;
let password = null;

if (!userId) {
  password = randomBytes(12).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    console.error(`Couldn't create the account: ${error.message}`);
    process.exit(1);
  }
  userId = data.user.id;
}

const { error } = await admin
  .from("profiles")
  .update({ role: "owner", permissions: [], ...(fullName ? { full_name: fullName } : {}) })
  .eq("id", userId);
if (error) {
  console.error(`Couldn't grant owner access: ${error.message}`);
  process.exit(1);
}

console.log(`\n✔ ${email} is now the store owner.`);
if (password) {
  console.log(`  Temporary password: ${password}`);
  console.log("  Share it privately and change it after the first sign-in.\n");
} else {
  console.log("  The account already existed, so its password is unchanged.\n");
}
