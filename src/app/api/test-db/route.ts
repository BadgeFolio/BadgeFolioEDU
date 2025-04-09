import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to connect to the database
    await dbConnect();
    
    // If we get here, connection was successful
    return NextResponse.json({ 
      status: 'success', 
      message: 'Successfully connected to MongoDB',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If there's an error, return it
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 