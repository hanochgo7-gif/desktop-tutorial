import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <html lang="he" dir="rtl">
      <body className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
        <div>
          <p className="text-[64px] font-semibold text-prussian">404</p>
          <p className="mt-2 text-[18px]">העמוד לא נמצא · Page not found</p>
          <Link href="/" className="btn btn-primary mt-6">
            דירה מוכנה · Dira Ready
          </Link>
        </div>
      </body>
    </html>
  );
}
