import Link from "next/link";
import { Card } from "@/components/ui/Card";

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
    >
      <p className="text-base font-bold">{title}</p>
      <p className="mt-1 text-sm text-white/70">{desc}</p>
    </Link>
  );
}

export default function SupervisorHomePage() {
  return (
    <Card className="p-5">
      <h2 className="text-2xl font-bold">لوحة المشرفة</h2>
      <p className="mt-1 text-sm text-white/70">إدارة المحتوى والنقاط والتقارير.</p>

      <div className="mt-5 grid gap-3">
        <Tile href="/app/supervisor/content" title="محرر الأيام" desc="تعديل الحديث والفقه ومهمة الأثر ومفتاح الإجابة." />
        <Tile href="/app/supervisor/overrides" title="تدقيق النقاط" desc="تعديل مجموع اليوم بسبب خطأ مع سبب وتسجيل كامل." />
        <Tile href="/app/supervisor/reports" title="التقارير والطباعة" desc="CSV وطباعة لوحة 7 مشاركات وتقارير فردية." />
        <Tile href="/app/supervisor/settings" title="إعدادات المجموعة" desc="تاريخ البداية والمنطقة الزمنية ووقت الإغلاق." />
      </div>
    </Card>
  );
}

