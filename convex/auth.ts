import Resend from "@auth/core/providers/resend";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const resendApiKey = process.env.AUTH_RESEND_KEY;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: resendApiKey
        ? Resend({
            apiKey: resendApiKey,
            from: process.env.AUTH_EMAIL_FROM ?? "SlotPay PH <auth@slotpay.ph>",
          })
        : undefined,
    }),
  ],
});
