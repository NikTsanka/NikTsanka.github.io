// ===== DM TRANSLATIONS =====
(function () {
    let currentLang = localStorage.getItem('dm_lang') || 'ka';

    const T = {
        ka: {
            // NAV
            'nav.home': 'მთავარი', 'nav.services': 'სერვისები ▾',
            'nav.dd.electric': 'ელექტრომონტაჟი', 'nav.dd.fire': 'სახანძრო უსაფრთხოება', 'nav.dd.alarm': 'სიგნალიზაცია',
            'nav.products': 'პროდუქცია', 'nav.contact': 'კონტაქტი',
            // FOOTER
            'footer.tagline': 'დანადგარების მონტაჟი',
            'footer.brand.p': 'პროფესიული ელექტრომონტაჟი, სახანძრო უსაფრთხოება და სიგნალიზაციის სისტემები მთელ საქართველოში.',
            'footer.pages': 'გვერდები', 'footer.services': 'სერვისები', 'footer.contact': 'კონტაქტი',
            'footer.link.home': '► მთავარი', 'footer.link.products': '► პროდუქცია', 'footer.link.contact': '► კონტაქტი',
            'footer.link.electric': '► ელექტრომონტაჟი', 'footer.link.fire': '► სახანძრო სისტემა', 'footer.link.alarm': '► სიგნალიზაცია',
            'footer.copy': '© 2026 DM — დანადგარების მონტაჟი. ყველა უფლება დაცულია.',
            'footer.privacy': 'კონფიდენციალობა | გამოყენების პირობები', 'footer.city': 'თბილისი, საქართველო',
            // BREADCRUMBS
            'bc.home': 'მთავარი', 'bc.electric': 'ელექტრომონტაჟი', 'bc.fire': 'სახანძრო უსაფრთხოება',
            'bc.alarm': 'სიგნალიზაცია', 'bc.contact': 'კონტაქტი', 'bc.products': 'პროდუქცია',
            // SHARED
            'shared.gallery.tag': 'გალერეა', 'shared.gallery.h2': 'შესრულებული სამუშაოები',
            'shared.process.tag': 'სამუშაო პროცესი',
            'shared.cta.btn.contact': 'დაგვიკავშირდით', 'shared.cta.btn.phone': '📞 +995 555 123 456',
            // INDEX
            'idx.badge': '🏆 სანდო კომპანია საქართველოში',
            'idx.h1': 'პროფესიონალური <span class="highlight">ელექტრომონტაჟი</span> და უსაფრთხოების სისტემები',
            'idx.hero.p': 'DM გთავაზობთ სრულ სპექტრს — ელექტრო ინსტალაციიდან სახანძრო სიგნალიზაციამდე. ხარისხი, სწრაფობა, სანდოობა.',
            'idx.hero.btn1': 'უფასო კონსულტაცია', 'idx.hero.btn2': 'სერვისები →',
            'idx.svc.tag': 'სერვისები', 'idx.svc.h2': 'ჩვენი სერვისები',
            'idx.svc.p': 'ვთავაზობთ სრულ კომპლექსს — ელექტრო ინსტალაციიდან თანამედროვე უსაფრთხოების სისტემებამდე',
            'idx.svc1.title': 'ელექტრომონტაჟი', 'idx.svc1.desc': 'სრული ელექტრო ინსტალაცია საცხოვრებელ და კომერციულ ობიექტებზე. გაყვანილობა, ელ-ფარები, განათება, გამანაწილებელი კაბინეტები.', 'idx.svc1.link': 'დაწვრილებით →',
            'idx.svc2.title': 'სახანძრო უსაფრთხოება', 'idx.svc2.desc': 'სახანძრო სიგნალიზაციის დაყენება, სპრინკლერული სისტემები, კვამლის დეტექტორები და ხანძარსაწინააღმდეგო სრული გადაწყვეტები.', 'idx.svc2.link': 'დაწვრილებით →',
            'idx.svc3.title': 'სიგნალიზაცია', 'idx.svc3.desc': 'თანამედროვე დაცვის სისტემები, მოძრაობის სენსორები, წვდომის კონტროლი და 24/7 მონიტორინგი.', 'idx.svc3.link': 'დაწვრილებით →',
            'idx.svc4.title': 'ვიდეოთვალყურეობა', 'idx.svc4.desc': 'IP კამერების დაყენება, ციფრული ვიდეო ჩამწერი სისტემები, ღრუბლოვანი მონიტორინგი და დისტანციური წვდომა.', 'idx.svc4.link': 'დაწვრილებით →',
            'idx.why.tag': 'რატომ ჩვენ?', 'idx.why.h2': 'რატომ უნდა აირჩიოთ DM?',
            'idx.why.p': 'ჩვენი კომპანია გამოირჩევა პროფესიონალიზმით, სანდოობით და გამჭვირვალე მიდგომით — თქვენი უსაფრთხოება ჩვენი პრიორიტეტია.',
            'idx.why1.title': 'ლიცენზირებული სპეციალისტები', 'idx.why1.desc': 'ყველა ჩვენი სპეციალისტი სერტიფიცირებულია სახელმწიფო სტანდარტებით',
            'idx.why2.title': 'სწრაფი გამოძახება', 'idx.why2.desc': 'გადაუდებელ შემთხვევებში 2 საათში ვართ ნებისმიერ ადგილზე',
            'idx.why3.title': 'კონკურენტული ფასები', 'idx.why3.desc': 'გამჭვირვალე ღირებულება — ფასდაკლება გახანგრძლივებული თანამშრომლობისას',
            'idx.why4.title': 'გარანტია და ტექ. მხარდაჭერა', 'idx.why4.desc': 'ყველა სამუშაოზე ვიძლევით 1-3 წლიან გარანტიას + უფასო ტექ. მხარდაჭერა',
            'idx.cta.h2': 'მზად ხართ თქვენი პროექტის დასაწყებად?',
            'idx.cta.p': 'მოგვწერეთ ან დაგვიძახეთ — მივიღებთ უფასო კონსულტაციასა და ხარჯთაღრიცხვას',
            'idx.cta.btn1': 'კონსულტაციის მოთხოვნა',
            // ELECTRICITY
            'elec.banner.h2': '⚡ ელექტრომონტაჟი', 'elec.process.h2': 'როგორ ვმუშაობთ?',
            'elec.process.p': 'გამჭვირვალე, სწრაფი და ეფექტური პროცესი — თქვენი დროის პატივისცემით',
            'elec.step1.title': 'განაცხადი და კონსულტაცია', 'elec.step1.desc': 'დაგვიკავშირდებით ტელეფონით ან ფორმით. 24 საათში გიპასუხებთ.',
            'elec.step2.title': 'ობიექტის დათვალიერება', 'elec.step2.desc': 'ჩვენი სპეციალისტი ადგილზე ჩამოვა, შეაფასებს სამუშაოს მოცულობას.',
            'elec.step3.title': 'ხარჯთაღრიცხვა', 'elec.step3.desc': 'მოგამზადებთ დეტალურ ხარჯთაღრიცხვას — ფასი, ვადები, მასალები.',
            'elec.step4.title': 'სამუშაოს შესრულება', 'elec.step4.desc': 'ლიცენზირებული გუნდი ასრულებს სამუშაოს შეთანხმებულ ვადებში.',
            'elec.step5.title': 'ჩაბარება და გარანტია', 'elec.step5.desc': 'ობიექტის ჩაბარება, ტესტირება და 1-3 წლიანი გარანტიის გაცემა.',
            'elec.gallery.p': 'ელექტრომონტაჟის რეალური პროექტები ჩვენი გუნდისგან',
            'elec.cta.h2': 'გჭირდებათ ელექტრიკოსი?', 'elec.cta.p': 'დაგვიძახეთ ახლავე — მივიდეთ ნებისმიერ ადგილას, სწრაფად და ხარისხიანად',
            // FIRE
            'fire.banner.h2': '🔥 სახანძრო უსაფრთხოება', 'fire.process.h2': 'სახანძრო სისტემის მონტაჟი',
            'fire.process.p': 'ნაბიჯ-ნაბიჯ — ობიექტის სრული დაცვა სახანძრო სისტემით',
            'fire.step1.title': 'ობიექტის დათვალიერება', 'fire.step1.desc': 'შენობის სქემის შესწავლა, სახანძრო საფრთხეების შეფასება.',
            'fire.step2.title': 'სისტემის დაპროექტება', 'fire.step2.desc': 'ინდივიდუალური სახანძრო სქემის შემუშავება ნორმების გათვალისწინებით.',
            'fire.step3.title': 'აღჭურვილობის მიწოდება', 'fire.step3.desc': 'სერტიფიცირებული, ევროსტანდარტის სახანძრო მოწყობილობების მიწოდება.',
            'fire.step4.title': 'მონტაჟი და ინტეგრაცია', 'fire.step4.desc': 'სისტემის სრული მონტაჟი, კავშირი საგანგებო სამსახურებთან.',
            'fire.step5.title': 'ტესტირება და სერვისი', 'fire.step5.desc': 'სისტემის სრული ტესტირება, პერსონალის ინსტრუქტაჟი, პერიოდული ტექ. მომსახურება.',
            'fire.gallery.p': 'სახანძრო სისტემების მონტაჟის რეალური პროექტები',
            'fire.cta.h2': 'დაიცავით თქვენი ობიექტი ხანძრისგან', 'fire.cta.p': 'სახანძრო სისტემა არ არის ხარჯი — ეს არის ინვესტიცია უსაფრთხოებაში',
            // ALARM
            'alarm.banner.h2': '🔒 სიგნალიზაცია და ვიდეოთვალყურეობა', 'alarm.bc': 'სიგნალიზაცია',
            'alarm.process.h2': 'სიგნალიზაციის მონტაჟი',
            'alarm.step1.title': 'საჭიროებების შეფასება', 'alarm.step1.desc': 'ობიექტის ზომა, განლაგება, რისკ-ფაქტორების ანალიზი.',
            'alarm.step2.title': 'სისტემის შერჩევა', 'alarm.step2.desc': 'ინდივიდუალური გადაწყვეტა — ბიუჯეტისა და საჭიროებების მიხედვით.',
            'alarm.step3.title': 'მონტაჟი', 'alarm.step3.desc': 'სენსორების, კამერების, პანელის სრული მონტაჟი მინიმალური შეფერხებით.',
            'alarm.step4.title': 'კონფიგურაცია და ტრენინგი', 'alarm.step4.desc': 'სისტემის სრული კონფიგურაცია, სმარტფონ-წვდომა, პერსონალის ტრენინგი.',
            'alarm.step5.title': '24/7 მხარდაჭერა', 'alarm.step5.desc': 'მონტაჟის შემდეგ — უწყვეტი ტექნიკური მხარდაჭერა.',
            'alarm.gallery.p': 'სიგნალიზაციისა და ვიდეოთვალყურეობის რეალური პროექტები',
            'alarm.cta.h2': 'დაიცავით თქვენი ქონება', 'alarm.cta.p': 'თანამედროვე სიგნალიზაცია — 24/7 დაცვა ნებისმიერი ადგილიდან',
            // CONTACT
            'contact.banner.h2': '📞 კონტაქტი',
            'contact.card1.title': 'ტელეფონი', 'contact.card1.sub': 'ყოველდღე 9:00–20:00',
            'contact.card2.title': 'ელ. ფოსტა', 'contact.card2.sub': '24 საათში გიპასუხებთ',
            'contact.card3.title': 'მისამართი', 'contact.card3.val': 'თბილისი, საქართველო', 'contact.card3.sub': 'ვაკე-საბურთალოს რაიონი',
            'contact.card4.title': 'სამუშაო საათები', 'contact.card4.val': 'ორშ–შაბათი: 9:00–18:00', 'contact.card4.sub': 'საგანგებო: 24/7',
            'contact.form.tag': 'შეტყობინება', 'contact.form.h2': 'მოგვწერეთ', 'contact.form.p': 'შეავსეთ ფორმა — 24 საათში გიპასუხებთ',
            'contact.form.name': 'სახელი *', 'contact.form.phone': 'ტელეფონი *', 'contact.form.email': 'ელ. ფოსტა',
            'contact.form.service': 'სერვისი', 'contact.form.msg': 'შეტყობინება *', 'contact.form.submit': 'გაგზავნა →',
            'contact.form.sending': 'იგზავნება...', 'contact.form.ok': '✓ შეტყობინება გაიგზავნა! 24 საათში დაგიკავშირდებით.',
            'contact.form.err': '✗ გაგზავნა ვერ მოხდა. სცადეთ ხელახლა ან დაგვიძახეთ: +995 555 123 456',
            'contact.form.val': '✗ შეავსეთ სავალდებულო ველები (*)',
            'contact.cta.h2': 'გჭირდებათ გადაუდებელი დახმარება?', 'contact.cta.p': 'ელექტრო ან სახანძრო გადაუდებელ შემთხვევაში — დაგვიძახეთ დაუყოვნებლივ',
            // PRODUCTS
            'products.banner.h2': '📦 პროდუქცია', 'products.bc': 'პროდუქცია',
            'products.tag': 'კატალოგი', 'products.h2': 'ჩვენი პროდუქცია',
            'products.p': 'ხარისხიანი მოწყობილობები ელექტრომონტაჟის, სახანძრო და დაცვის სისტემებისთვის',
            'products.filter.all': 'ყველა', 'products.order': 'შეკვეთა →', 'products.empty': 'ამ კატეგორიაში პროდუქტი არ მოიძებნა',
            'products.cta.h2': 'გჭირდებათ კონსულტაცია?', 'products.cta.p': 'დაგვიკავშირდით — დაგეხმარებით სწორი პროდუქტის არჩევაში',
            'contact.ph.name': 'თქვენი სახელი', 'contact.ph.msg': 'დაწერეთ თქვენი შეკითხვა ან მოთხოვნა...',
        },

        en: {
            'nav.home': 'Home', 'nav.services': 'Services ▾',
            'nav.dd.electric': 'Electrical Installation', 'nav.dd.fire': 'Fire Safety', 'nav.dd.alarm': 'Security Systems',
            'nav.products': 'Products', 'nav.contact': 'Contact',
            'footer.tagline': 'Equipment Installation',
            'footer.brand.p': 'Professional electrical installation, fire safety and security systems throughout Georgia.',
            'footer.pages': 'Pages', 'footer.services': 'Services', 'footer.contact': 'Contact',
            'footer.link.home': '► Home', 'footer.link.products': '► Products', 'footer.link.contact': '► Contact',
            'footer.link.electric': '► Electrical Installation', 'footer.link.fire': '► Fire Safety', 'footer.link.alarm': '► Security Systems',
            'footer.copy': '© 2026 DM. All rights reserved.',
            'footer.privacy': 'Privacy Policy | Terms of Use', 'footer.city': 'Tbilisi, Georgia',
            'bc.home': 'Home', 'bc.electric': 'Electrical', 'bc.fire': 'Fire Safety',
            'bc.alarm': 'Security Systems', 'bc.contact': 'Contact', 'bc.products': 'Products',
            'shared.gallery.tag': 'Gallery', 'shared.gallery.h2': 'Completed Projects',
            'shared.process.tag': 'Work Process',
            'shared.cta.btn.contact': 'Contact Us', 'shared.cta.btn.phone': '📞 +995 555 123 456',
            'idx.badge': '🏆 Trusted Company in Georgia',
            'idx.h1': 'Professional <span class="highlight">Electrical Installation</span> and Security Systems',
            'idx.hero.p': 'DM offers a full range of services — from electrical installation to fire alarm systems. Quality, speed, reliability.',
            'idx.hero.btn1': 'Free Consultation', 'idx.hero.btn2': 'Services →',
            'idx.svc.tag': 'Services', 'idx.svc.h2': 'Our Services',
            'idx.svc.p': 'We offer a full range — from electrical installation to modern security systems',
            'idx.svc1.title': 'Electrical Installation', 'idx.svc1.desc': 'Complete electrical installation for residential and commercial properties. Wiring, panels, lighting, distribution cabinets.', 'idx.svc1.link': 'Learn more →',
            'idx.svc2.title': 'Fire Safety', 'idx.svc2.desc': 'Fire alarm installation, sprinkler systems, smoke detectors and complete fire protection solutions.', 'idx.svc2.link': 'Learn more →',
            'idx.svc3.title': 'Security Systems', 'idx.svc3.desc': 'Modern security systems, motion sensors, access control and 24/7 monitoring.', 'idx.svc3.link': 'Learn more →',
            'idx.svc4.title': 'Video Surveillance', 'idx.svc4.desc': 'IP camera installation, digital video recorders, cloud monitoring and remote access.', 'idx.svc4.link': 'Learn more →',
            'idx.why.tag': 'Why Us?', 'idx.why.h2': 'Why Choose DM?',
            'idx.why.p': 'Our company stands out for professionalism, reliability and a transparent approach — your safety is our priority.',
            'idx.why1.title': 'Licensed Specialists', 'idx.why1.desc': 'All our specialists are certified to state standards',
            'idx.why2.title': 'Fast Response', 'idx.why2.desc': 'In emergencies, we arrive anywhere within 2 hours',
            'idx.why3.title': 'Competitive Prices', 'idx.why3.desc': 'Transparent pricing — discounts for long-term cooperation',
            'idx.why4.title': 'Warranty & Support', 'idx.why4.desc': 'We provide 1-3 year warranty on all work + free technical support',
            'idx.cta.h2': 'Ready to Start Your Project?',
            'idx.cta.p': 'Contact us — we will provide a free consultation and cost estimate',
            'idx.cta.btn1': 'Request Consultation',
            'elec.banner.h2': '⚡ Electrical Installation', 'elec.process.h2': 'How We Work',
            'elec.process.p': 'Transparent, fast and efficient process — respecting your time',
            'elec.step1.title': 'Request & Consultation', 'elec.step1.desc': 'Contact us by phone or form. We respond within 24 hours.',
            'elec.step2.title': 'Site Inspection', 'elec.step2.desc': 'Our specialist visits the site and assesses the scope of work.',
            'elec.step3.title': 'Cost Estimate', 'elec.step3.desc': 'We prepare a detailed estimate — price, timeline, materials.',
            'elec.step4.title': 'Work Execution', 'elec.step4.desc': 'Licensed team completes the work within agreed deadlines.',
            'elec.step5.title': 'Handover & Warranty', 'elec.step5.desc': 'Site handover, testing and 1-3 year warranty provided.',
            'elec.gallery.p': 'Real electrical installation projects from our team',
            'elec.cta.h2': 'Need an Electrician?', 'elec.cta.p': 'Call us now — we will come anywhere, fast and with quality',
            'fire.banner.h2': '🔥 Fire Safety', 'fire.process.h2': 'Fire System Installation',
            'fire.process.p': 'Step by step — complete fire protection for your property',
            'fire.step1.title': 'Site Inspection', 'fire.step1.desc': 'Building plan review and fire hazard assessment.',
            'fire.step2.title': 'System Design', 'fire.step2.desc': 'Development of individual fire protection scheme per regulations.',
            'fire.step3.title': 'Equipment Supply', 'fire.step3.desc': 'Supply of certified, European-standard fire equipment.',
            'fire.step4.title': 'Installation & Integration', 'fire.step4.desc': 'Full system installation, connection to emergency services.',
            'fire.step5.title': 'Testing & Service', 'fire.step5.desc': 'Full system testing, staff briefing, periodic maintenance.',
            'fire.gallery.p': 'Real fire system installation projects',
            'fire.cta.h2': 'Protect Your Property from Fire', 'fire.cta.p': 'A fire system is not an expense — it is an investment in safety',
            'alarm.banner.h2': '🔒 Security & Video Surveillance', 'alarm.bc': 'Security Systems',
            'alarm.process.h2': 'Security System Installation',
            'alarm.step1.title': 'Needs Assessment', 'alarm.step1.desc': 'Site size, layout and risk factor analysis.',
            'alarm.step2.title': 'System Selection', 'alarm.step2.desc': 'Individual solution — tailored to your budget and needs.',
            'alarm.step3.title': 'Installation', 'alarm.step3.desc': 'Full installation of sensors, cameras and panel with minimal disruption.',
            'alarm.step4.title': 'Configuration & Training', 'alarm.step4.desc': 'Full system configuration, smartphone access, staff training.',
            'alarm.step5.title': '24/7 Support', 'alarm.step5.desc': 'After installation — continuous technical support.',
            'alarm.gallery.p': 'Real security and video surveillance projects',
            'alarm.cta.h2': 'Protect Your Property', 'alarm.cta.p': 'Modern security systems — 24/7 protection from anywhere',
            'contact.banner.h2': '📞 Contact',
            'contact.card1.title': 'Phone', 'contact.card1.sub': 'Every day 9:00–20:00',
            'contact.card2.title': 'Email', 'contact.card2.sub': 'We reply within 24 hours',
            'contact.card3.title': 'Address', 'contact.card3.val': 'Tbilisi, Georgia', 'contact.card3.sub': 'Vake-Saburtalo district',
            'contact.card4.title': 'Working Hours', 'contact.card4.val': 'Mon–Sat: 9:00–18:00', 'contact.card4.sub': 'Emergency: 24/7',
            'contact.form.tag': 'Message', 'contact.form.h2': 'Write to Us', 'contact.form.p': 'Fill out the form — we will reply within 24 hours',
            'contact.form.name': 'Name *', 'contact.form.phone': 'Phone *', 'contact.form.email': 'Email',
            'contact.form.service': 'Service', 'contact.form.msg': 'Message *', 'contact.form.submit': 'Send →',
            'contact.form.sending': 'Sending...', 'contact.form.ok': '✓ Message sent! We will contact you within 24 hours.',
            'contact.form.err': '✗ Failed to send. Please try again or call: +995 555 123 456',
            'contact.form.val': '✗ Please fill in the required fields (*)',
            'contact.cta.h2': 'Need Emergency Help?', 'contact.cta.p': 'For electrical or fire emergencies — call us immediately',
            'products.banner.h2': '📦 Products', 'products.bc': 'Products',
            'products.tag': 'Catalogue', 'products.h2': 'Our Products',
            'products.p': 'Quality equipment for electrical installation, fire and security systems',
            'products.filter.all': 'All', 'products.order': 'Order →', 'products.empty': 'No products found in this category',
            'products.cta.h2': 'Need Consultation?', 'products.cta.p': 'Contact us — we will help you choose the right product',
            'contact.ph.name': 'Your name', 'contact.ph.msg': 'Write your question or request...',
        },

        ru: {
            'nav.home': 'Главная', 'nav.services': 'Услуги ▾',
            'nav.dd.electric': 'Электромонтаж', 'nav.dd.fire': 'Пожарная безопасность', 'nav.dd.alarm': 'Сигнализация',
            'nav.products': 'Продукция', 'nav.contact': 'Контакт',
            'footer.tagline': 'Монтаж оборудования',
            'footer.brand.p': 'Профессиональный электромонтаж, пожарная безопасность и системы сигнализации по всей Грузии.',
            'footer.pages': 'Страницы', 'footer.services': 'Услуги', 'footer.contact': 'Контакт',
            'footer.link.home': '► Главная', 'footer.link.products': '► Продукция', 'footer.link.contact': '► Контакт',
            'footer.link.electric': '► Электромонтаж', 'footer.link.fire': '► Пожарная система', 'footer.link.alarm': '► Сигнализация',
            'footer.copy': '© 2026 DM. Все права защищены.',
            'footer.privacy': 'Конфиденциальность | Условия использования', 'footer.city': 'Тбилиси, Грузия',
            'bc.home': 'Главная', 'bc.electric': 'Электромонтаж', 'bc.fire': 'Пожарная безопасность',
            'bc.alarm': 'Сигнализация', 'bc.contact': 'Контакт', 'bc.products': 'Продукция',
            'shared.gallery.tag': 'Галерея', 'shared.gallery.h2': 'Выполненные работы',
            'shared.process.tag': 'Рабочий процесс',
            'shared.cta.btn.contact': 'Связаться с нами', 'shared.cta.btn.phone': '📞 +995 555 123 456',
            'idx.badge': '🏆 Надёжная компания в Грузии',
            'idx.h1': 'Профессиональный <span class="highlight">электромонтаж</span> и системы безопасности',
            'idx.hero.p': 'DM предлагает полный спектр услуг — от электромонтажа до пожарной сигнализации. Качество, скорость, надёжность.',
            'idx.hero.btn1': 'Бесплатная консультация', 'idx.hero.btn2': 'Услуги →',
            'idx.svc.tag': 'Услуги', 'idx.svc.h2': 'Наши услуги',
            'idx.svc.p': 'Предлагаем полный комплекс — от электроустановки до современных систем безопасности',
            'idx.svc1.title': 'Электромонтаж', 'idx.svc1.desc': 'Полная электроустановка в жилых и коммерческих объектах. Проводка, щитки, освещение, распределительные шкафы.', 'idx.svc1.link': 'Подробнее →',
            'idx.svc2.title': 'Пожарная безопасность', 'idx.svc2.desc': 'Установка пожарной сигнализации, спринклерные системы, детекторы дыма и комплексные решения пожарной защиты.', 'idx.svc2.link': 'Подробнее →',
            'idx.svc3.title': 'Сигнализация', 'idx.svc3.desc': 'Современные системы охраны, датчики движения, контроль доступа и мониторинг 24/7.', 'idx.svc3.link': 'Подробнее →',
            'idx.svc4.title': 'Видеонаблюдение', 'idx.svc4.desc': 'Установка IP-камер, цифровые видеорегистраторы, облачный мониторинг и удалённый доступ.', 'idx.svc4.link': 'Подробнее →',
            'idx.why.tag': 'Почему мы?', 'idx.why.h2': 'Почему выбирают DM?',
            'idx.why.p': 'Наша компания отличается профессионализмом, надёжностью и прозрачным подходом — ваша безопасность — наш приоритет.',
            'idx.why1.title': 'Лицензированные специалисты', 'idx.why1.desc': 'Все наши специалисты сертифицированы по государственным стандартам',
            'idx.why2.title': 'Быстрый выезд', 'idx.why2.desc': 'В экстренных случаях — приедем в любое место в течение 2 часов',
            'idx.why3.title': 'Конкурентные цены', 'idx.why3.desc': 'Прозрачная стоимость — скидки при долгосрочном сотрудничестве',
            'idx.why4.title': 'Гарантия и поддержка', 'idx.why4.desc': 'Гарантия 1-3 года на все работы + бесплатная техподдержка',
            'idx.cta.h2': 'Готовы начать ваш проект?',
            'idx.cta.p': 'Напишите или позвоните нам — предоставим бесплатную консультацию и смету',
            'idx.cta.btn1': 'Запросить консультацию',
            'elec.banner.h2': '⚡ Электромонтаж', 'elec.process.h2': 'Как мы работаем',
            'elec.process.p': 'Прозрачный, быстрый и эффективный процесс — с уважением к вашему времени',
            'elec.step1.title': 'Заявка и консультация', 'elec.step1.desc': 'Свяжитесь с нами по телефону или через форму. Ответим в течение 24 часов.',
            'elec.step2.title': 'Осмотр объекта', 'elec.step2.desc': 'Наш специалист приедет на место и оценит объём работ.',
            'elec.step3.title': 'Смета', 'elec.step3.desc': 'Подготовим детальную смету — цена, сроки, материалы.',
            'elec.step4.title': 'Выполнение работ', 'elec.step4.desc': 'Лицензированная бригада выполняет работы в согласованные сроки.',
            'elec.step5.title': 'Сдача и гарантия', 'elec.step5.desc': 'Сдача объекта, тестирование и гарантия на 1-3 года.',
            'elec.gallery.p': 'Реальные проекты электромонтажа нашей бригады',
            'elec.cta.h2': 'Нужен электрик?', 'elec.cta.p': 'Звоните сейчас — приедем в любое место быстро и качественно',
            'fire.banner.h2': '🔥 Пожарная безопасность', 'fire.process.h2': 'Монтаж пожарной системы',
            'fire.process.p': 'Шаг за шагом — полная защита объекта системой пожаротушения',
            'fire.step1.title': 'Осмотр объекта', 'fire.step1.desc': 'Изучение плана здания, оценка пожарных рисков.',
            'fire.step2.title': 'Проектирование системы', 'fire.step2.desc': 'Разработка индивидуальной пожарной схемы с учётом норм.',
            'fire.step3.title': 'Поставка оборудования', 'fire.step3.desc': 'Поставка сертифицированного оборудования европейского стандарта.',
            'fire.step4.title': 'Монтаж и интеграция', 'fire.step4.desc': 'Полный монтаж системы, подключение к аварийным службам.',
            'fire.step5.title': 'Тестирование и обслуживание', 'fire.step5.desc': 'Полное тестирование, инструктаж персонала, периодическое обслуживание.',
            'fire.gallery.p': 'Реальные проекты монтажа пожарных систем',
            'fire.cta.h2': 'Защитите ваш объект от пожара', 'fire.cta.p': 'Пожарная система — это не расход, это инвестиция в безопасность',
            'alarm.banner.h2': '🔒 Сигнализация и видеонаблюдение', 'alarm.bc': 'Сигнализация',
            'alarm.process.h2': 'Монтаж сигнализации',
            'alarm.step1.title': 'Оценка потребностей', 'alarm.step1.desc': 'Анализ размера, планировки и факторов риска объекта.',
            'alarm.step2.title': 'Выбор системы', 'alarm.step2.desc': 'Индивидуальное решение — под ваш бюджет и потребности.',
            'alarm.step3.title': 'Монтаж', 'alarm.step3.desc': 'Полный монтаж датчиков, камер, панели с минимальными неудобствами.',
            'alarm.step4.title': 'Настройка и обучение', 'alarm.step4.desc': 'Полная настройка системы, доступ со смартфона, обучение персонала.',
            'alarm.step5.title': 'Поддержка 24/7', 'alarm.step5.desc': 'После монтажа — непрерывная техническая поддержка.',
            'alarm.gallery.p': 'Реальные проекты сигнализации и видеонаблюдения',
            'alarm.cta.h2': 'Защитите вашу собственность', 'alarm.cta.p': 'Современная сигнализация — защита 24/7 из любого места',
            'contact.banner.h2': '📞 Контакт',
            'contact.card1.title': 'Телефон', 'contact.card1.sub': 'Ежедневно 9:00–20:00',
            'contact.card2.title': 'Эл. почта', 'contact.card2.sub': 'Ответим в течение 24 часов',
            'contact.card3.title': 'Адрес', 'contact.card3.val': 'Тбилиси, Грузия', 'contact.card3.sub': 'Район Ваке-Сабуртало',
            'contact.card4.title': 'Рабочие часы', 'contact.card4.val': 'Пн–Сб: 9:00–18:00', 'contact.card4.sub': 'Экстренно: 24/7',
            'contact.form.tag': 'Сообщение', 'contact.form.h2': 'Напишите нам', 'contact.form.p': 'Заполните форму — ответим в течение 24 часов',
            'contact.form.name': 'Имя *', 'contact.form.phone': 'Телефон *', 'contact.form.email': 'Эл. почта',
            'contact.form.service': 'Услуга', 'contact.form.msg': 'Сообщение *', 'contact.form.submit': 'Отправить →',
            'contact.form.sending': 'Отправка...', 'contact.form.ok': '✓ Сообщение отправлено! Свяжемся в течение 24 часов.',
            'contact.form.err': '✗ Не удалось отправить. Попробуйте ещё раз или позвоните: +995 555 123 456',
            'contact.form.val': '✗ Заполните обязательные поля (*)',
            'contact.cta.h2': 'Нужна срочная помощь?', 'contact.cta.p': 'В случае электро или пожарной аварии — звоните немедленно',
            'products.banner.h2': '📦 Продукция', 'products.bc': 'Продукция',
            'products.tag': 'Каталог', 'products.h2': 'Наша продукция',
            'products.p': 'Качественное оборудование для электромонтажа, пожарных и охранных систем',
            'products.filter.all': 'Все', 'products.order': 'Заказать →', 'products.empty': 'В этой категории продукты не найдены',
            'products.cta.h2': 'Нужна консультация?', 'products.cta.p': 'Свяжитесь с нами — поможем выбрать подходящий продукт',
            'contact.ph.name': 'Ваше имя', 'contact.ph.msg': 'Напишите ваш вопрос или запрос...',
        }
    };

    function applyLang(lang) {
        currentLang = lang;
        const t = T[lang];
        if (!t) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const v = t[el.dataset.i18n]; if (v !== undefined) el.textContent = v;
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const v = t[el.dataset.i18nHtml]; if (v !== undefined) el.innerHTML = v;
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const v = t[el.dataset.i18nPh]; if (v !== undefined) el.placeholder = v;
        });
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        document.documentElement.lang = lang;
        localStorage.setItem('dm_lang', lang);
        document.dispatchEvent(new CustomEvent('dm:lang', { detail: lang }));
    }

    window.i18nT = function (key) {
        return (T[currentLang] && T[currentLang][key]) || (T.ka && T.ka[key]) || key;
    };

    function init() {
        applyLang(currentLang);
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => applyLang(btn.dataset.lang));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
