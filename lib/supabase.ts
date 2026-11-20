import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ohmqximmxfyxapocqsjj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obXF4aW1teGZ5eGFwb2Nxc2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMzk4NDcsImV4cCI6MjExMDcxNTg0N30.MvRvKvWVlYonq4gPHzO3DRdrGVtDYKnN5Grh_uZWxY8';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
