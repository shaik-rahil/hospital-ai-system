import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Map Bolna webhook payload to call_logs table
    const callId = body.call_id || body.id || `call_${Date.now()}`;
    const userNumber = (body.user_number || body.phone || '').replace(/\D/g, '').slice(-10);
    const duration = body.call_duration || body.duration || 0;
    const summary = body.summary || body.call_summary || 'Call finished';
    const transcript = body.transcript || '';
    const recordingUrl = body.recording_url || null;
    const outcome = body.booking_confirmed ? 'booked' : (body.transferred ? 'transferred' : 'info_only');

    const { data, error } = await supabaseAdmin.from('call_logs').upsert({
      call_id: callId,
      phone: userNumber,
      duration_sec: Math.round(Number(duration)),
      summary: summary,
      transcript: transcript,
      outcome: outcome,
      recording_url: recordingUrl,
    }, { onConflict: 'call_id' });

    if (error) {
      console.error('Call log DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'logged', call_id: callId });
  } catch (err: any) {
    console.error('Call webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
