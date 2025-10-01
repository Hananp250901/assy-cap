// ISI FILE: supabase-client.js (Versi Final yang Benar)

const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';

// =======================================================================
// INI ADALAH KODE YANG BENAR
// Kode ini menggunakan `window.supabase` (dari library CDN) untuk membuat
// client baru, yang kemudian disimpan di variabel `supabase` kita.
// =======================================================================
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);