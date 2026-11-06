"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const proofSubmissionSchema = z.object({
  bookingId: z.string().uuid(),
  reference: z.string().trim().min(1).max(40),
  proofPath: z.string().trim().min(1).max(400),
  transactionReference: z.string().trim().max(120).optional().default(""),
});

const groupProofSubmissionSchema = z.object({
  groupId: z.string().uuid(),
  reference: z.string().trim().min(1).max(40),
  proofPath: z.string().trim().min(1).max(400),
  transactionReference: z.string().trim().max(120).optional().default(""),
});

export type PaymentProofResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      code?: "session-expired" | "invalid" | "already-submitted";
      message: string;
    };

export async function registerPaymentProof(input: {
  bookingId: string;
  reference: string;
  proofPath: string;
  transactionReference?: string;
}): Promise<PaymentProofResult> {
  const parsed = proofSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      code: "invalid",
      message: "Check the proof file and booking reference, then try again.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      code: "session-expired",
      message: "Your session expired. Sign in again to submit this proof.",
    };
  }

  const reference = parsed.data.reference.toUpperCase();
  const expectedPrefix = `${user.id}/${parsed.data.bookingId}/`;

  if (!parsed.data.proofPath.startsWith(expectedPrefix)) {
    return {
      status: "error",
      code: "invalid",
      message: "That proof file does not belong to this booking.",
    };
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, reference")
    .eq("id", parsed.data.bookingId)
    .eq("reference", reference)
    .eq("player_id", user.id)
    .maybeSingle();

  if (bookingError || !booking) {
    return {
      status: "error",
      code: "invalid",
      message: "This booking could not be found on your account.",
    };
  }

  const { error: proofError } = await supabase.rpc("submit_payment_proof", {
    p_booking_id: parsed.data.bookingId,
    p_proof_path: parsed.data.proofPath,
    p_transaction_reference: parsed.data.transactionReference || null,
  });

  if (proofError) {
    if (proofError.code === "42501") {
      return {
        status: "error",
        code: "session-expired",
        message: "Your session expired. Sign in again to submit this proof.",
      };
    }

    if (proofError.code === "22023") {
      return {
        status: "error",
        code: proofError.message.includes("already been submitted")
          ? "already-submitted"
          : "invalid",
        message: proofError.message,
      };
    }

    return {
      status: "error",
      message:
        "The proof could not be recorded. Try again, or contact the club with your booking reference.",
    };
  }

  revalidatePath(`/account/bookings/${booking.reference}`);
  revalidatePath("/account");

  return {
    status: "success",
    message:
      "Proof submitted. Your payment stays awaiting staff verification until the actual transfer is checked.",
  };
}

export async function registerGroupPaymentProof(input: {
  groupId: string;
  reference: string;
  proofPath: string;
  transactionReference?: string;
}): Promise<PaymentProofResult> {
  const parsed = groupProofSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      code: "invalid",
      message: "Check the proof file and booking reference, then try again.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      code: "session-expired",
      message: "Your session expired. Sign in again to submit this proof.",
    };
  }

  const reference = parsed.data.reference.toUpperCase();
  const expectedPrefix = `${user.id}/${parsed.data.groupId}/`;

  if (!parsed.data.proofPath.startsWith(expectedPrefix)) {
    return {
      status: "error",
      code: "invalid",
      message: "That proof file does not belong to this booking.",
    };
  }

  const { data: group, error: groupError } = await supabase
    .from("booking_groups")
    .select("id, reference")
    .eq("id", parsed.data.groupId)
    .eq("reference", reference)
    .eq("player_id", user.id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      status: "error",
      code: "invalid",
      message: "This booking could not be found on your account.",
    };
  }

  const { error: proofError } = await supabase.rpc(
    "submit_booking_group_payment_proof",
    {
      p_group_id: parsed.data.groupId,
      p_proof_path: parsed.data.proofPath,
      p_transaction_reference: parsed.data.transactionReference || null,
    },
  );

  if (proofError) {
    if (proofError.code === "42501") {
      return {
        status: "error",
        code: "session-expired",
        message: "Your session expired. Sign in again to submit this proof.",
      };
    }

    if (proofError.code === "22023") {
      return {
        status: "error",
        code: proofError.message.includes("already been submitted")
          ? "already-submitted"
          : "invalid",
        message: proofError.message,
      };
    }

    return {
      status: "error",
      message:
        "The proof could not be recorded. Try again, or contact the club with your booking reference.",
    };
  }

  revalidatePath(`/account/bookings/group/${group.reference}`);
  revalidatePath("/account");

  return {
    status: "success",
    message:
      "Proof submitted for the whole reservation. Payment stays awaiting staff verification until the actual transfer is checked.",
  };
}
