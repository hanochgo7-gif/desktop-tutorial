// שומר את פרויקט השאלונים ב-Supabase (hg-forms) פעיל: בתוכנית החינמית פרויקט בלי פעילות שבוע עובר להשהיה.
// רץ פעם ביום כ-Cron של Vercel. קורא רק לפונקציה ping, שמחזירה 1 ולא נוגעת בתשובות.
// מוגן: Vercel Cron שולח Authorization: Bearer <CRON_SECRET> כשהמשתנה מוגדר בפרויקט. בלי המשתנה, רק GET (כמו ה-Cron).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'auth' });
  try {
    const r = await fetch('https://ewddzunakbaxtonysgrd.supabase.co/rest/v1/rpc/ping', {
      method: 'POST',
      headers: { apikey: 'sb_publishable_gQV6w1bIQz5-84ZhsBrG9Q_gkKi341s', 'Content-Type': 'application/json' },
      body: '{}',
    });
    res.status(200).json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
