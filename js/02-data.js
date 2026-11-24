/* ==========================================================
   js/02-data.js
   The information the site shows: days, study plan, ready-made learning sources
   ========================================================== */


/* ---------- 2. Data ---------- */

const PAGES = ['resources', 'schedule'];
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];   // Sunday to Thursday
const WEEKS = Array.from({ length: 20 }, (_, index) => index + 1);     // 1 to 20
const TYPE = { lecture: 'محاضرة', task: 'مهمة', project: 'مشروع' };
const MODE_LABEL = { inperson: 'حضوري', online: 'عن بعد' };            // how a lecture is attended

// Only Computer Science is open for now
const MAJORS = ['علوم الحاسب', 'الذكاء الاصطناعي', 'علم البيانات'];

// Computer Science study plan, level by level (index 0 = level 1)
const COURSE_PLAN = [
  [
    { code: 'QR1101', name: 'تجويد القرآن الكريم', hours: 2 },
    { code: 'IND1101', name: 'التفكير التصميمي', hours: 2 },
    { code: 'MTH1141', name: 'التفاضل والتكامل 1', hours: 3 },
    { code: 'ELIE1201', name: 'اللغة الإنجليزية (1)', hours: 4 },
    { code: 'CS1701', name: 'برمجة الحاسب بلغة جافا', hours: 3 },
    { code: 'CS1302', name: 'هياكل متقطعة 1', hours: 3 }
  ],
  [
    { code: 'QR2102', name: 'حفظ القرآن الكريم 1', hours: 2 },
    { code: 'CUR1101', name: 'مهارات جامعية', hours: 0 },
    { code: 'CS1704', name: 'البرمجة الشيئية بلغة جافا', hours: 3 },
    { code: 'MTH1602', name: 'الإحصاء والاحتمالات في الحاسبات', hours: 3 },
    { code: 'PHYS1113', name: 'الفيزياء العامة', hours: 3 },
    { code: 'ELIE1202', name: 'اللغة الإنجليزية (2)', hours: 4 },
    { code: 'CS1303', name: 'هياكل متقطعة 2', hours: 3 }
  ],
  [
    { code: 'QR2103', name: 'حفظ القرآن الكريم 2', hours: 2 },
    { code: 'AI2001', name: 'مقدمة في الذكاء الاصطناعي', hours: 2 },
    { code: 'SEC1101', name: 'مقدمة في الأمن السيبراني', hours: 3 },
    { code: 'CS2105', name: 'هياكل البيانات والخوارزميات (جافا)', hours: 3 },
    { code: 'MTH1441', name: 'الجبر الخطي', hours: 3 },
    { code: 'BIO3101', name: 'الأحياء العامة', hours: 3 },
    { code: 'CEN2011', name: 'التصميم الرقمي المنطقي', hours: 3 }
  ],
  [
    { code: 'QR3104', name: 'ختم القرآن الكريم', hours: 2 },
    { code: 'ICC1201', name: 'القيم والأخلاق', hours: 2 },
    { code: 'SE1201', name: 'أسس هندسة البرمجيات', hours: 3 },
    { code: 'DS2201', name: 'مقدمة في قواعد البيانات', hours: 3 },
    { code: 'CS2206', name: 'الرسومات بالحاسب', hours: 3 },
    { code: 'CS2107', name: 'تصميم وتحليل الخوارزميات', hours: 3 },
    { code: 'CEN2012', name: 'تنظيم وعمارة الحاسب الآلي', hours: 3 }
  ],
  [
    { code: 'CEN3011', name: 'شبكات الحاسب الآلي', hours: 3 },
    { code: 'CS3608', name: 'نظم التشغيل', hours: 4 },
    { code: 'CS3809', name: 'نظم بناء البرمجيات', hours: 3 },
    { code: 'CS3810', name: 'تطوير الويب', hours: 3 },
    { code: 'AI4101', name: 'مبادئ الذكاء الاصطناعي', hours: 3 },
    { code: 'CS3713', name: 'لغات البرمجة', hours: 2 }
  ],
  [
    { code: 'CS3901', name: 'التدريب التعاوني', hours: 6 }
  ],
  [
    { code: 'ICC4202', name: 'الأسرة في الإسلام', hours: 2 },
    { code: 'CS4901', name: 'مشروع التخرج 1', hours: 3 },
    { code: 'CS4411', name: 'قواعد البيانات المتقدمة', hours: 3 },
    { code: 'CS4612', name: 'الحوسبة المتوازية والموزعة', hours: 3 },
    { code: 'AI4202', name: 'مبادئ تعلم الآلة', hours: 3 },
    { code: 'CS4108', name: 'برمجة متقدمة', hours: 3 }
  ],
  [
    { code: 'BUS1099', name: 'مهارات التطوير المهني', hours: 2 },
    { code: 'CS4902', name: 'مشروع التخرج 2', hours: 3 },
    { code: 'CS4815', name: 'الحوسبة السحابية', hours: 2 },
    { code: 'CS4714', name: 'تركيب المترجمات', hours: 2 },
    { code: 'CS4216', name: 'الطرق العلمية', hours: 3 }
  ]
];

// Ready-made learning sources, by course code. To add one, copy an entry and change it.
// "id" must be different for every source and use only letters, numbers and dashes
// (it is how favourites are remembered).
const RESOURCES = {
  CS1302: [
    {
      id: 'cs1302-kingozil',
      language: 'عربي',
      title: 'قائمة تشغيل: هياكل متقطعة 1',
      channel: 'kingozil',
      url: 'https://www.youtube.com/playlist?list=PLZmvN-nKumcDtrIa5t25s4WZWAesqeGuL'
    },
    {
      id: 'cs1302-sawfin',
      language: 'English',
      title: 'Playlist: Discrete Mathematics',
      channel: 'SawFin Mathematics',
      url: 'https://www.youtube.com/playlist?list=PLl-gb0E4MII28GykmtuBXNUNoej-vY5Rz'
    }
  ]
};
