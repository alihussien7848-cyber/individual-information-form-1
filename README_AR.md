# استمارة معلومات الأفراد — دليل التشغيل والإدارة

## البنية
- واجهة الموقع على Cloudflare Pages.
- قاعدة البيانات وتسجيل دخول الإدارة عبر Supabase.
- وظائف النسخ الاحتياطي وإضافة المستخدمين عبر Supabase Edge Functions.
- النسخ الاحتياطية تحفظ في Storage داخل bucket خاص غير عام.

## 1) إعداد المشروع لأول مرة
1. أنشئ مشروع Supabase.
2. شغّل `supabase_schema.sql` من SQL Editor لإنشاء جدول الاستمارات.
3. افتح Authentication > Users وأنشئ حساب المدير الرئيسي يدوياً.
4. افتح تفاصيل المستخدم وانسخ UUID الخاص به.
5. ضع رابط المشروع والمفتاح العام فقط في `config.js`. لا تضع service_role key في ملفات الموقع أو GitHub.
6. انشر ملفات الموقع على Cloudflare Pages.

## 2) ترقية قاعدة البيانات والصلاحيات
بعد رفع التحديث، شغّل الملف التالي مرة واحدة في Supabase SQL Editor:
`supabase/migrations/202611010001_admin_tools.sql`

ثم عيّن أول مدير رئيسي باستبدال UUID في الاستعلام التالي بمعرّف حساب المدير الذي أنشأته في Auth:
```sql
insert into public.admin_roles(user_id, role, is_active)
values ('AUTH-USER-UUID-HERE', 'super_admin', true)
on conflict (user_id) do update set role = 'super_admin', is_active = true;
```

**مهم:** بعد تطبيق الترقية، الحسابات المسجلة التي لم تضفها إلى `admin_roles` لن تتمكن من قراءة سجلات الاستمارات. هذا مقصود لحماية البيانات. أضف المدير الرئيسي أولاً حتى لا تفقد الوصول الإداري.

## 3) نشر وظيفة الإدارة والنسخ الاحتياطي
من مجلد المشروع الذي يحتوي مجلد `supabase`، ثبّت Supabase CLI وسجّل الدخول ثم اربط المشروع:
```bash
supabase login
supabase link --project-ref hoggakqqtapdhtmoolym
supabase functions deploy admin-tools
```

تأكد من ضبط أسرار الوظيفة من لوحة Supabase أو CLI. لا تضع هذه القيم في ملفات الموقع أو GitHub:
- `SUPABASE_URL`: رابط مشروع Supabase.
- `SUPABASE_ANON_KEY`: المفتاح العام للمشروع (publishable/anon).
- `SUPABASE_SERVICE_ROLE_KEY`: المفتاح السري للخادم فقط.
- `BACKUP_CRON_SECRET`: رمز عشوائي طويل وسري تستخدمه مهمة النسخ المجدولة.

مثال CLI (استبدل القيم محلياً ولا تشارك المفتاح السري):
```bash
supabase secrets set SUPABASE_URL="https://hoggakqqtapdhtmoolym.supabase.co" SUPABASE_ANON_KEY="YOUR_PUBLIC_KEY" SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" BACKUP_CRON_SECRET="YOUR_LONG_RANDOM_SECRET"
```

## 4) تشغيل النسخ الاحتياطي اليومي
1. من Supabase Dashboard > Database > Extensions فعّل `pg_cron` و`pg_net` و`supabase_vault` (قد يظهر Vault باسم `vault`).
2. افتح `supabase/daily_backup_cron.sql`.
3. استبدل `CRON_SECRET` بنفس القيمة التي ضبطتها في `BACKUP_CRON_SECRET`، ثم شغّل SQL في SQL Editor.
4. الجدولة الافتراضية الساعة 02:00 UTC (05:00 صباحاً بتوقيت العراق).

النسخ اليدوي متاح من لوحة الإدارة. النسخ تحفظ بيانات جدول `submissions` بصيغة JSON في bucket خاص، ويمكن استعادة الملف من زر "استعادة نسخة". الاستعادة تدمج السجلات بحسب رقمها ولا تحذف السجلات الإضافية الموجودة حالياً.

**حدود النسخة:** هذه النسخة الاحتياطية تشمل بيانات الاستمارات فقط؛ ولا تشمل حسابات Auth أو إعدادات المشروع أو مخطط قاعدة البيانات. استخدم أيضاً نسخ Supabase الاحتياطية الأصلية لحماية قاعدة البيانات كاملة.

## 5) إضافة مستخدمين للوحة الإدارة
- أنشئ المدير الرئيسي أولاً كما في الخطوة 2.
- انشر Edge Function واضبط أسرارها.
- من لوحة الإدارة أدخل البريد الإلكتروني للمستخدم الجديد واضغط "إرسال دعوة".
- ستصل دعوة إلى البريد، ويكمل المستخدم إنشاء كلمة مروره.
- الإضافة من الواجهة متاحة للمدير الرئيسي فقط. المستخدم الجديد يحصل على صلاحية admin، وليس super_admin.
- لا تفعّل التسجيل العام في Supabase Auth.

يجب إضافة رابط الموقع ضمن Authentication > URL Configuration > Redirect URLs حتى تعمل دعوات البريد وتعود إلى `/admin.html`.

## 6) روابط التواصل والطباعة
روابط Facebook وInstagram وTikTok وTwitter/X تحفظ في أعمدة مستقلة بجدول `submissions`، وتظهر في لوحة الإدارة والتعديل وExcel ونسخة الطباعة. الطباعة تستخدم نافذة المتصفح ويمكن اختيار "Save as PDF" من نافذة الطباعة، مع المحافظة على العربية واتجاه RTL.

## 7) الصفحات
- الاستمارة: `/`
- الإدارة: `/admin.html`

## 8) ملاحظات أمنية مهمة
- لا تضع `service_role` في `config.js` أو JavaScript بالمتصفح أو GitHub.
- لا تستخدم بيانات أشخاص حقيقية للاختبار.
- اجعل bucket النسخ الاحتياطية خاصاً، ولا تنشئ روابط عامة دائمة.
- راجع قائمة مستخدمي الإدارة دورياً وألغِ صلاحية من لم يعد يحتاجها.
- لا تعتبر رفع الملفات إلى GitHub دليلاً على اكتمال النشر؛ تحقق من نجاح Cloudflare Pages deployment ومن تشغيل SQL وEdge Function فعلياً.
