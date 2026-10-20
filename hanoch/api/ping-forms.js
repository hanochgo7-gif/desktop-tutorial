// שומר את פרויקט השאלונים ב-Supabase (hg-forms) פעיל: בתוכנית החינמית פרויקט בלי פעילות שבוע עובר להשהיה.
// רץ פעם ביום כ-Cron של Vercel. קורא רק לפונקציה ping, שמחזירה 1 ולא נוגעת בתשובות.
module.exports = async (req, res) => {
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
