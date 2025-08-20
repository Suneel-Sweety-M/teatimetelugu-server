import dotenv from "dotenv";
dotenv.config();

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadFile = async (file) => {
  if (!file || !file.buffer) {
    console.error("File or buffer is missing!");
    throw new Error("File buffer is missing");
  }

  const key = `uploads/${Date.now().toString()}_${file.originalname}`;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    // console.log("Upload successful:", data);

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    return { Location: fileUrl };
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
};

export const deleteFile = async (fileUrl) => {
  try {
    // Extract the key from full S3 URL
    // Example: https://mybucket.s3.us-east-1.amazonaws.com/uploads/123_file.jpg
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.substring(1)); // remove leading "/"

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    // console.log(`✅ Deleted file from S3: ${key}`);
    return true;
  } catch (err) {
    console.error("❌ Error deleting file from S3:", err);
    throw err;
  }
};
