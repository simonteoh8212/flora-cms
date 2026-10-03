import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Uploads a file buffer directly to Cloudinary using upload_stream.
 * Applies auto optimization, auto formatting, and max dimensions for mobile speed.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder = "flora-catalog"
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary configuration. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables."
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto:good", fetch_format: "auto" },
          { width: 1200, crop: "limit" }, // limit to 1200px max width for mobile performance
        ],
      },
      (error: unknown, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          console.error("Cloudinary upload error:", error);
          reject(error || new Error("Cloudinary upload failed: No result returned"));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}
