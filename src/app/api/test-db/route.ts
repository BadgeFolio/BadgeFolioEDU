import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let connectionStatus = 'Not attempted';
  let connectionError = null;
  let collections: string[] = [];
  
  try {
    // Log environment info
    console.log(`MongoDB URI defined: ${!!process.env.MONGODB_URI}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        error: 'Missing MongoDB URI',
        environment: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
      }, { status: 500 });
    }
    
    // Attempt connection
    connectionStatus = 'Connecting...';
    await mongoose.connect(process.env.MONGODB_URI);
    connectionStatus = 'Connected';
    
    // Get collections
    if (mongoose.connection.db) {
      const collectionsResult = await mongoose.connection.db.listCollections().toArray();
      collections = collectionsResult.map(c => c.name);
    }
    
    // Close connection
    await mongoose.connection.close();
    
    // Return success
    return NextResponse.json({
      success: true,
      connectionStatus,
      collections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DB Connection error:', error);
    connectionError = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      connectionStatus,
      error: connectionError,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 