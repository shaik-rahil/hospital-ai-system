import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  // 1. Verify Secret Token
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.AGENT_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const doctor = body.doctor || '';
    const date = body.date || new Date().toISOString().split('T')[0];

    // 2. Call Postgres Stored Procedure
    const { data, error } = await supabaseAdmin.rpc('doctor_day_info', {
      p_doctor: doctor,
      p_date: date,
    });

    if (error) {
      console.error('Availability check DB error:', error);
      return NextResponse.json({ error: 'lookup_failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Availability check request error:', err);
    return NextResponse.json({ error: 'invalid_request', details: err.message }, { status: 400 });
  }
}
