/* ==========================================================================
   TSUKANOV. — core interactions v12
   Контакты: Telegram @Maxicosss · WhatsApp/тел +7 938 555-75-84
   ========================================================================== */

const TSUKANOV = {
    telegram: 'https://t.me/Maxicosss',
    whatsappNumber: '79385557584',
    phone: '+79385557584'
};

/* ---------- 1. Эффекты при загрузке ---------- */
document.addEventListener("DOMContentLoaded", () => {

    // Прогресс-бар + плавающий CTA
    const progressBar = document.getElementById('scrollProgressBar');
    const floatingCta = document.getElementById('floatingCta');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (progressBar) progressBar.style.width = progress + '%';
        if (floatingCta) floatingCta.classList.toggle('visible', scrollTop > 500);
    }, { passive: true });

    // Ambient light parallax
    const ambientLight = document.getElementById('ambientLight');
    if (ambientLight && window.matchMedia("(pointer: fine)").matches) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 60;
            const y = (e.clientY / window.innerHeight - 0.5) * 60;
            ambientLight.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    // Кастомный курсор
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    if (window.matchMedia("(pointer: fine)").matches && cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (e) => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.animate({ left: `${e.clientX}px`, top: `${e.clientY}px` },
                { duration: 500, fill: "forwards" });
        });
        document.querySelectorAll('a, button, .pricing-card, .avito-item, .blog-card, .ai-opt, .ai-channel, .service-card, .b2b-card, .m-item').forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });
    }

    // Скрытие/появление хедера
    let lastScroll = 0;
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            const cur = window.pageYOffset;
            if (cur <= 0) {
                header.style.transform = "translateY(0)";
                header.style.background = 'transparent';
                header.style.borderBottom = '1px solid transparent';
                return;
            }
            if (cur > lastScroll && cur > 80) {
                header.style.transform = "translateY(-150%)";
            } else {
                header.style.transform = "translateY(0)";
                header.style.background = 'var(--glass-bg)';
                header.style.backdropFilter = 'var(--blur)';
                header.style.borderBottom = '1px solid var(--border-light)';
            }
            lastScroll = cur;
        }, { passive: true });
    }

    // Scroll reveal
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Закрытие модалок по фону
    document.getElementById('articleModal')?.addEventListener('click', function (e) { if (e.target === this) closeArticle(); });
    document.getElementById('contactModal')?.addEventListener('click', function (e) { if (e.target === this) closeContactModal(); });

    // FAQ-аккордеон
    document.querySelectorAll('.faq-q').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            item.parentElement.querySelectorAll('.faq-item.open').forEach(o => {
                o.classList.remove('open');
                o.querySelector('.faq-a').style.maxHeight = null;
            });
            if (!wasOpen) {
                item.classList.add('open');
                const a = item.querySelector('.faq-a');
                a.style.maxHeight = a.scrollHeight + 'px';
            }
        });
    });

    // Инициализация ИИ-воронки (если есть на странице)
    document.querySelectorAll('[data-ai-funnel]').forEach(initAiFunnel);

    // Счётчики статистики
    initCounters();
});

/* ---------- 2. Меню / модалки ---------- */
function toggleMenu() { document.getElementById('mobileMenu')?.classList.toggle('active'); }
function openContactModal() {
    const m = document.getElementById('contactModal');
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeContactModal() {
    const m = document.getElementById('contactModal');
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}

/* ---------- 3. Анимация счётчиков ---------- */
function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const dur = 1400; const start = performance.now();
            const step = now => {
                const p = Math.min((now - start) / dur, 1);
                const val = target * (1 - Math.pow(1 - p, 3));
                el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            o.unobserve(el);
        });
    }, { threshold: 0.4 });
    els.forEach(el => obs.observe(el));
}

/* ==========================================================================
   4. ИИ-ВОРОНКА
   Персональный разбор запрашивается у Flask OpenRouter endpoint.
   Если endpoint недоступен, используется локальный безопасный fallback.
   Реальная заявка дублируется менеджеру через WhatsApp/Telegram.
   ========================================================================== */

const AI_CONFIG = {
    hub: {
        nicheLabel: "С чем работаете?",
        niches: [
            { v: "auto", t: "Авто / детейлинг", i: "fa-car" },
            { v: "beauty", t: "Бьюти / клиника", i: "fa-spa" },
            { v: "ecom", t: "Магазин / бренд", i: "fa-bag-shopping" },
            { v: "service", t: "Услуги / B2B", i: "fa-briefcase" },
            { v: "expert", t: "Эксперт / личный бренд", i: "fa-user-tie" },
            { v: "other", t: "Другое", i: "fa-ellipsis" }
        ],
        painLabel: "Что сейчас болит сильнее всего?",
        pains: [
            { v: "leads", t: "Мало заявок", i: "fa-arrow-trend-down" },
            { v: "cheap", t: "Клиенты просят скидку", i: "fa-tags" },
            { v: "trust", t: "Не верят / не доходят до оплаты", i: "fa-shield-halved" },
            { v: "site", t: "Старый / нет сайта", i: "fa-window-maximize" },
            { v: "avito", t: "Слабо на Авито / Картах", i: "fa-map-location-dot" },
            { v: "scale", t: "Хочу масштабироваться", i: "fa-chart-line" }
        ]
    },
    sites: {
        nicheLabel: "Какой сайт нужен?",
        niches: [
            { v: "card", t: "Сайт-визитка", i: "fa-id-card" },
            { v: "landing", t: "Лендинг под рекламу", i: "fa-bullseye" },
            { v: "shop", t: "Интернет-магазин / D2C", i: "fa-bag-shopping" },
            { v: "corp", t: "Корпоративный / B2B", i: "fa-building" },
            { v: "platform", t: "Платформа / личный кабинет", i: "fa-layer-group" },
            { v: "redesign", t: "Переделать текущий", i: "fa-rotate" }
        ],
        painLabel: "Что не так с текущей ситуацией?",
        pains: [
            { v: "conv", t: "Сайт не приносит заявок", i: "fa-arrow-trend-down" },
            { v: "slow", t: "Медленный / на конструкторе", i: "fa-gauge-high" },
            { v: "ugly", t: "Выглядит дёшево", i: "fa-wand-magic-sparkles" },
            { v: "mobile", t: "Плохо на телефоне", i: "fa-mobile-screen" },
            { v: "integr", t: "Нет CRM / оплат / ботов", i: "fa-plug" },
            { v: "law", t: "Боюсь штрафа по 152-ФЗ", i: "fa-scale-balanced" }
        ]
    },
    avito: {
        nicheLabel: "Какая у вас ниша на Авито?",
        niches: [
            { v: "auto", t: "Авто / детейлинг / запчасти", i: "fa-car" },
            { v: "repair", t: "Ремонт / строительство", i: "fa-screwdriver-wrench" },
            { v: "beauty", t: "Бьюти / здоровье", i: "fa-spa" },
            { v: "goods", t: "Товары / перепродажа", i: "fa-box" },
            { v: "service", t: "Услуги", i: "fa-briefcase" },
            { v: "new", t: "Запускаюсь с нуля", i: "fa-rocket" }
        ],
        painLabel: "Что происходит с объявлениями?",
        pains: [
            { v: "views", t: "Мало просмотров", i: "fa-eye-slash" },
            { v: "contacts", t: "Смотрят, но не пишут", i: "fa-comment-slash" },
            { v: "expensive", t: "Дорогой контакт / лид", i: "fa-coins" },
            { v: "lost", t: "Теряюсь среди конкурентов", i: "fa-users" },
            { v: "promo", t: "Лью бюджет в продвижение впустую", i: "fa-fire" },
            { v: "zero", t: "Нет отзывов / только начал", i: "fa-star" }
        ]
    },
    geo: {
        nicheLabel: "Где у вас точка / бизнес?",
        niches: [
            { v: "auto", t: "Автосервис / детейлинг", i: "fa-car" },
            { v: "clinic", t: "Клиника / стоматология", i: "fa-stethoscope" },
            { v: "beauty", t: "Салон / барбершоп", i: "fa-scissors" },
            { v: "food", t: "Кафе / общепит", i: "fa-utensils" },
            { v: "retail", t: "Магазин / шоурум", i: "fa-store" },
            { v: "service", t: "Услуги / сервис", i: "fa-briefcase" }
        ],
        painLabel: "Что с картами и геосервисами?",
        pains: [
            { v: "invisible", t: "Не находят в Картах / 2ГИС", i: "fa-magnifying-glass" },
            { v: "lowrating", t: "Мало / плохие отзывы", i: "fa-star-half-stroke" },
            { v: "rivals", t: "Конкуренты выше в выдаче", i: "fa-ranking-star" },
            { v: "noroute", t: "Мало звонков и маршрутов", i: "fa-route" },
            { v: "ugly", t: "Профиль выглядит пусто", i: "fa-image" },
            { v: "new", t: "Только открылись", i: "fa-rocket" }
        ]
    }
};

// Тексты анализа по болям (диагноз + что сделаем + эффект)
const AI_ANALYSIS = {
    leads:      { d: "Дело почти никогда не в «мало трафика» — чаще трафик есть, но он утекает на слабой упаковке и непонятной навигации. Деньги уходят в показы, а не в заявки.", fix: ["Перестроить первый экран под одно целевое действие", "Добавить блок доверия (кейсы, цифры, лица команды)", "Сократить путь до заявки до 1–2 кликов"], eff: ["+30–60%", "к заявкам с того же трафика"] },
    cheap:      { d: "Когда клиент просит скидку — он не видит ценности и приравнивает вас к дешёвым конкурентам. Это вопрос визуального статуса и подачи, а не цены.", fix: ["Поднять визуальный уровень до «тяжёлого люкса»", "Показать процесс и результат, а не просто услугу", "Убрать всё, что считывается как масс-маркет"], eff: ["×1.5–2", "к среднему чеку"] },
    trust:      { d: "Люди заходят, но не доходят до оплаты — значит ломается доверие: нет лиц, нет доказательств, нет ощущения «живой команды профи».", fix: ["Блок команды и реальных кейсов с цифрами", "Гарантии и понятные этапы работы", "Социальные доказательства рядом с кнопкой"], eff: ["×2–3", "к конверсии в обращение"] },
    site:       { d: "Без современного сайта вы теряете аудиторию, которая проверяет вас перед покупкой. Старый сайт = красный флаг для платёжеспособного клиента.", fix: ["Быстрый сайт на чистом коде (не конструктор)", "Адаптив под телефон 100%", "Интеграция заявок прямо в ваш мессенджер"], eff: ["4–7 дней", "до запуска"] },
    avito:      { d: "На Авито и Картах решает первый кадр. Если обложка не пробивает баннерную слепоту — алгоритм и человек проходят мимо, бюджет горит.", fix: ["Продающие обложки с высоким CTR", "Прошивка текстов ключами под алгоритмы", "Воронка внутри площадки до контакта"], eff: ["−50%", "к цене контакта"] },
    scale:      { d: "Для масштабирования нужна система, а не разовые правки: сайт, площадки и геосервисы должны работать как единый отдел продаж.", fix: ["Связать сайт, Авито и Карты в одну воронку", "Автоматизация заявок и CRM", "Аналитика, чтобы видеть, что окупается"], eff: ["x3", "потенциал по лидам"] },
    // sites
    conv:       { d: "Сайт-витрина, который «просто есть», почти не конвертит. Нужна архитектура, которая ведёт посетителя за руку к целевому действию.", fix: ["UX, выстроенный по логике принятия решения", "Сильные офферы и призывы на каждом экране", "Формы и быстрые контакты без трения"], eff: ["×2–3", "к конверсии в лид"] },
    slow:       { d: "Конструкторы тормозят и проседают в мобайле, а скорость напрямую влияет и на конверсию, и на позиции. Это упущенные деньги каждый день.", fix: ["Перенос на чистый быстрый код", "Оптимизация картинок и загрузки", "Идеальный мобильный опыт"], eff: ["<1 сек", "загрузка"] },
    ugly:       { d: "«Дёшево выглядит» = «дёшево стоит» в голове клиента. Премиальный визуал оправдывает высокий чек ещё до диалога с менеджером.", fix: ["Айдентика и типографика уровня люкс", "Кинематографичный продакшн вместо стоков", "Воздух и минимализм в дизайне"], eff: ["×1.5–2", "к чеку"] },
    mobile:     { d: "Большая часть трафика — мобильная. Если на телефоне неудобно, вы теряете больше половины заявок ещё до их появления.", fix: ["Mobile-first вёрстка", "Крупные удобные кнопки и формы", "Скорость и читабельность на любом экране"], eff: ["+40%", "мобильных заявок"] },
    integr:     { d: "Без интеграций сайт — это остров. CRM, оплаты, боты и уведомления превращают его в работающий механизм продаж 24/7.", fix: ["Подключение CRM и уведомлений в мессенджер", "Онлайн-оплаты (ЮKassa)", "Telegram-бот и автоответы"], eff: ["24/7", "автоматизация"] },
    law:        { d: "С 2026 года Роскомнадзор массово штрафует за нарушения 152-ФЗ — от 100 до 300 тыс. ₽ за отсутствие корректного сбора данных.", fix: ["Аудит сайта на соответствие 152-ФЗ", "Корректные чекбоксы и политика на уровне кода", "Закрытие дыр за 24 часа"], eff: ["до 300к ₽", "экономия на штрафах"] },
    // avito
    views:      { d: "Мало просмотров — почти всегда слабая обложка и заголовок: алгоритм Авито поднимает то, на что кликают. Нет CTR — нет показов.", fix: ["Обложка, которая бьёт по баннерной слепоте", "Заголовок с ключами под поиск", "A/B первого кадра"], eff: ["+200–300%", "к просмотрам"] },
    contacts:   { d: "Смотрят, но не пишут — значит внутри объявления нет смыслов и доверия, которые закрывают на контакт. Трафик есть, упаковки нет.", fix: ["Воронка из слайдов: оффер → смыслы → закрытие", "Отработка возражений прямо в карточке", "Чёткий призыв написать/позвонить"], eff: ["×2–3", "к обращениям"] },
    expensive:  { d: "Дорогой контакт = вы платите за показы, а конвертит слабо. Снижается не ставка, а стоимость за счёт роста CTR и конверсии карточки.", fix: ["Поднять CTR обложки → дешевле показы", "Усилить смыслы → выше конверсия в контакт", "Убрать слив бюджета на нецелевых"], eff: ["с ~90₽ до ~54₽", "за контакт (реальный кейс)"] },
    lost:       { d: "В выдаче побеждает тот, кто визуально выделяется. Если карточки как у всех — вы сливаетесь и проигрываете даже при цене ниже.", fix: ["Уникальный визуальный стиль магазина", "Единая сетка объявлений под ключ", "Позиционирование, которое запоминают"], eff: ["ТОП выдачи", "по визуалу"] },
    promo:      { d: "Продвижение без упаковки — это бензин в дырявый бак. Сначала чиним карточку, потом разгоняем бюджет, иначе деньги горят.", fix: ["Упаковка до запуска продвижения", "Связка обложка + текст + воронка", "Контроль метрик и точек роста"], eff: ["+4–5%", "к конверсии в контакт"] },
    zero:       { d: "Старт с нуля без отзывов — нормально. Доверие строится упаковкой и смыслами: первые целевые заявки приходят и без истории.", fix: ["Запуск аккаунта/магазина с нуля", "Доверие через визуал и смыслы", "Первая сетка продающих объявлений"], eff: ["с 0 до заявок", "за первые недели"] },
    // geo
    invisible:  { d: "Если вас не находят в Картах и 2ГИС — вы теряете самых горячих клиентов, которые ищут услугу рядом прямо сейчас.", fix: ["SEO-оптимизация карточки под запросы", "Полное заполнение профиля и рубрик", "Гео-ключи и категории"], eff: ["ТОП-3", "в локальной выдаче"] },
    lowrating:  { d: "Рейтинг и отзывы — главный фактор выбора в геосервисах. Без системной работы с отзывами конверсия в звонок проседает.", fix: ["Система сбора отзывов через сайт/QR", "Работа с рейтингом и ответами", "Подтягивание отзывов на Карты"], eff: ["+ рейтинг", "+ доверие"] },
    rivals:     { d: "Конкуренты выше — потому что их профиль оптимизирован и активен. Алгоритм карт любит заполненность, отзывы и актуальность.", fix: ["Аудит профилей конкурентов", "Перекрытие их по заполненности и ключам", "Регулярная активность профиля"], eff: ["выше выдача", "обгон конкурентов"] },
    noroute:    { d: "Мало звонков и маршрутов = профиль есть, но не продаёт. Нужны визуал, акции и призывы, которые конвертят просмотр в действие.", fix: ["Продающие фото и обложки профиля", "Акции и спецпредложения в карточке", "Чёткие кнопки звонка/маршрута"], eff: ["+ звонки", "+ маршруты"] },
    other:      { d: "Опишите ситуацию подробнее в следующем шаге — мы разберём именно ваш случай и предложим точечное решение.", fix: ["Бесплатная диагностика вашей воронки", "Точечные рекомендации под нишу", "План роста с прогнозом окупаемости"], eff: ["бесплатно", "первичный разбор"] }
};

function initAiFunnel(root) {
    const ctx = root.dataset.aiFunnel || 'hub';
    const cfg = AI_CONFIG[ctx] || AI_CONFIG.hub;
    const state = { niche: null, nicheT: '', pain: null, painT: '', text: '', name: '', contact: '', channel: 'tg', step: 0 };
    const TOTAL = 3;

    const optBtns = (items, key) => items.map(o =>
        `<button class="ai-opt" data-v="${o.v}" data-t="${o.t}" data-key="${key}"><i class="fa-solid ${o.i}"></i> ${o.t}</button>`).join('');

    root.innerHTML = `
      <div class="ai-shell">
        <div class="ai-shell-head">
          <div class="ai-orb"></div>
          <div class="h-t"><b>AI-диагностика продаж</b><span>Ответьте на 3 вопроса — получите разбор за 15 секунд</span></div>
          <div class="h-badge">Бесплатно</div>
        </div>
        <div class="ai-body">
          <div class="ai-progress">${Array.from({length:TOTAL},(_,i)=>`<div class="dot${i===0?' done':''}"></div>`).join('')}</div>

          <div class="ai-step active" data-s="0">
            <div class="ai-q-label">Шаг 1 из ${TOTAL}</div>
            <div class="ai-q-title">${cfg.nicheLabel}</div>
            <div class="ai-options">${optBtns(cfg.niches,'niche')}</div>
            <div class="ai-nav"><span></span><button class="ai-next" disabled>Далее <i class="fa-solid fa-arrow-right"></i></button></div>
          </div>

          <div class="ai-step" data-s="1">
            <div class="ai-q-label">Шаг 2 из ${TOTAL}</div>
            <div class="ai-q-title">${cfg.painLabel}</div>
            <div class="ai-options">${optBtns(cfg.pains,'pain')}</div>
            <div class="ai-nav"><button class="ai-back"><i class="fa-solid fa-arrow-left"></i> Назад</button><button class="ai-next" disabled>Далее <i class="fa-solid fa-arrow-right"></i></button></div>
          </div>

          <div class="ai-step" data-s="2">
            <div class="ai-q-label">Шаг 3 из ${TOTAL}</div>
            <div class="ai-q-title">Опишите вашу ситуацию своими словами</div>
            <textarea class="ai-textarea" placeholder="Например: лью на Авито 20к в месяц, просмотры есть, а заявок почти нет. Что не так?"></textarea>
            <div class="ai-nav"><button class="ai-back"><i class="fa-solid fa-arrow-left"></i> Назад</button><button class="ai-next">Получить разбор <i class="fa-solid fa-bolt"></i></button></div>
          </div>

          <div class="ai-step" data-s="analyzing">
            <div class="ai-analyzing">
              <div class="scan"></div>
              <div class="typed"></div>
              <p>Анализируем вашу воронку и точки роста…</p>
            </div>
          </div>

          <div class="ai-step" data-s="result"></div>
          <div class="ai-step" data-s="success">
            <div class="ai-success">
              <div class="big"><i class="fa-solid fa-check"></i></div>
              <h4>Заявка принята!</h4>
              <p>Менеджер уже получил ваш разбор и контакт. Свяжемся в выбранном канале и предложим конкретное решение, как увеличить продажи.</p>
              <div class="ai-trust-row">
                <span><i class="fa-solid fa-clock"></i> Ответ в течение рабочего дня</span>
                <span><i class="fa-solid fa-lock"></i> Без спама и звонков-роботов</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const steps = root.querySelectorAll('.ai-step');
    const dots = root.querySelectorAll('.ai-progress .dot');
    const show = key => steps.forEach(s => s.classList.toggle('active', s.dataset.s == key));
    const setDots = n => dots.forEach((d, i) => d.classList.toggle('done', i <= n));

    // выбор опций
    root.querySelectorAll('.ai-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            btn.closest('.ai-options').querySelectorAll('.ai-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state[key] = btn.dataset.v;
            state[key + 'T'] = btn.dataset.t;
            btn.closest('.ai-step').querySelector('.ai-next').disabled = false;
        });
    });

    root.querySelectorAll('.ai-back').forEach(b => b.addEventListener('click', () => {
        state.step = Math.max(0, state.step - 1); show(state.step); setDots(state.step);
    }));

    root.querySelectorAll('.ai-step[data-s] .ai-next').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = btn.closest('.ai-step').dataset.s;
            if (s === '0') { state.step = 1; show(1); setDots(1); }
            else if (s === '1') { state.step = 2; show(2); setDots(2); }
            else if (s === '2') {
                state.text = root.querySelector('.ai-textarea').value.trim();
                runAnalysis();
            }
        });
    });

    async function runAnalysis() {
        show('analyzing'); setDots(2);
        const typed = root.querySelector('.ai-analyzing .typed');
        const lines = ["Читаю ваши ответы…", "Отправляю контекст в нейросеть…", "Собираю персональные гипотезы…", "Формирую разбор…"];
        let i = 0; typed.textContent = lines[0];
        const tmr = setInterval(() => { i++; if (lines[i]) typed.textContent = lines[i]; }, 700);
        const startedAt = Date.now();
        const aiResult = await requestOpenRouterAnalysis();
        const left = Math.max(0, 2200 - (Date.now() - startedAt));
        setTimeout(() => { clearInterval(tmr); renderResult(aiResult); }, left);
    }

    async function requestOpenRouterAnalysis() {
        const fallback = AI_ANALYSIS[state.pain] || AI_ANALYSIS.other;
        try {
            const response = await fetch('/api/ai-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: ctx,
                    niche: state.nicheT,
                    pain: state.painT,
                    message: state.text
                })
            });
            if (!response.ok) throw new Error(`OpenRouter endpoint error: ${response.status}`);
            const data = await response.json();
            if (!data || !data.d || !Array.isArray(data.fix) || !Array.isArray(data.eff)) throw new Error('Bad AI response shape');
            return {
                d: data.d,
                fix: data.fix.slice(0, 4),
                eff: data.eff.slice(0, 2),
                source: 'openrouter'
            };
        } catch (error) {
            console.warn('[TSUKANOV AI fallback]', error);
            return { ...fallback, source: 'fallback' };
        }
    }

    function renderResult(analysis) {
        const a = analysis || AI_ANALYSIS[state.pain] || AI_ANALYSIS.other;
        const res = root.querySelector('.ai-step[data-s="result"]');
        res.innerHTML = `
          <div class="ai-result-head"><div class="ok"><i class="fa-solid fa-wand-magic-sparkles"></i></div><b>Ваш экспресс-разбор готов</b></div>
          <div class="ai-analysis-card">
            <div class="a-tag"><i class="fa-solid fa-microchip"></i> ${a.source === 'openrouter' ? 'OpenRouter AI-анализ' : 'AI-анализ'} · ${esc(state.nicheT || 'ваша ниша')} · ${esc(state.painT || '')}</div>
            <h5>Что происходит</h5>
            <p>${esc(a.d)}</p>
            <h5>Что предлагаем сделать</h5>
            <ul>${a.fix.map(f => `<li><i class="fa-solid fa-circle-check"></i> ${esc(f)}</li>`).join('')}</ul>
            <div class="est">
              <div><b>${esc(a.eff[0])}</b><span>${esc(a.eff[1])}</span></div>
              <div><b>Бесплатно</b><span>консультация и план</span></div>
            </div>
          </div>
          <div class="ai-lead">
            <h5>Получить персональное решение</h5>
            <p class="sub">Оставьте контакт — менеджер пришлёт пошаговый план под вашу задачу. Без обязательств.</p>
            <div class="ai-lead-row">
              <div class="ai-field"><label>Как к вам обращаться</label><input type="text" id="ai-name" placeholder="Имя"></div>
              <div class="ai-field"><label>Телефон или ник для связи</label><input type="text" id="ai-contact" placeholder="+7 ___ или @username"></div>
              <div class="ai-field"><label>Удобный канал связи</label>
                <div class="ai-channels">
                  <div class="ai-channel tg selected" data-ch="tg"><i class="fa-brands fa-telegram"></i> Telegram</div>
                  <div class="ai-channel wa" data-ch="wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</div>
                  <div class="ai-channel ph" data-ch="ph"><i class="fa-solid fa-phone"></i> Звонок</div>
                </div>
              </div>
            </div>
            <button class="ai-submit"><i class="fa-solid fa-paper-plane"></i> Отправить заявку менеджеру</button>
            <div class="ai-or">или напишите напрямую сейчас</div>
            <div class="ai-direct">
              <a class="tg" href="${TSUKANOV.telegram}" target="_blank"><i class="fa-brands fa-telegram"></i> Telegram</a>
              <a class="wa" href="https://wa.me/${TSUKANOV.whatsappNumber}" target="_blank"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
            </div>
          </div>`;
        show('result');

        res.querySelectorAll('.ai-channel').forEach(ch => ch.addEventListener('click', () => {
            res.querySelectorAll('.ai-channel').forEach(c => c.classList.remove('selected'));
            ch.classList.add('selected'); state.channel = ch.dataset.ch;
        }));
        res.querySelector('.ai-submit').addEventListener('click', () => submitLead(res));
    }

    function submitLead(res) {
        state.name = res.querySelector('#ai-name').value.trim();
        state.contact = res.querySelector('#ai-contact').value.trim();
        if (!state.contact) {
            const inp = res.querySelector('#ai-contact');
            inp.focus(); inp.style.borderColor = '#c0392b';
            inp.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.15)';
            return;
        }
        const payload = {
            context: ctx, niche: state.nicheT, pain: state.painT,
            message: state.text, name: state.name, contact: state.contact,
            channel: state.channel, page: location.pathname, ts: new Date().toISOString()
        };
        // Точка интеграции бэкенда (вы дорабатываете сами):
        try { if (typeof window.TSUKANOV_SUBMIT_LEAD === 'function') window.TSUKANOV_SUBMIT_LEAD(payload); } catch (e) {}
        console.log('[TSUKANOV lead]', payload);

        // Чтобы заявка дошла уже сейчас — дублируем менеджеру с готовым текстом
        const summary =
            `Заявка с сайта (AI-разбор)%0A` +
            `Раздел: ${enc(ctx)}%0A` +
            `Ниша: ${enc(state.nicheT)}%0A` +
            `Боль: ${enc(state.painT)}%0A` +
            (state.text ? `Комментарий: ${enc(state.text)}%0A` : '') +
            `Имя: ${enc(state.name || '—')}%0A` +
            `Контакт: ${enc(state.contact)}%0A` +
            `Канал: ${enc(channelName(state.channel))}`;
        if (state.channel === 'wa') {
            window.open(`https://wa.me/${TSUKANOV.whatsappNumber}?text=${summary}`, '_blank');
        } else {
            window.open(TSUKANOV.telegram, '_blank');
        }
        show('success'); setDots(2);
    }

    function channelName(c){ return c==='wa'?'WhatsApp':c==='ph'?'Звонок':'Telegram'; }
    function enc(s){ return encodeURIComponent(s || ''); }
    function esc(s) {
        return String(s || '').replace(/[&<>'"]/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
    }
}

/* ==========================================================================
   5. Статьи (модалка)
   ========================================================================== */
const articlesData = {
    'article-1': { tag: 'Аналитика', title: 'Почему автосалоны теряют 60% заявок из-за сайтов?', content: `
        <p>Премиальный сегмент не терпит визуального шума и сложной навигации. Если клиент собирается отдать несколько миллионов за автомобиль или сотни тысяч за детейлинг, он ожидает соответствующего уровня сервиса ещё до звонка.</p>
        <div class="author-comment"><p>«Сайт — это ваша первая клиентская зона. Если там наливают растворимый кофе, до дивана никто не дойдёт.»</p>
        <div class="author-comment-meta"><img src="/static/img/tsukanov.jpg" alt="Максим Цуканов"><div class="author-meta-text"><span class="author-name">Максим Цуканов</span><span class="author-role">Основатель агентства</span></div></div></div>
        <h3>Главные ошибки классических сайтов:</h3>
        <ul><li><strong>Долгий ответ.</strong> Клиент ждёт звонка менеджера. В 2026 это недопустимо.</li><li><strong>Перегруз интерфейса.</strong> Всплывающие окна и рулетки скидок отпугивают платёжеспособную аудиторию.</li><li><strong>Шаблонность.</strong> Конструкторы лишают бренд индивидуальности.</li></ul>
        <button onclick="closeArticle(); openContactModal();" class="btn btn-primary" style="margin-top:20px;">Обсудить внедрение системы</button>` },
    'article-2': { tag: 'Стратегия', title: 'Как дизайн позволяет поднять средний чек x2', content: `
        <p>Цена — это всегда вопрос восприятия. Почему за полировку в одном гараже платят 10 000 ₽, а в премиум-студии — 100 000 ₽? Разница в упаковке и эмоциях.</p>
        <div class="author-comment"><p>«Люди покупают уверенность в том, что их не подведут, и статус. Правильный дизайн транслирует это до того, как менеджер скажет первое слово.»</p>
        <div class="author-comment-meta"><img src="/static/img/tsukanov.jpg" alt="Максим Цуканов"><div class="author-meta-text"><span class="author-name">Максим Цуканов</span><span class="author-role">Основатель агентства</span></div></div></div>
        <h3>Как мы это реализуем:</h3>
        <ul><li><strong>Отказ от стоковых фото.</strong> Только реальный процесс.</li><li><strong>Минимализм.</strong> Воздух в дизайне кричит о статусе.</li><li><strong>Премиальная палитра.</strong> Ассоциации с Apple, Mercedes, Aesop.</li></ul>` },
    'article-3': { tag: 'Vision 2026', title: 'Тренды автоматизации: Интерактивный Web', content: `
        <p>Эпоха статичных сайтов-визиток закончилась. Сегодня сайт — это полноценное ПО, работающее в браузере.</p>
        <div class="author-comment"><p>«Если ваш сайт просто показывает картинки и просит телефон — вы используете 5% потенциала. Современный Web интегрируется в CRM, склады, отзывы и оплаты.»</p>
        <div class="author-comment-meta"><img src="/static/img/tsukanov.jpg" alt="Максим Цуканов"><div class="author-meta-text"><span class="author-name">Максим Цуканов</span><span class="author-role">Основатель агентства</span></div></div></div>
        <h3>Что работает сегодня:</h3>
        <ul><li><strong>Мгновенная синхронизация</strong> сайта, базы и Telegram-бота.</li><li><strong>Glassmorphism и Ambient Light.</strong> Эффект осязаемости интерфейса.</li><li><strong>Личные кабинеты</strong> со статусами заказов и отзывами на Карты.</li></ul>
        <button onclick="closeArticle(); openContactModal();" class="btn btn-primary" style="margin-top:20px;">Построить экосистему</button>` }
};
function openArticle(id) {
    const data = articlesData[id]; if (!data) return;
    const modal = document.getElementById('articleModal');
    const content = document.getElementById('articleBodyContent');
    if (modal && content) {
        content.innerHTML = `<div class="ui-badge accent" style="margin-bottom:20px;">${data.tag}</div><h2>${data.title}</h2>${data.content}`;
        modal.classList.add('active'); document.body.style.overflow = 'hidden';
    }
}
function closeArticle() {
    const modal = document.getElementById('articleModal');
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}
