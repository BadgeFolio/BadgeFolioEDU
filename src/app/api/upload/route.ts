import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

interface CloudinaryUploadResult {
  secure_url: string;
  [key: string]: any;
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both multipart form data and base64 data URLs
    let uploadResult: CloudinaryUploadResult;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to Cloudinary
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'evidence',
            resource_type: 'auto',
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error) reject(error);
            else if (!result) reject(new Error('No upload result received'));
            else resolve({
              ...result,
              secure_url: result.secure_url
            } as CloudinaryUploadResult);
          }
        );

        // Create a readable stream from the buffer and pipe it to the upload stream
        const { Readable } = require('stream');
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    } else {
      // Handle base64 data URL (for drawings)
      const { dataUrl } = await request.json();
      if (!dataUrl) {
        return NextResponse.json({ error: 'No data URL provided' }, { status: 400 });
      }

      uploadResult = await cloudinary.uploader.upload(dataUrl, {
        folder: 'evidence',
      });
    }

    return NextResponse.json({
      url: uploadResult.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 