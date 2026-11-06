"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  profileFieldErrors,
  profileSchema,
} from "@/lib/validation/profile";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors: Record<string, string>;
  values: {
    fullName: string;
    phone: string;
  };
};

export async function updateProfile(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      errors: profileFieldErrors(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in?next=/account&notice=session-expired");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: "Your profile could not be saved. Try again.",
      errors: {},
      values,
    };
  }

  if (!data) {
    return {
      status: "error",
      message:
        "Your profile record could not be found. Contact the club for help.",
      errors: {},
      values,
    };
  }

  revalidatePath("/account");

  return {
    status: "success",
    message: "Profile saved.",
    errors: {},
    values: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
    },
  };
}
