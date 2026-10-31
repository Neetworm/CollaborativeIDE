import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

// ==================== UPLOAD FILE ====================
export async function uploadToS3(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return { key, bucket: BUCKET, region: process.env.AWS_REGION };
}

// ==================== GET SIGNED DOWNLOAD URL ====================
export async function getDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

// ==================== DELETE FILE ====================
export async function deleteFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

// ==================== LIST FILES IN A FOLDER ====================
export async function listFilesInS3(prefix) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  });
  const response = await s3Client.send(command);
  return (response.Contents || []).map((item) => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified,
  }));
}

// ==================== UPLOAD CODE SNAPSHOT ====================
export async function uploadSnapshot(roomId, files, version) {
  const key = `snapshots/${roomId}/v${version}_${Date.now()}.json`;
  const body = JSON.stringify({
    roomId,
    version,
    timestamp: new Date().toISOString(),
    files,
  });
  await uploadToS3(key, body, "application/json");
  return key;
}

// ==================== GET SNAPSHOTS LIST ====================
export async function getSnapshots(roomId) {
  return await listFilesInS3(`snapshots/${roomId}/`);
}

// ==================== GET SNAPSHOT CONTENT ====================
export async function getSnapshotContent(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3Client.send(command);
  const bodyString = await response.Body.transformToString();
  return JSON.parse(bodyString);
}

export { s3Client, BUCKET };