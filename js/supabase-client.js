// js/supabase-client.js
(function () {
  const supabaseUrl = "https://aygjiwialyfonpewdxqw.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Z2ppd2lhbHlmb25wZXdkeHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTUzNTUsImV4cCI6MjA2ODE5MTM1NX0.bzFrIpBvqWW4iZEJqctWCXgDzY2iFG8Vv64pfm1s8kY";
  // supabase este acum global
  window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase initialized");
})();
(async () => {
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .limit(1);
  if (error) console.error("❌ Supabase error:", error);
  else console.log("✅ Supabase OK, questions:", data);
})();
