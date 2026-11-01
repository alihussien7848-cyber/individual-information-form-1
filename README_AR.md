# استمارة معلومات الأفراد — دليل التشغيل

## البنية
- واجهة ثابتة على Cloudflare Pages (خطة مجانية).
- قاعدة PostgreSQL وتسجيل دخول الإدارة عبر Supabase.
- لا تحتاج Node.js أو Vercel Functions.

## 1) إعداد Supabase
1. أنشئ مشروعاً على https://supabase.com
2. افتح SQL Editor وشغّل محتوى `supabase_schema.sql`.
3. من Authentication > Users أنشئ حساب الإدارة بنفسك. لا تفعّل التسجيل العام.
4. من Project Settings > API انسخ Project URL والمفتاح العام anon/publishable.

## 2) ربط الموقع
افتح `public/config.js` وضع رابط المشروع والمفتاح العام فقط. ممنوع وضع service_role key في ملفات الموقع أو GitHub.

## 3) النشر
ارفع محتويات المجلد إلى GitHub. في Cloudflare Pages اختر Connect to Git، ثم:
- Framework preset: None
- Build command: فارغ
- Build output directory: `public`
ثم Deploy.

## الصفحات
- الاستمارة: `/`
- الإدارة: `/admin.html`

## الخصوصية
لا تجمع بيانات حقيقية قبل اختبار الإرسال والقراءة والتعديل والحذف من حساب الإدارة. معلومات مثل رقم الناخب والعنوان والهاتف حساسة؛ استخدم حسابات إدارة موثوقة فقط، واحتفظ بنسخ احتياطية آمنة. هذه نسخة بداية وتحتاج اختباراً عملياً قبل الاستخدام الفعلي.
