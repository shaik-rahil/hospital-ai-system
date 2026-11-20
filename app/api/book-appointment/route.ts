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
    const { doctor, date, time, patient_name, phone, call_id } = body;

    if (!doctor || !date || !time || !patient_name || !phone) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'doctor, date, time, patient_name, and phone are required.' },
        { status: 400 }
      );
    }

    // 2. Sanitize Phone Number to 10 digits
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

    // 3. Atomically book via SQL stored procedure
    const { data, error } = await supabaseAdmin.rpc('book_by_time', {
      p_doctor: doctor,
      p_date: date,
      p_time: time,
      p_name: patient_name,
      p_phone: cleanPhone,
      p_call: call_id || 'direct_api',
    });

    if (error) {
      console.error('Booking DB error:', error);
      return NextResponse.json({ error: 'booking_failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Booking request error:', err);
    return NextResponse.json({ error: 'invalid_request', details: err.message }, { status: 400 });
  }
}
