import { NextResponse } from 'next/server'
import { getAccount } from '@/lib/alpaca'

export async function GET() {
  try {
    const accountData = await getAccount();
    return NextResponse.json(accountData);
  } catch (error) {
    console.error('Error in account summary route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account data' },
      { status: 500 }
    );
  }
} 