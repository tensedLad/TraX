import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://lbbglktdggrdevgmmpnn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYmdsa3RkZ2dyZGV2Z21tcG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjUyMjQsImV4cCI6MjA5MDA0MTIyNH0.LZjTv3xaLWlkWdLj2UmJp-hl0AzH1CJibkgIJC0U8vY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function test() {
  console.log("Fetching...");
  const { data, error } = await supabase.from('assets').select('*').order('volume_24h', { ascending: false });
  console.log(error || (data && data.length ? data.length + ' assets' : 'no assets'));
  process.exit(0);
}
test();
