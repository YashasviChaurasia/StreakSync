"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function generateHexId(): string {
  const hex = Math.random().toString(16).slice(2, 7);
  return `0x${hex}`;
}

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export async function signUp(): Promise<{
  success: boolean;
  hexId?: string;
  password?: string;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  const hexId = generateHexId();
  const password = generatePassword();
  const email = `${hexId.replace("0x", "")}@streaksync.local`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        hex_id: hexId,
        display_name: hexId,
        avatar_seed: hexId,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, hexId, password };
}

export async function signIn(
  hexId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const email = `${hexId.replace("0x", "")}@streaksync.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: "Invalid ID or password" };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}

export async function updateNickname(nickname: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: nickname },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Also update the users table
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("users").update({ name: nickname }).eq("id", user.id);
  }

  return { success: true };
}
