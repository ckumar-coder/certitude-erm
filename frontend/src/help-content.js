// help-content.js
// Context-sensitive help content keyed by page id.
// Each entry has a bilingual title ({ en, ar }) and an array of
// { q: { en, ar }, a: { en, ar } } FAQ items.
//
// Consumed via getHelp(pageId, lang) — lang defaults to 'en' and falls back
// to English if an Arabic string is ever missing.

export const HELP_CONTENT = {
    'my-tasks': {
        title: { en: 'My Tasks', ar: 'مهامي' },
        items: [
            {
                q: { en: 'What appears in My Tasks?', ar: 'ماذا يظهر في صفحة "مهامي"؟' },
                a: {
                    en: 'My Tasks aggregates everything that needs your attention: risks awaiting approval, policies due for attestation, KRI readings that have breached their threshold, and issues assigned to you. It is your daily action queue.',
                    ar: 'تجمع صفحة "مهامي" كل ما يحتاج إلى انتباهك: المخاطر التي تنتظر الموافقة، والسياسات المستحقة للإقرار، وقراءات مؤشرات المخاطر الرئيسية التي تجاوزت حدها، والقضايا المسندة إليك. إنها قائمة مهامك اليومية.',
                },
            },
            {
                q: { en: 'How do I action a task?', ar: 'كيف أنفّذ إجراءً على مهمة؟' },
                a: {
                    en: 'Click the task to open the relevant record directly. Completing the required action (approving, attesting, or updating) automatically removes it from your queue.',
                    ar: 'انقر على المهمة لفتح السجل المعني مباشرة. إتمام الإجراء المطلوب (الموافقة أو الإقرار أو التحديث) يزيلها تلقائياً من قائمتك.',
                },
            },
            {
                q: { en: 'Why do I see tasks from other modules here?', ar: 'لماذا أرى مهامّ من وحدات أخرى هنا؟' },
                a: {
                    en: 'My Tasks is a cross-module inbox. It pulls open items from the Risk Register, Policy Repository, KRI Register, and Issues Tracker so you never need to check each module separately.',
                    ar: '"مهامي" هي صندوق وارد يجمع من عدة وحدات. فهي تسحب العناصر المفتوحة من سجل المخاطر، ومستودع السياسات، وسجل مؤشرات المخاطر الرئيسية، ومتتبع القضايا، حتى لا تضطر لمراجعة كل وحدة على حدة.',
                },
            },
        ],
    },

    'management-summary': {
        title: { en: 'Management Summary', ar: 'الملخص الإداري' },
        items: [
            {
                q: { en: 'What does the Management Summary show?', ar: 'ماذا يعرض الملخص الإداري؟' },
                a: {
                    en: 'The Management Summary gives an executive view of your GRC posture: overall risk exposure, open issues by priority, KRI breach count, policy compliance rate, and pending approvals. It is designed for leadership reporting.',
                    ar: 'يقدّم الملخص الإداري نظرة تنفيذية على وضع الحوكمة والمخاطر والامتثال لديك: إجمالي التعرض للمخاطر، والقضايا المفتوحة حسب الأولوية، وعدد تجاوزات مؤشرات المخاطر الرئيسية، ومعدل الالتزام بالسياسات، والموافقات المعلّقة. وهو مصمم لتقارير الإدارة العليا.',
                },
            },
            {
                q: { en: 'How is the overall risk score calculated?', ar: 'كيف تُحسب درجة المخاطر الإجمالية؟' },
                a: {
                    en: 'The score is the average residual risk score across all open risks, weighted by their inherent impact. Each risk is scored on a 1–25 scale (Likelihood × Impact). Scores above 15 are Critical, 10–14 High, 5–9 Medium, and below 5 Low.',
                    ar: 'الدرجة هي متوسط درجة المخاطر المتبقية لجميع المخاطر المفتوحة، مرجّحة بأثرها الكامن. تُقيَّم كل مخاطرة على مقياس من 1 إلى 25 (الاحتمالية × الأثر). الدرجات فوق 15 تُصنَّف حرجة، ومن 10 إلى 14 مرتفعة، ومن 5 إلى 9 متوسطة، وأقل من 5 منخفضة.',
                },
            },
            {
                q: { en: 'How often does this page refresh?', ar: 'كم مرة يتم تحديث هذه الصفحة؟' },
                a: {
                    en: 'The data is live — it reflects the current state of all modules every time you open the page. There is no scheduled refresh cadence.',
                    ar: 'البيانات حيّة — فهي تعكس الحالة الراهنة لجميع الوحدات في كل مرة تفتح فيها الصفحة. لا يوجد جدول تحديث مجدول.',
                },
            },
        ],
    },

    'policies': {
        title: { en: 'Policy Repository', ar: 'مستودع السياسات' },
        items: [
            {
                q: { en: 'How do I publish a policy?', ar: 'كيف أنشر سياسة؟' },
                a: {
                    en: 'Create a policy with status "Draft", complete the required fields, then change the status to "Published". Only published policies are visible to Viewers for attestation.',
                    ar: 'أنشئ سياسة بحالة "مسودة"، وأكمل الحقول المطلوبة، ثم غيّر الحالة إلى "منشورة". السياسات المنشورة فقط هي التي تظهر للمشاهدين لغرض الإقرار.',
                },
            },
            {
                q: { en: 'What is attestation?', ar: 'ما هو الإقرار؟' },
                a: {
                    en: 'Attestation is a formal acknowledgement that a user has read and understood a policy. Published policies can be sent for attestation. Each acknowledgement is time-stamped and stored in the audit log.',
                    ar: 'الإقرار هو تأكيد رسمي بأن المستخدم قد اطّلع على السياسة وفهمها. يمكن إرسال السياسات المنشورة للإقرار. يُسجَّل كل إقرار بختم زمني ويُحفظ في سجل المراجعة.',
                },
            },
            {
                q: { en: 'What do the policy categories mean?', ar: 'ماذا تعني فئات السياسات؟' },
                a: {
                    en: 'Categories tag policies by domain: Governance (board and entity-level), IT (technology and security), HR (people), Compliance (regulatory), Operations (process), Finance, Risk, and BCM (business continuity). Use BCM for all BCP-related policies.',
                    ar: 'تُصنَّف السياسات حسب المجال: الحوكمة (على مستوى المجلس والكيان)، تقنية المعلومات (التقنية والأمن)، الموارد البشرية (الأفراد)، الامتثال (التنظيمي)، العمليات (الإجراءات)، المالية، المخاطر، واستمرارية الأعمال. استخدم فئة "استمرارية الأعمال" لجميع السياسات المتعلقة بخطط استمرارية الأعمال.',
                },
            },
            {
                q: { en: 'What happens when a policy reaches its review date?', ar: 'ماذا يحدث عندما تصل سياسة إلى تاريخ مراجعتها؟' },
                a: {
                    en: 'The system flags it as overdue and adds a task to the content owner\'s My Tasks queue. The policy remains published until explicitly updated or retired.',
                    ar: 'يضع النظام علامة عليها بأنها متأخرة ويضيف مهمة إلى قائمة "مهامي" الخاصة بمالك المحتوى. تبقى السياسة منشورة حتى يتم تحديثها أو سحبها صراحةً.',
                },
            },
        ],
    },

    'org-roles': {
        title: { en: 'Org Roles (RACI)', ar: 'الأدوار التنظيمية (RACI)' },
        items: [
            {
                q: { en: 'What is a RACI matrix?', ar: 'ما هي مصفوفة RACI؟' },
                a: {
                    en: 'RACI stands for Responsible, Accountable, Consulted, and Informed. It maps which roles own each GRC activity, who approves decisions, who needs to be consulted, and who should be kept informed of outcomes.',
                    ar: 'تشير RACI إلى: المسؤول التنفيذي (Responsible)، والمسؤول النهائي (Accountable)، والمُستشار (Consulted)، والمُطلَع (Informed). وهي تحدد الأدوار المسؤولة عن كل نشاط من أنشطة الحوكمة والمخاطر والامتثال، ومن يوافق على القرارات، ومن يجب استشارته، ومن يجب إبقاؤه على اطلاع بالنتائج.',
                },
            },
            {
                q: { en: 'How does the RACI connect to risks and controls?', ar: 'كيف ترتبط مصفوفة RACI بالمخاطر والضوابط؟' },
                a: {
                    en: 'When you assign an owner, consulted party, or informed contact on a risk or control, the RACI matrix reflects those assignments. This ensures accountability is documented and auditable.',
                    ar: 'عند تعيين مالك أو جهة استشارية أو جهة مُطلَعة على مخاطرة أو ضابط، تعكس مصفوفة RACI هذه التعيينات. وهذا يضمن توثيق المساءلة وقابليتها للتدقيق.',
                },
            },
        ],
    },

    'access-matrix': {
        title: { en: 'Access Matrix', ar: 'مصفوفة الصلاحيات' },
        items: [
            {
                q: { en: 'What does the Access Matrix show?', ar: 'ماذا تعرض مصفوفة الصلاحيات؟' },
                a: {
                    en: 'A static, read-only reference table showing exactly what each role can do across every module — Full access, Department-only, Own-records-only, or No access — so you can see the complete permission model at a glance.',
                    ar: 'جدول مرجعي ثابت للقراءة فقط يوضح بالضبط ما يمكن لكل دور القيام به عبر جميع الوحدات — وصول كامل، أو على مستوى القسم فقط، أو على السجلات الخاصة فقط، أو لا صلاحية — بحيث يمكنك رؤية نموذج الصلاحيات الكامل بلمحة واحدة.',
                },
            },
            {
                q: { en: 'How is this different from Org Roles (RACI)?', ar: 'ما الفرق بينها وبين الأدوار التنظيمية (RACI)؟' },
                a: {
                    en: 'Access Matrix shows what the system technically permits each role to do. Org Roles (RACI) is a configurable record of who is actually Responsible, Accountable, Consulted, or Informed for specific activities — a governance/accountability document, not a permissions engine.',
                    ar: 'مصفوفة الصلاحيات تُظهر ما يسمح به النظام تقنياً لكل دور. أما الأدوار التنظيمية (RACI) فهي سجل قابل للتخصيص يوضح من هو المسؤول التنفيذي فعلياً، أو المسؤول النهائي، أو المُستشار، أو المُطلَع بشأن أنشطة محددة — إنها وثيقة حوكمة ومساءلة، وليست محرك صلاحيات.',
                },
            },
            {
                q: { en: 'Can I change permissions from this page?', ar: 'هل يمكنني تغيير الصلاحيات من هذه الصفحة؟' },
                a: {
                    en: 'No — it\'s a reference view only, generated from the system\'s actual role guards. To change what a specific person can do, adjust their role in Users & Access.',
                    ar: 'لا — إنها عرض مرجعي فقط، يُولَّد من ضوابط الأدوار الفعلية في النظام. لتغيير ما يمكن لشخص معين القيام به، عدّل دوره من صفحة "المستخدمون والصلاحيات".',
                },
            },
            {
                q: { en: 'Who can view the Access Matrix?', ar: 'من يمكنه عرض مصفوفة الصلاحيات؟' },
                a: {
                    en: 'Admins, CROs, and Consultant CROs.',
                    ar: 'المسؤولون، ورؤساء إدارة المخاطر، ورؤساء إدارة المخاطر الاستشاريون.',
                },
            },
        ],
    },

    'risks': {
        title: { en: 'Risk Register', ar: 'سجل المخاطر' },
        items: [
            {
                q: { en: 'How do I create a new risk?', ar: 'كيف أنشئ مخاطرة جديدة؟' },
                a: {
                    en: 'Click "Add Risk" and complete the nine-step form. At minimum you need a department, risk category, and a risk description. Use the Statement Quality Check (Step 9) to validate your risk statement before saving.',
                    ar: 'انقر على "إضافة مخاطرة" وأكمل النموذج المكوّن من تسع خطوات. كحد أدنى، تحتاج إلى قسم، وفئة مخاطرة، ووصف للمخاطرة. استخدم فحص جودة العبارة (الخطوة 9) للتحقق من صياغة بيان المخاطرة قبل الحفظ.',
                },
            },
            {
                q: { en: 'What is the difference between inherent and residual risk?', ar: 'ما الفرق بين المخاطرة الكامنة والمخاطرة المتبقية؟' },
                a: {
                    en: 'Inherent risk is the raw exposure before any controls are applied. Residual risk is what remains after your controls are in place. The goal is to bring residual risk within your risk appetite.',
                    ar: 'المخاطرة الكامنة هي التعرض الخام قبل تطبيق أي ضوابط. أما المخاطرة المتبقية فهي ما يتبقى بعد تطبيق ضوابطك. الهدف هو إبقاء المخاطرة المتبقية ضمن حدود شهية المخاطر لديك.',
                },
            },
            {
                q: { en: 'What does the risk lifecycle look like?', ar: 'كيف تبدو دورة حياة المخاطرة؟' },
                a: {
                    en: 'Risks start as Draft, move to Active once approved, and can be Closed when the underlying exposure no longer exists. Every status change creates a new version — no history is ever deleted.',
                    ar: 'تبدأ المخاطر كمسودة، وتنتقل إلى نشطة بمجرد الموافقة عليها، ويمكن إغلاقها عندما لا يعود التعرض الأساسي قائماً. كل تغيير في الحالة يُنشئ إصداراً جديداً — لا يُحذف أي سجل تاريخي أبداً.',
                },
            },
            {
                q: { en: 'What is the BCP Status field?', ar: 'ما هو حقل "حالة خطة استمرارية الأعمال"؟' },
                a: {
                    en: 'BCP Status records whether a Business Continuity Plan exists for the scenario this risk describes. Options are Yes, No, or In Development. You can also link directly to the BCP document.',
                    ar: 'يسجّل هذا الحقل ما إذا كانت هناك خطة استمرارية أعمال قائمة للسيناريو الذي تصفه هذه المخاطرة. الخيارات هي: نعم، لا، أو قيد الإعداد. يمكنك أيضاً الربط مباشرة بوثيقة الخطة.',
                },
            },
            {
                q: { en: 'Who can approve risks?', ar: 'من يمكنه الموافقة على المخاطر؟' },
                a: {
                    en: 'Risks are approved by Admins or the CRO role. Risks with an "Accept" or "Avoid" treatment strategy are automatically routed to the CRO inbox for sign-off.',
                    ar: 'تتم الموافقة على المخاطر من قبل المسؤولين أو دور رئيس إدارة المخاطر. تُوجَّه المخاطر التي تحمل استراتيجية معالجة "قبول" أو "تجنّب" تلقائياً إلى صندوق وارد رئيس إدارة المخاطر للاعتماد.',
                },
            },
        ],
    },

    'critical-risks': {
        title: { en: 'Critical Risks Log', ar: 'سجل المخاطر الحرجة' },
        items: [
            {
                q: { en: 'What appears on the Critical Risks Log?', ar: 'ماذا يظهر في سجل المخاطر الحرجة؟' },
                a: {
                    en: 'Every risk flagged as Critical using the "Is this a critical risk?" toggle on the Risk Register form, regardless of department — shown together with its residual score, treatment strategy, BCP status, and current workflow status in one consolidated view.',
                    ar: 'كل مخاطرة تم وضع علامة عليها كـ"حرجة" باستخدام مفتاح "هل هذه مخاطرة حرجة؟" في نموذج سجل المخاطر، بغض النظر عن القسم — تُعرض هنا مجتمعة مع درجتها المتبقية، واستراتيجية المعالجة، وحالة خطة استمرارية الأعمال، وحالة سير العمل الحالية، في عرض موحّد واحد.',
                },
            },
            {
                q: { en: 'How does a risk get onto this log?', ar: 'كيف تصل مخاطرة إلى هذا السجل؟' },
                a: {
                    en: 'When creating or editing a risk in the Risk Register, mark "Is this a critical risk?" as Yes. It appears here immediately. Unmarking it removes it from the log without deleting the underlying risk.',
                    ar: 'عند إنشاء أو تعديل مخاطرة في سجل المخاطر، حدّد "هل هذه مخاطرة حرجة؟" بـ"نعم". تظهر هنا فوراً. وإلغاء التحديد يزيلها من هذا السجل دون حذف المخاطرة الأساسية.',
                },
            },
            {
                q: { en: 'What does the BCP Status column mean?', ar: 'ماذا يعني عمود "حالة خطة استمرارية الأعمال"؟' },
                a: {
                    en: 'It mirrors the BCP Status field on the risk itself (Yes / No / In Development) — a quick read on whether business continuity planning exists for that critical exposure. Update it from the Risk Register.',
                    ar: 'يعكس هذا العمود حقل حالة خطة استمرارية الأعمال في المخاطرة نفسها (نعم / لا / قيد الإعداد) — وهو مؤشر سريع على ما إذا كان هناك تخطيط لاستمرارية الأعمال لهذا التعرض الحرج. حدّثه من سجل المخاطر.',
                },
            },
            {
                q: { en: 'Can I edit a risk from here?', ar: 'هل يمكنني تعديل مخاطرة من هنا؟' },
                a: {
                    en: 'This log is read-only by design. Open the risk in the Risk Register to make changes — this page always reflects the latest data.',
                    ar: 'هذا السجل مخصص للقراءة فقط بحكم التصميم. افتح المخاطرة في سجل المخاطر لإجراء أي تغييرات — تعكس هذه الصفحة دائماً أحدث البيانات.',
                },
            },
        ],
    },

    'risk-appetite': {
        title: { en: 'Risk Appetite', ar: 'شهية المخاطر' },
        items: [
            {
                q: { en: 'What is a Risk Appetite statement?', ar: 'ما هو بيان شهية المخاطر؟' },
                a: {
                    en: 'A board-approved boundary for a specific risk category, expressed as a tolerance level (Zero Tolerance, Low, Moderate, or High) plus a named approver (Board of Directors, CEO, CFO, CRO, or Other). It defines how much of that type of risk the organisation is willing to accept.',
                    ar: 'حد يعتمده مجلس الإدارة لفئة مخاطرة محددة، يُعبَّر عنه كمستوى تحمّل (عدم تحمّل مطلقاً، منخفض، معتدل، أو مرتفع) إلى جانب معتمِد مُسمّى (مجلس الإدارة، الرئيس التنفيذي، المدير المالي، رئيس إدارة المخاطر، أو جهة أخرى). يحدد مقدار هذا النوع من المخاطر الذي ترغب المؤسسة في قبوله.',
                },
            },
            {
                q: { en: 'What counts as an "appetite breach"?', ar: 'ما الذي يُعتبر "تجاوزاً للشهية"؟' },
                a: {
                    en: 'When a risk\'s residual score falls into a band that exceeds the tolerance set for its category\'s appetite statement, it\'s flagged as a breach. The summary strip at the top of the page shows the current breach count across all categories.',
                    ar: 'عندما تقع درجة المخاطرة المتبقية ضمن نطاق يتجاوز مستوى التحمّل المحدد لبيان شهية فئتها، يتم وضع علامة عليها كتجاوز. يعرض شريط الملخص أعلى الصفحة عدد التجاوزات الحالية عبر جميع الفئات.',
                },
            },
            {
                q: { en: 'What is the Heatmap Overlay tab?', ar: 'ما هو تبويب "تراكب الخريطة الحرارية"؟' },
                a: {
                    en: 'It plots your current risk portfolio against appetite boundaries visually, making it easy to see at a glance which categories are operating within tolerance and which have exposures that exceed it.',
                    ar: 'يعرض هذا التبويب محفظة مخاطرك الحالية مقابل حدود الشهية بصرياً، مما يسهّل معرفة الفئات العاملة ضمن حدود التحمّل والفئات التي لديها تعرضات تتجاوزها، بلمحة واحدة.',
                },
            },
            {
                q: { en: 'Who can create or edit appetite statements?', ar: 'من يمكنه إنشاء أو تعديل بيانات الشهية؟' },
                a: {
                    en: 'Admins and CROs. Once approved, a breach action statement — a pre-filled escalation template based on severity — is automatically suggested for Critical and High-severity breaches.',
                    ar: 'المسؤولون ورؤساء إدارة المخاطر. وبمجرد الاعتماد، يُقترح تلقائياً بيان إجراء تجاوز — قالب تصعيد مُعد مسبقاً حسب الشدة — للتجاوزات ذات الشدة الحرجة والمرتفعة.',
                },
            },
            {
                q: { en: 'How does this connect to KRIs?', ar: 'كيف يرتبط هذا بمؤشرات المخاطر الرئيسية؟' },
                a: {
                    en: 'KRIs can be linked to a specific appetite statement, so a KRI breach is automatically read in the context of the boundary the organisation has already agreed to.',
                    ar: 'يمكن ربط مؤشرات المخاطر الرئيسية ببيان شهية محدد، بحيث تتم قراءة أي تجاوز لمؤشر تلقائياً في سياق الحد الذي وافقت عليه المؤسسة بالفعل.',
                },
            },
        ],
    },

    'controls': {
        title: { en: 'Control Library', ar: 'مكتبة الضوابط' },
        items: [
            {
                q: { en: 'What is the Control Library?', ar: 'ما هي مكتبة الضوابط؟' },
                a: {
                    en: 'The Control Library is a catalogue of all controls your organization has in place. Controls are linked to risks to demonstrate how exposure is being managed, and to KRIs to show how effectiveness is measured.',
                    ar: 'مكتبة الضوابط هي فهرس لجميع الضوابط المطبقة في مؤسستك. تُربط الضوابط بالمخاطر لإظهار كيفية إدارة التعرض، وبمؤشرات المخاطر الرئيسية لإظهار كيفية قياس الفعالية.',
                },
            },
            {
                q: { en: 'What does "Assigned to My Team" mean?', ar: 'ماذا تعني "مُسندة إلى فريقي"؟' },
                a: {
                    en: 'Another department has created this control and assigned ownership to your team. Your team can edit it and is responsible for its testing and maintenance — but the creating department retains read access.',
                    ar: 'قسم آخر أنشأ هذا الضابط وأسند ملكيته إلى فريقك. يمكن لفريقك تعديله وهو مسؤول عن اختباره وصيانته — لكن القسم المُنشئ يحتفظ بصلاحية القراءة.',
                },
            },
            {
                q: { en: 'What control types are available?', ar: 'ما أنواع الضوابط المتاحة؟' },
                a: {
                    en: 'Controls are classified as Preventive (stops an event), Detective (identifies when something goes wrong), or Corrective (fixes the impact after the fact). Most frameworks expect a mix of all three.',
                    ar: 'تُصنَّف الضوابط إلى: وقائية (تمنع وقوع حدث)، أو كاشفة (تحدد متى يحدث خطأ ما)، أو تصحيحية (تعالج الأثر بعد وقوعه). تتوقع معظم الأطر مزيجاً من الأنواع الثلاثة.',
                },
            },
            {
                q: { en: 'How do I record a control test result?', ar: 'كيف أسجّل نتيجة اختبار ضابط؟' },
                a: {
                    en: 'Open the control, go to the Testing section, and record the outcome and date. Results feed into the Management Summary\'s control effectiveness score.',
                    ar: 'افتح الضابط، وانتقل إلى قسم "الاختبار"، وسجّل النتيجة والتاريخ. تُغذّي النتائج درجة فعالية الضوابط في الملخص الإداري.',
                },
            },
        ],
    },

    'kris': {
        title: { en: 'KRI Library', ar: 'مكتبة مؤشرات المخاطر الرئيسية' },
        items: [
            {
                q: { en: 'What is a KRI?', ar: 'ما هو مؤشر المخاطر الرئيسي؟' },
                a: {
                    en: 'A Key Risk Indicator is a metric that signals when a risk exposure is changing. KRIs are leading indicators — they warn you before a risk event materialises, giving you time to act.',
                    ar: 'مؤشر المخاطر الرئيسي هو مقياس يشير إلى تغيّر تعرض للمخاطر. مؤشرات المخاطر الرئيسية هي مؤشرات استباقية — فهي تنذر قبل وقوع حدث المخاطرة، مما يمنحك الوقت للتصرف.',
                },
            },
            {
                q: { en: 'How do I set a threshold?', ar: 'كيف أحدد حداً؟' },
                a: {
                    en: 'Each KRI has an Amber threshold (early warning) and a Red threshold (breach). When a reading crosses Amber the KRI is flagged for review. When it crosses Red it escalates to the CRO inbox.',
                    ar: 'لكل مؤشر حد كهرماني (إنذار مبكر) وحد أحمر (تجاوز). عند تجاوز القراءة للحد الكهرماني، يُوضع المؤشر قيد المراجعة. وعند تجاوزها للحد الأحمر، يُصعَّد إلى صندوق وارد رئيس إدارة المخاطر.',
                },
            },
            {
                q: { en: 'What is the data source field?', ar: 'ما هو حقل مصدر البيانات؟' },
                a: {
                    en: 'The data source records where the KRI reading comes from — for example, a financial system, HR platform, or manual report. This supports auditability and makes it clear who is responsible for supplying the data.',
                    ar: 'يسجّل مصدر البيانات من أين تأتي قراءة المؤشر — على سبيل المثال، نظام مالي، أو منصة موارد بشرية، أو تقرير يدوي. يدعم هذا إمكانية التدقيق ويوضح من هو المسؤول عن توفير البيانات.',
                },
            },
        ],
    },

    'kri-register': {
        title: { en: 'KRI Register', ar: 'سجل مؤشرات المخاطر الرئيسية' },
        items: [
            {
                q: { en: 'What is the difference between the KRI Library and the KRI Register?', ar: 'ما الفرق بين مكتبة مؤشرات المخاطر وسجل مؤشرات المخاطر؟' },
                a: {
                    en: 'The Library defines your KRIs (what you measure and thresholds). The Register is where you log actual readings over time. Think of the Library as the template and the Register as the data.',
                    ar: 'تحدد المكتبة مؤشرات المخاطر لديك (ما تقيسه وحدودها). أما السجل فهو حيث تسجّل القراءات الفعلية بمرور الوقت. فكّر في المكتبة كقالب، وفي السجل كبيانات.',
                },
            },
            {
                q: { en: 'How often should I log readings?', ar: 'كم مرة يجب أن أسجّل القراءات؟' },
                a: {
                    en: 'Follow the frequency set on each KRI in the Library (monthly, quarterly, etc.). My Tasks will flag overdue readings so nothing is missed.',
                    ar: 'اتبع التكرار المحدد لكل مؤشر في المكتبة (شهرياً، ربع سنوي، إلخ). ستنبّهك صفحة "مهامي" بالقراءات المتأخرة حتى لا يفوتك شيء.',
                },
            },
        ],
    },

    'horizon-scanning': {
        title: { en: 'Horizon Scanning', ar: 'مسح الأفق الاستراتيجي' },
        items: [
            {
                q: { en: 'What is Horizon Scanning?', ar: 'ما هو مسح الأفق الاستراتيجي؟' },
                a: {
                    en: 'A structured way to track external, emerging risks — regulatory, geopolitical, technology, economic, environmental, or social — before they become active risks in the Risk Register. Each signal is rated by likelihood, impact, and time horizon (near, medium, or long-term).',
                    ar: 'طريقة منظمة لتتبع المخاطر الناشئة الخارجية — التنظيمية، أو الجيوسياسية، أو التقنية، أو الاقتصادية، أو البيئية، أو الاجتماعية — قبل أن تصبح مخاطر فعلية في سجل المخاطر. تُقيَّم كل إشارة حسب الاحتمالية، والأثر، والأفق الزمني (قريب، متوسط، أو طويل المدى).',
                },
            },
            {
                q: { en: 'What do the statuses mean?', ar: 'ماذا تعني الحالات؟' },
                a: {
                    en: 'Draft (not yet reviewed), Monitoring (accepted as worth tracking), Escalated (raised for near-term attention), Converted (turned into a formal risk), and Dismissed (assessed and ruled out).',
                    ar: 'مسودة (لم تُراجع بعد)، قيد المراقبة (مقبولة كجديرة بالمتابعة)، مُصعَّدة (رُفعت للاهتمام قريب المدى)، مُحوَّلة (تحولت إلى مخاطرة رسمية)، ومرفوضة (تم تقييمها واستبعادها).',
                },
            },
            {
                q: { en: 'How do I turn a signal into a formal risk?', ar: 'كيف أحوّل إشارة إلى مخاطرة رسمية؟' },
                a: {
                    en: 'Once a signal is in Monitoring or Escalated status, Admins, CROs, Consultant CROs, and Risk Managers can click "Convert to risk," which creates a linked entry in the Risk Register and records the connection both ways.',
                    ar: 'بمجرد أن تكون الإشارة في حالة "قيد المراقبة" أو "مُصعَّدة"، يمكن للمسؤولين، ورؤساء إدارة المخاطر، ورؤساء إدارة المخاطر الاستشاريين، ومديري المخاطر النقر على "تحويل إلى مخاطرة"، مما ينشئ سجلاً مرتبطاً في سجل المخاطر ويسجّل الارتباط في الاتجاهين.',
                },
            },
            {
                q: { en: 'What does the AI scan button do?', ar: 'ماذا يفعل زر "المسح بالذكاء الاصطناعي"؟' },
                a: {
                    en: 'If an AI API key is configured (see AI Integration), it drafts candidate signals from external regulatory and news sources for review. Drafts are never published automatically — a qualified role must review and publish each one.',
                    ar: 'إذا تم تكوين مفتاح واجهة برمجة تطبيقات للذكاء الاصطناعي (راجع "تكامل الذكاء الاصطناعي")، فإنه يصيغ إشارات مرشحة من مصادر تنظيمية وإخبارية خارجية للمراجعة. لا تُنشر المسودات تلقائياً أبداً — يجب أن يراجعها وينشرها دور مؤهل.',
                },
            },
        ],
    },

    'incident-log': {
        title: { en: 'Incident Log', ar: 'سجل الحوادث' },
        items: [
            {
                q: { en: 'What is the Incident Log for?', ar: 'ما الغرض من سجل الحوادث؟' },
                a: {
                    en: 'It captures operational incidents as they happen — the event, severity, affected department, root cause, and action taken — separately from the formal Risk Register, so nothing gets lost while it\'s still being investigated.',
                    ar: 'يوثّق الحوادث التشغيلية أثناء وقوعها — الحدث، والشدة، والقسم المتأثر، والسبب الجذري، والإجراء المتخذ — بمعزل عن سجل المخاطر الرسمي، بحيث لا يضيع شيء أثناء التحقيق فيه.',
                },
            },
            {
                q: { en: 'What are the three ways to handle a logged incident?', ar: 'ما هي الطرق الثلاث لمعالجة حادثة مسجّلة؟' },
                a: {
                    en: 'Link it to an existing risk if one already covers this exposure, create a new risk from it if this is a new type of exposure, or dismiss it with a written note (minimum 10 characters) if, on review, it doesn\'t warrant a risk entry.',
                    ar: 'ربطها بمخاطرة قائمة إذا كانت تغطي هذا التعرض بالفعل، أو إنشاء مخاطرة جديدة منها إذا كان هذا نوعاً جديداً من التعرض، أو رفضها بملاحظة مكتوبة (10 أحرف على الأقل) إذا تبيّن عند المراجعة أنها لا تستدعي إدراجها كمخاطرة.',
                },
            },
            {
                q: { en: 'What happens after I dismiss an incident?', ar: 'ماذا يحدث بعد رفض حادثة؟' },
                a: {
                    en: 'The dismissal note is saved permanently against the incident record for audit purposes, and its register decision changes to "Dismissed." This can\'t be reversed from the page — contact an Admin if a dismissal needs to be corrected.',
                    ar: 'تُحفظ ملاحظة الرفض بشكل دائم في سجل الحادثة لأغراض التدقيق، ويتغير قرار التسجيل إلى "مرفوضة". لا يمكن التراجع عن هذا من الصفحة — تواصل مع أحد المسؤولين إذا احتاج الرفض إلى تصحيح.',
                },
            },
            {
                q: { en: 'Who can log and action incidents?', ar: 'من يمكنه تسجيل الحوادث واتخاذ إجراء بشأنها؟' },
                a: {
                    en: 'Risk Managers, Risk Champions, Risk Owners, CROs, and Consultant CROs.',
                    ar: 'مديرو المخاطر، وأبطال المخاطر، وملاك المخاطر، ورؤساء إدارة المخاطر، ورؤساء إدارة المخاطر الاستشاريون.',
                },
            },
        ],
    },

    'issues': {
        title: { en: 'Issues & Actions', ar: 'القضايا والإجراءات' },
        items: [
            {
                q: { en: 'What qualifies as an issue?', ar: 'ما الذي يُعتبر قضية؟' },
                a: {
                    en: 'An issue is any identified gap, weakness, or failure in your controls or processes. Sources include control test failures, audit findings, regulatory notices, and customer complaints.',
                    ar: 'القضية هي أي ثغرة أو ضعف أو إخفاق محدد في ضوابطك أو عملياتك. تشمل المصادر إخفاقات اختبار الضوابط، ونتائج التدقيق، والإشعارات التنظيمية، وشكاوى العملاء.',
                },
            },
            {
                q: { en: 'What happens when an issue is "Risk Accepted"?', ar: 'ماذا يحدث عندما تكون القضية "مخاطرة مقبولة"؟' },
                a: {
                    en: 'Risk Accepted means the organization has formally decided to tolerate the issue without full remediation. This requires a disposition rationale, an approver name, and a review date — all of which are recorded for audit purposes.',
                    ar: '"مخاطرة مقبولة" تعني أن المؤسسة قررت رسمياً تحمّل القضية دون معالجة كاملة. يتطلب هذا مبرر قرار، واسم معتمِد، وتاريخ مراجعة — وكلها تُسجَّل لأغراض التدقيق.',
                },
            },
            {
                q: { en: 'How do priorities work?', ar: 'كيف تعمل الأولويات؟' },
                a: {
                    en: 'Issues are rated Low, Medium, High, or Critical. High and Critical issues appear prominently in the Management Summary and trigger escalation notifications based on your escalation rules.',
                    ar: 'تُصنَّف القضايا كمنخفضة، أو متوسطة، أو مرتفعة، أو حرجة. تظهر القضايا المرتفعة والحرجة بشكل بارز في الملخص الإداري وتُطلق إشعارات تصعيد بناءً على قواعد التصعيد لديك.',
                },
            },
        ],
    },

    'scoring-methodology': {
        title: { en: 'Scoring Methodology', ar: 'منهجية التقييم' },
        items: [
            {
                q: { en: 'How is risk scored?', ar: 'كيف يتم تقييم المخاطرة؟' },
                a: {
                    en: 'Risk score = Likelihood × Impact, both rated 1–5. The result is a 1–25 score mapped to: Low (1–4), Medium (5–9), High (10–14), Extreme (15–25). You can view the full matrix on this page.',
                    ar: 'درجة المخاطرة = الاحتمالية × الأثر، وكلاهما يُقيَّم من 1 إلى 5. والنتيجة درجة من 1 إلى 25 تُطابق: منخفضة (1–4)، متوسطة (5–9)، مرتفعة (10–14)، شديدة (15–25). يمكنك عرض المصفوفة الكاملة في هذه الصفحة.',
                },
            },
            {
                q: { en: 'Can I customise the scoring matrix?', ar: 'هل يمكنني تخصيص مصفوفة التقييم؟' },
                a: {
                    en: 'Yes. Admins can adjust the label thresholds and colour coding to match your organization\'s risk appetite framework. Changes apply immediately to all risk scores.',
                    ar: 'نعم. يمكن للمسؤولين تعديل حدود التصنيفات والترميز اللوني لتتوافق مع إطار شهية المخاطر في مؤسستك. تُطبَّق التغييرات فوراً على جميع درجات المخاطر.',
                },
            },
        ],
    },

    'risk-gov-docs': {
        title: { en: 'Risk Gov. Documents', ar: 'وثائق حوكمة المخاطر' },
        items: [
            {
                q: { en: 'What is the Risk Governance Documents library for?', ar: 'ما الغرض من مكتبة وثائق حوكمة المخاطر؟' },
                a: {
                    en: 'A central place to store your risk framework\'s governing documents — policies, charters, methodology papers, board-approved frameworks — organised by category, separate from day-to-day evidence attachments on individual risks.',
                    ar: 'مكان مركزي لتخزين الوثائق الحاكمة لإطار المخاطر لديك — السياسات، والمواثيق، وأوراق المنهجية، والأطر المعتمدة من مجلس الإدارة — منظمة حسب الفئة، ومنفصلة عن مرفقات الأدلة اليومية على المخاطر الفردية.',
                },
            },
            {
                q: { en: 'What file types and sizes are supported?', ar: 'ما أنواع الملفات والأحجام المدعومة؟' },
                a: {
                    en: 'Any common document type (PDF, Word, Excel, etc.) up to 10MB per file. There\'s also a 500MB total storage quota per organisation, shared with evidence attachments — check Storage & Health if you\'re getting close to the limit.',
                    ar: 'أي نوع وثيقة شائع (PDF، وورد، إكسل، إلخ) بحد أقصى 10 ميجابايت لكل ملف. توجد أيضاً حصة تخزين إجمالية قدرها 500 ميجابايت لكل مؤسسة، مشتركة مع مرفقات الأدلة — راجع صفحة "التخزين والصحة" إذا كنت تقترب من الحد.',
                },
            },
            {
                q: { en: 'Can I keep multiple versions of a document?', ar: 'هل يمكنني الاحتفاظ بعدة إصدارات من وثيقة؟' },
                a: {
                    en: 'Yes. Uploading a new version to an existing document keeps the prior version accessible rather than overwriting it, so you always have a record of what changed and when.',
                    ar: 'نعم. رفع إصدار جديد لوثيقة قائمة يبقي الإصدار السابق متاحاً بدلاً من استبداله، بحيث يكون لديك دائماً سجل بما تغيّر ومتى.',
                },
            },
            {
                q: { en: 'Who can upload or delete documents?', ar: 'من يمكنه رفع أو حذف الوثائق؟' },
                a: {
                    en: 'Admins, Super Admins, CROs, Consultant CROs, and Risk Managers.',
                    ar: 'المسؤولون، والمسؤولون العامون، ورؤساء إدارة المخاطر، ورؤساء إدارة المخاطر الاستشاريون، ومديرو المخاطر.',
                },
            },
        ],
    },

    'forms-templates': {
        title: { en: 'Forms & Templates', ar: 'النماذج والقوالب' },
        items: [
            {
                q: { en: 'What can I generate here?', ar: 'ماذا يمكنني توليده هنا؟' },
                a: {
                    en: 'Two branded, letterhead-formatted reports: the Accepted Risk Report (all risks with an "Accept" treatment strategy over a chosen date range, with your commentary) and the Risk Management Pack (a broader executive pack covering the risk heatmap, top risks, KRIs, issues, and compliance status).',
                    ar: 'تقريران مُعدّان بترويسة رسمية تحمل هوية مؤسستك: تقرير المخاطر المقبولة (جميع المخاطر ذات استراتيجية معالجة "قبول" ضمن نطاق تاريخي مُختار، مع تعليقاتك)، وحزمة إدارة المخاطر (حزمة تنفيذية أوسع تغطي الخريطة الحرارية للمخاطر، وأبرز المخاطر، ومؤشرات المخاطر الرئيسية، والقضايا، وحالة الامتثال).',
                },
            },
            {
                q: { en: 'How do I generate the Accepted Risk Report?', ar: 'كيف أُوَلِّد تقرير المخاطر المقبولة؟' },
                a: {
                    en: 'Choose a date range, review the risks that fall within it, optionally add commentary per risk, then generate — it opens as a print-ready page in a new tab using your organisation\'s logo and colours.',
                    ar: 'اختر نطاقاً تاريخياً، وراجع المخاطر الواقعة ضمنه، وأضف تعليقاً اختيارياً لكل مخاطرة، ثم وَلِّد التقرير — يُفتح كصفحة جاهزة للطباعة في تبويب جديد باستخدام شعار مؤسستك وألوانها.',
                },
            },
            {
                q: { en: 'Can I customise which sections appear in the Management Pack?', ar: 'هل يمكنني تخصيص الأقسام التي تظهر في حزمة الإدارة؟' },
                a: {
                    en: 'The pack\'s sections are fixed (heatmap, top risks, KRIs, issues, compliance), but the underlying data always reflects the current state of each module at the time you generate it.',
                    ar: 'أقسام الحزمة ثابتة (الخريطة الحرارية، وأبرز المخاطر، ومؤشرات المخاطر الرئيسية، والقضايا، والامتثال)، لكن البيانات الأساسية تعكس دائماً الحالة الراهنة لكل وحدة وقت التوليد.',
                },
            },
            {
                q: { en: 'Is this the same as CSV export?', ar: 'هل هذا مماثل لتصدير CSV؟' },
                a: {
                    en: 'No — these are polished, presentation-ready reports for board or client packs. For raw data exports, use Import / Export instead.',
                    ar: 'لا — هذه تقارير مصقولة وجاهزة للعرض، مخصصة لحزم مجلس الإدارة أو العملاء. لتصدير البيانات الخام، استخدم أداة "استيراد / تصدير" بدلاً من ذلك.',
                },
            },
        ],
    },

    'obligations': {
        title: { en: 'Compliance Obligations', ar: 'التزامات الامتثال' },
        items: [
            {
                q: { en: 'What is a compliance obligation?', ar: 'ما هو التزام الامتثال؟' },
                a: {
                    en: 'A compliance obligation is a legal, regulatory, or contractual requirement your organization must meet. Examples include data protection laws, industry regulations, and contractual SLAs.',
                    ar: 'التزام الامتثال هو متطلب قانوني، أو تنظيمي، أو تعاقدي يجب على مؤسستك الوفاء به. تشمل الأمثلة قوانين حماية البيانات، واللوائح القطاعية، واتفاقيات مستوى الخدمة التعاقدية.',
                },
            },
            {
                q: { en: 'How do obligations link to policies and controls?', ar: 'كيف ترتبط الالتزامات بالسياسات والضوابط؟' },
                a: {
                    en: 'Each obligation can be mapped to the policies and controls that satisfy it. This mapping makes it easy to demonstrate compliance during audits — you can show the regulator exactly what you have in place.',
                    ar: 'يمكن ربط كل التزام بالسياسات والضوابط التي تفي به. يسهّل هذا الربط إثبات الامتثال أثناء عمليات التدقيق — إذ يمكنك أن تُظهر للجهة الرقابية بالضبط ما هو مطبق لديك.',
                },
            },
        ],
    },

    'calendar': {
        title: { en: 'Compliance Calendar', ar: 'تقويم الامتثال' },
        items: [
            {
                q: { en: 'What appears on the Compliance Calendar?', ar: 'ماذا يظهر في تقويم الامتثال؟' },
                a: {
                    en: 'The calendar shows all upcoming compliance deadlines: policy review dates, KRI reading due dates, obligation renewal dates, and issue remediation target dates.',
                    ar: 'يعرض التقويم جميع المواعيد النهائية القادمة للامتثال: تواريخ مراجعة السياسات، وتواريخ استحقاق قراءات مؤشرات المخاطر الرئيسية، وتواريخ تجديد الالتزامات، وتواريخ استهداف معالجة القضايا.',
                },
            },
            {
                q: { en: 'Can I export the calendar?', ar: 'هل يمكنني تصدير التقويم؟' },
                a: {
                    en: 'Use the Import / Export tool to export calendar items as a CSV. For direct calendar integration, contact your administrator.',
                    ar: 'استخدم أداة "استيراد / تصدير" لتصدير عناصر التقويم كملف CSV. للتكامل المباشر مع تقويم خارجي، تواصل مع مسؤول النظام لديك.',
                },
            },
        ],
    },

    'glossary': {
        title: { en: 'Glossary', ar: 'مسرد المصطلحات' },
        items: [
            {
                q: { en: 'What is the Glossary for?', ar: 'ما الغرض من مسرد المصطلحات؟' },
                a: {
                    en: 'The Glossary provides organization-specific definitions for GRC terms. Admins can add, edit, and remove entries. All users can search and browse. It ensures consistent terminology across your GRC program.',
                    ar: 'يوفر المسرد تعريفات خاصة بمؤسستك لمصطلحات الحوكمة والمخاطر والامتثال. يمكن للمسؤولين إضافة الإدخالات وتعديلها وحذفها. يمكن لجميع المستخدمين البحث والتصفح. وهو يضمن اتساق المصطلحات عبر برنامج الحوكمة والمخاطر والامتثال لديك.',
                },
            },
        ],
    },

    'data-tools': {
        title: { en: 'Import / Export', ar: 'استيراد / تصدير' },
        items: [
            {
                q: { en: 'What can I import?', ar: 'ماذا يمكنني استيراده؟' },
                a: {
                    en: 'You can import risks, controls, KRIs, policies, and issues from CSV files. This is useful when migrating from a spreadsheet-based GRC program. Download the template first to ensure the correct column format.',
                    ar: 'يمكنك استيراد المخاطر، والضوابط، ومؤشرات المخاطر الرئيسية، والسياسات، والقضايا من ملفات CSV. هذا مفيد عند الانتقال من برنامج حوكمة ومخاطر وامتثال قائم على جداول البيانات. نزّل القالب أولاً للتأكد من صيغة الأعمدة الصحيحة.',
                },
            },
            {
                q: { en: 'What can I export?', ar: 'ماذا يمكنني تصديره؟' },
                a: {
                    en: 'All modules support CSV export. Exports include all fields visible in the module table. Use exports for offline analysis, board reporting, or audit evidence packages.',
                    ar: 'تدعم جميع الوحدات التصدير بصيغة CSV. تشمل عمليات التصدير جميع الحقول الظاهرة في جدول الوحدة. استخدم عمليات التصدير للتحليل غير المتصل، أو تقارير مجلس الإدارة، أو حزم أدلة التدقيق.',
                },
            },
        ],
    },

    'users': {
        title: { en: 'Users & Access', ar: 'المستخدمون والصلاحيات' },
        items: [
            {
                q: { en: 'What roles are available?', ar: 'ما هي الأدوار المتاحة؟' },
                a: {
                    en: 'Super Admin (unrestricted access across the platform, used for demos and setup), Admin (full company access including user management), Risk Manager (creates and edits risks, controls, KRIs, issues, and policies within their assigned department(s)), Risk Owner and Risk Champion (department-scoped operational roles for raising and maintaining risk items), CRO (read access across all modules plus risk acceptance and approval authority), Consultant CRO (the same access as CRO, granted temporarily to an external consultant), and Viewer (read-only access to published policies and attestation).',
                    ar: 'المسؤول العام (وصول غير مقيد عبر المنصة، يُستخدم للعروض التوضيحية والإعداد)، والمسؤول (وصول كامل على مستوى الشركة بما يشمل إدارة المستخدمين)، ومدير المخاطر (ينشئ ويعدّل المخاطر والضوابط ومؤشرات المخاطر الرئيسية والقضايا والسياسات ضمن الأقسام المُسندة إليه)، ومالك المخاطر وبطل المخاطر (أدوار تشغيلية على مستوى القسم لرفع عناصر المخاطر وصيانتها)، ورئيس إدارة المخاطر (وصول للقراءة عبر جميع الوحدات إضافة إلى صلاحية قبول المخاطر واعتمادها)، ورئيس إدارة المخاطر الاستشاري (نفس صلاحيات رئيس إدارة المخاطر، تُمنح مؤقتاً لاستشاري خارجي)، والمشاهد (وصول للقراءة فقط للسياسات المنشورة والإقرار).',
                },
            },
            {
                q: { en: 'What happens when I create a new user?', ar: 'ماذا يحدث عند إنشاء مستخدم جديد؟' },
                a: {
                    en: 'A temporary password is generated and emailed to the user. They are required to change it on first login. MFA enrollment is prompted immediately after.',
                    ar: 'تُولَّد كلمة مرور مؤقتة وتُرسل بالبريد الإلكتروني إلى المستخدم. يُطلب منه تغييرها عند أول تسجيل دخول. يُطلب التسجيل في المصادقة متعددة العوامل مباشرة بعد ذلك.',
                },
            },
            {
                q: { en: 'Can a user belong to more than one department?', ar: 'هل يمكن أن ينتمي مستخدم إلى أكثر من قسم؟' },
                a: {
                    en: 'Yes. Managers can be assigned multiple departments, giving them visibility and edit access across all of them.',
                    ar: 'نعم. يمكن إسناد عدة أقسام للمديرين، مما يمنحهم رؤية وصلاحية تعديل عبر جميعها.',
                },
            },
        ],
    },

    'escalation-rules': {
        title: { en: 'Escalation Rules', ar: 'قواعد التصعيد' },
        items: [
            {
                q: { en: 'What are escalation rules?', ar: 'ما هي قواعد التصعيد؟' },
                a: {
                    en: 'Escalation rules define who gets notified when specific events occur — for example, when a High-priority issue is raised, or when a risk score breaches a threshold. Rules trigger email alerts automatically.',
                    ar: 'تحدد قواعد التصعيد من يتم إشعاره عند وقوع أحداث محددة — على سبيل المثال، عند رفع قضية بأولوية مرتفعة، أو عند تجاوز درجة مخاطرة لحد معين. تُطلق القواعد تنبيهات بريد إلكتروني تلقائياً.',
                },
            },
            {
                q: { en: 'Who can configure escalation rules?', ar: 'من يمكنه تكوين قواعد التصعيد؟' },
                a: {
                    en: 'Only Admins can create or modify escalation rules.',
                    ar: 'المسؤولون فقط يمكنهم إنشاء قواعد التصعيد أو تعديلها.',
                },
            },
        ],
    },

    'email-settings': {
        title: { en: 'Email Settings', ar: 'إعدادات البريد الإلكتروني' },
        items: [
            {
                q: { en: 'What can I configure here?', ar: 'ماذا يمكنني تكوينه هنا؟' },
                a: {
                    en: 'Email Settings lets you configure the sender address and SMTP relay used for system notifications — including password resets, task alerts, and escalation emails.',
                    ar: 'تتيح لك إعدادات البريد الإلكتروني تكوين عنوان المرسل ومرحّل SMTP المستخدم لإشعارات النظام — بما في ذلك إعادة تعيين كلمات المرور، وتنبيهات المهام، ورسائل التصعيد.',
                },
            },
        ],
    },

    'branding': {
        title: { en: 'Branding', ar: 'العلامة التجارية' },
        items: [
            {
                q: { en: 'What branding options are available?', ar: 'ما خيارات العلامة التجارية المتاحة؟' },
                a: {
                    en: 'You can upload your organization\'s logo and set a primary color. The logo appears in the sidebar. Changes apply immediately for all users.',
                    ar: 'يمكنك رفع شعار مؤسستك وتحديد لون أساسي. يظهر الشعار في الشريط الجانبي. تُطبَّق التغييرات فوراً لجميع المستخدمين.',
                },
            },
        ],
    },

    'audit': {
        title: { en: 'Audit Log', ar: 'سجل المراجعة' },
        items: [
            {
                q: { en: 'What does the Audit Log record?', ar: 'ماذا يسجّل سجل المراجعة؟' },
                a: {
                    en: 'The Audit Log records every significant action in the system: risk approvals, policy changes, user management actions, KRI threshold breaches, issue status changes, and login events. It is append-only and cannot be edited.',
                    ar: 'يسجّل سجل المراجعة كل إجراء مهم في النظام: الموافقات على المخاطر، وتغييرات السياسات، وإجراءات إدارة المستخدمين، وتجاوزات حدود مؤشرات المخاطر الرئيسية، وتغييرات حالة القضايا، وأحداث تسجيل الدخول. وهو للإضافة فقط ولا يمكن تعديله.',
                },
            },
            {
                q: { en: 'Can I export the Audit Log?', ar: 'هل يمكنني تصدير سجل المراجعة؟' },
                a: {
                    en: 'Yes. Use the Export button to download the full log as CSV. This is commonly used to provide evidence during SOC 2 or ISO 27001 audits.',
                    ar: 'نعم. استخدم زر "تصدير" لتنزيل السجل الكامل بصيغة CSV. يُستخدم هذا عادةً لتقديم أدلة أثناء عمليات تدقيق SOC 2 أو ISO 27001.',
                },
            },
        ],
    },

    'storage-health': {
        title: { en: 'Storage & Health', ar: 'التخزين والصحة' },
        items: [
            {
                q: { en: 'What does this page show?', ar: 'ماذا تعرض هذه الصفحة؟' },
                a: {
                    en: 'Storage & Health tracks how much of your evidence and document storage quota is in use. Evidence files (attached to risks, controls, issues, obligations, and KRIs) and Risk Governance Documents share a combined 500MB quota per organisation, stored directly in the application database.',
                    ar: 'تتابع صفحة "التخزين والصحة" مقدار ما تم استخدامه من حصة تخزين الأدلة والوثائق. ملفات الأدلة (المرفقة بالمخاطر، والضوابط، والقضايا، والالتزامات، ومؤشرات المخاطر الرئيسية) ووثائق حوكمة المخاطر تتشارك حصة إجمالية قدرها 500 ميجابايت لكل مؤسسة، مخزَّنة مباشرة في قاعدة بيانات التطبيق.',
                },
            },
            {
                q: { en: "What happens if I'm near the quota?", ar: 'ماذا يحدث إذا اقتربت من الحصة؟' },
                a: {
                    en: 'New uploads are blocked once the 500MB limit is reached. Use this page to see which module is consuming the most space, and remove attachments that are no longer needed to free up room.',
                    ar: 'تُمنع عمليات الرفع الجديدة بمجرد بلوغ حد 500 ميجابايت. استخدم هذه الصفحة لمعرفة أي وحدة تستهلك أكبر مساحة، وأزل المرفقات التي لم تعد ضرورية لتحرير مساحة.',
                },
            },
            {
                q: { en: 'Can I delete files from here?', ar: 'هل يمكنني حذف الملفات من هنا؟' },
                a: {
                    en: 'Yes — Admins can review and delete individual files directly from this page if storage needs to be freed up.',
                    ar: 'نعم — يمكن للمسؤولين مراجعة الملفات الفردية وحذفها مباشرة من هذه الصفحة إذا لزم تحرير مساحة تخزين.',
                },
            },
        ],
    },

    'companies': {
        title: { en: 'Company Structure', ar: 'هيكل الشركة' },
        items: [
            {
                q: { en: 'What is the Company Structure page for?', ar: 'ما الغرض من صفحة هيكل الشركة؟' },
                a: {
                    en: 'Company Structure lets you configure parent-subsidiary relationships for multi-entity organizations. A parent company Admin can access a consolidated Group Dashboard that aggregates risk and compliance data across all subsidiaries.',
                    ar: 'تتيح لك صفحة هيكل الشركة تكوين علاقات الشركة الأم والشركات التابعة للمؤسسات متعددة الكيانات. يمكن لمسؤول الشركة الأم الوصول إلى لوحة قيادة موحّدة للمجموعة تجمّع بيانات المخاطر والامتثال عبر جميع الشركات التابعة.',
                },
            },
        ],
    },

    'departments': {
        title: { en: 'Departments', ar: 'الأقسام' },
        items: [
            {
                q: { en: 'What are departments used for?', ar: 'ما الغرض من استخدام الأقسام؟' },
                a: {
                    en: 'Departments let you segment risks, controls, issues, and KRIs by business unit. When a Manager is assigned to a department, they see only the records belonging to that department. Admins always see everything.',
                    ar: 'تتيح لك الأقسام تقسيم المخاطر، والضوابط، والقضايا، ومؤشرات المخاطر الرئيسية حسب وحدة العمل. عندما يُسند مدير إلى قسم، فإنه يرى فقط السجلات التابعة لذلك القسم. أما المسؤولون فيرون كل شيء دائماً.',
                },
            },
            {
                q: { en: 'Can I rename or delete a department?', ar: 'هل يمكنني إعادة تسمية قسم أو حذفه؟' },
                a: {
                    en: 'Yes. Renaming a department updates all linked records automatically. Deleting a department is only permitted if no records are currently assigned to it.',
                    ar: 'نعم. إعادة تسمية قسم تُحدّث جميع السجلات المرتبطة تلقائياً. لا يُسمح بحذف قسم إلا إذا لم تكن هناك سجلات مُسندة إليه حالياً.',
                },
            },
        ],
    },

    'business-units': {
        title: { en: 'Business Units', ar: 'وحدات الأعمال' },
        items: [
            {
                q: { en: 'What are Business Units for?', ar: 'ما الغرض من وحدات الأعمال؟' },
                a: {
                    en: 'For organisations structured into multiple divisions, Business Units let you group departments under a larger unit — so reporting, risk register filtering, and dashboards can roll up at the business-unit level as well as the department level.',
                    ar: 'بالنسبة للمؤسسات المُنظَّمة في عدة أقسام رئيسية، تتيح لك وحدات الأعمال تجميع الأقسام تحت وحدة أكبر — بحيث يمكن للتقارير، وتصفية سجل المخاطر، ولوحات القيادة أن تتجمّع على مستوى وحدة الأعمال، إضافة إلى مستوى القسم.',
                },
            },
            {
                q: { en: 'How do I create one?', ar: 'كيف أنشئ واحدة؟' },
                a: {
                    en: 'Enter a name and a short code is suggested automatically (you can edit it). Business Units only appear for companies with Business Unit mode enabled.',
                    ar: 'أدخل اسماً، وسيُقترح رمز مختصر تلقائياً (يمكنك تعديله). تظهر وحدات الأعمال فقط للشركات التي تم تفعيل وضع وحدات الأعمال لديها.',
                },
            },
            {
                q: { en: 'Can I rename or delete a Business Unit?', ar: 'هل يمكنني إعادة تسمية وحدة أعمال أو حذفها؟' },
                a: {
                    en: 'Renaming updates everywhere it\'s referenced automatically. Deleting is blocked if any department is still assigned to it — reassign those departments first.',
                    ar: 'تُحدَّث إعادة التسمية تلقائياً في كل مكان يُشار إليها فيه. يُحظر الحذف إذا كان أي قسم لا يزال مُسنداً إليها — أعد إسناد تلك الأقسام أولاً.',
                },
            },
            {
                q: { en: 'Who manages Business Units?', ar: 'من يدير وحدات الأعمال؟' },
                a: {
                    en: 'Admins only.',
                    ar: 'المسؤولون فقط.',
                },
            },
        ],
    },

    'ai-integration': {
        title: { en: 'AI Integration', ar: 'تكامل الذكاء الاصطناعي' },
        items: [
            {
                q: { en: 'What does this enable?', ar: 'ماذا يتيح هذا؟' },
                a: {
                    en: 'Configuring an AI API key (from any provider with a chat-completion endpoint, e.g. Anthropic or OpenAI) turns on the AI-assisted scan in Horizon Scanning, which drafts candidate emerging-risk signals from external sources for human review.',
                    ar: 'تكوين مفتاح واجهة برمجة تطبيقات للذكاء الاصطناعي (من أي مزود يوفر نقطة نهاية لإكمال المحادثات، مثل Anthropic أو OpenAI) يُفعّل المسح بمساعدة الذكاء الاصطناعي في وحدة مسح الأفق الاستراتيجي، والذي يصيغ إشارات مرشحة للمخاطر الناشئة من مصادر خارجية لمراجعتها بشرياً.',
                },
            },
            {
                q: { en: 'Is the API key secure?', ar: 'هل مفتاح واجهة البرمجة آمن؟' },
                a: {
                    en: 'Yes — it\'s stored and used entirely server-side. It\'s never sent to the browser; this page only ever shows a masked version (last 4 characters) once saved.',
                    ar: 'نعم — يُخزَّن ويُستخدم بالكامل من جانب الخادم. لا يُرسل أبداً إلى المتصفح؛ تعرض هذه الصفحة فقط نسخة مُقنَّعة (آخر 4 أحرف) بعد الحفظ.',
                },
            },
            {
                q: { en: 'Who can trigger an AI scan once a key is configured?', ar: 'من يمكنه تشغيل مسح بالذكاء الاصطناعي بعد تكوين المفتاح؟' },
                a: {
                    en: 'CRO, Consultant CRO, and Risk Manager roles. Drafts it produces always land in Draft status and require a qualified role to review and publish before they appear as active signals.',
                    ar: 'أدوار رئيس إدارة المخاطر، ورئيس إدارة المخاطر الاستشاري، ومدير المخاطر. تصل المسودات التي يُنتجها دائماً بحالة "مسودة" وتتطلب مراجعة دور مؤهل ونشرها قبل ظهورها كإشارات نشطة.',
                },
            },
            {
                q: { en: 'What happens if I remove the key?', ar: 'ماذا يحدث إذا أزلت المفتاح؟' },
                a: {
                    en: 'The AI scan button in Horizon Scanning is disabled immediately. Manual signal entry is unaffected — only the AI-assisted drafting feature depends on the key.',
                    ar: 'يُعطَّل زر المسح بالذكاء الاصطناعي في وحدة مسح الأفق الاستراتيجي فوراً. لا يتأثر الإدخال اليدوي للإشارات — فقط ميزة الصياغة بمساعدة الذكاء الاصطناعي تعتمد على المفتاح.',
                },
            },
        ],
    },

    'risk-config': {
        title: { en: 'Risk Configuration', ar: 'إعداد المخاطر' },
        items: [
            {
                q: { en: 'What is Risk Configuration for?', ar: 'ما الغرض من إعداد المخاطر؟' },
                a: {
                    en: 'It manages the two-level risk taxonomy — categories and their sub-categories — that populates the dropdowns used when creating or editing a risk in the Risk Register.',
                    ar: 'يدير تصنيف المخاطر ذو المستويين — الفئات وفئاتها الفرعية — الذي يُغذّي القوائم المنسدلة المستخدمة عند إنشاء أو تعديل مخاطرة في سجل المخاطر.',
                },
            },
            {
                q: { en: 'How do I add a category or sub-category?', ar: 'كيف أضيف فئة أو فئة فرعية؟' },
                a: {
                    en: 'Use the add option under the category list to create a new top-level category, or expand an existing category to add a sub-category beneath it.',
                    ar: 'استخدم خيار الإضافة أسفل قائمة الفئات لإنشاء فئة رئيسية جديدة، أو وسّع فئة قائمة لإضافة فئة فرعية تحتها.',
                },
            },
            {
                q: { en: 'Can I rename an existing category?', ar: 'هل يمكنني إعادة تسمية فئة قائمة؟' },
                a: {
                    en: 'Yes, inline — click into the category or sub-category name, edit it, and save. The change is reflected everywhere that category is already used.',
                    ar: 'نعم، مباشرة — انقر على اسم الفئة أو الفئة الفرعية، وعدّله، واحفظ. ينعكس التغيير في كل مكان تُستخدم فيه تلك الفئة بالفعل.',
                },
            },
            {
                q: { en: 'Who can manage the risk taxonomy?', ar: 'من يمكنه إدارة تصنيف المخاطر؟' },
                a: {
                    en: 'Admins only.',
                    ar: 'المسؤولون فقط.',
                },
            },
        ],
    },

};

// getHelp(pageId, lang) — returns { title, items: [{ q, a }] } with plain
// strings already resolved for the given language ('en' | 'ar'), falling
// back to English if an Arabic string is ever missing.
export function getHelp(pageId, lang = 'en') {
    const entry = HELP_CONTENT[pageId];
    if (!entry) return null;
    const pick = (field) => field[lang] ?? field.en;
    return {
        title: pick(entry.title),
        items: entry.items.map((item) => ({
            q: pick(item.q),
            a: pick(item.a),
        })),
    };
}
