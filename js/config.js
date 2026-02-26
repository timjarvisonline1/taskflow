'use strict';

/* ═══════════ SUPABASE CLIENT ═══════════ */
var SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co';   // Replace with your Supabase project URL
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua214bWxnZGhsZ2VobHJieHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDI0MzIsImV4cCI6MjA4NzcxODQzMn0.Zex-u_I5KOXyGQWPtMIm_bU4FZLnHMaT1_vilk4hz0k';   // Replace with your Supabase anon key
var _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ═══════════ CONFIG ═══════════ */
var CONFIG = {
  calendarURL: 'https://script.google.com/macros/s/AKfycbwDYoaN-Q2rflbeTp_9BHsWEy0Z4TYpLO5m8VVYSwzKiJJFaf-KSro1e9b6I2PR1fUf/exec',
  workStart: 9,
  workEnd: 20,
  schedDays: [1, 2, 3, 4],
  calCacheMins: 10
};
