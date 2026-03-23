import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  async onModuleInit() {
    this.bucket = process.env.MINIO_BUCKET || 'lumen-files';
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, { 'Content-Type': mimeType });
  }

  getPresignedUrl(key: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, 60 * 60);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
