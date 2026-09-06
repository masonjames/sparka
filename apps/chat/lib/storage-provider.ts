// Keep the existing Dokploy R2 environment contract through the S3 adapter.
import { s3 } from "files-sdk/s3";
import { env } from "./env";

const options = { region: "auto" };
export const storageProvider = {
  options,
  slug: "s3" as const,
  createAdapter: () => {
    if (
      !(
        env.R2_BUCKET &&
        env.R2_ENDPOINT &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_PUBLIC_URL
      )
    ) {
      throw new Error(
        "R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL are required"
      );
    }
    return s3({
      ...options,
      bucket: env.R2_BUCKET,
      endpoint: env.R2_ENDPOINT,
      publicBaseUrl: env.R2_PUBLIC_URL,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  },
};
