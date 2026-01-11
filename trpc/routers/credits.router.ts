import { getCredits } from "@/lib/repositories/credits";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const creditsRouter = createTRPCRouter({
  getAvailableCredits: protectedProcedure.query(async ({ ctx }) => {
    const credits = await getCredits(ctx.user.id);
    return { credits };
  }),
});
