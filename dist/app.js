'use strict';
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = {about:'О кластере',members:'Участники',member:'Участник кластера',news:'Новости',announcements:'Анонсы',contacts:'Контакты',other:'Материалы'};
const mountain = '<svg viewBox="0 0 100 70" aria-hidden="true"><path d="m5 55 30-45 25 36 12-21 25 30H5Zm20-30 10 9 10-9M8 65h84" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
function decorateArrows(root=document.body){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;
 while(node=walker.nextNode())if(node.nodeValue.includes('↗')&&!['SCRIPT','STYLE'].includes(node.parentElement?.tagName))nodes.push(node);
 nodes.forEach(n=>{const f=document.createDocumentFragment();n.nodeValue.split('↗').forEach((text,i)=>{if(i){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','arrow-icon');s.setAttribute('aria-hidden','true');s.innerHTML='<path d="M5 19 19 5M5 5h14v14"/>';f.append(s)}f.append(document.createTextNode(text))});n.replaceWith(f)});
}
const icons = [
 '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M19 4h12M22 4v15L9 39a4 4 0 0 0 3 6h26a4 4 0 0 0 3-6L28 19V4M16 30h18M17 38h.1M28 35h.1M32 40h.1"/></svg>',
 '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M15 5c0 20 20 20 20 40M35 5c0 20-20 20-20 40M16 9h18M20 17h10M21 33h9M16 41h18M15 25h20"/></svg>',
 '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M25 45V23M25 32C7 33 6 17 8 10c16 0 21 11 17 22Zm0-8C24 8 37 4 44 5c0 14-8 21-19 19ZM13 17l12 15M25 24l12-12"/></svg>',
 '<svg viewBox="0 0 50 50" aria-hidden="true"><rect x="6" y="10" width="38" height="29" rx="2"/><path d="M17 45h16M25 39v6M11 25h8l4-9 5 18 4-9h7"/></svg>'
];
let data, pages=[], byId, byUrl, memberPages=[], newsPages=[], announcementPages=[], contentPages=[];
let listState={page:1,q:'',category:'all'}, activeView='', lastRoute='';
function normalURL(u){try{const x=new URL(u,'http://altaybio.ru');x.protocol='http:';x.hostname=x.hostname.replace(/^www\./,'');x.hash='';return x.href.replace(/\/$/,'');}catch{return u}}
function articleURL(p){return '#/article/'+p.id}
function firstImage(p){return p.images?.find(i=>/\.(png|jpe?g|webp)(\?|$)/i.test(typeof i==='string'?i:i.src||i.original||''))}
function imgSrc(i){return typeof i==='string'?i:i?.src||''}
function pageDate(p){
 if(!p.date)return '';
 const date=new Date(p.date);
 return Number.isNaN(date.valueOf())?escapeHTML(p.date):date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'});
}
function sortRecent(arr){return [...arr].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.source_id||0)-(a.source_id||0));}
function card(p){const im=firstImage(p);return `<article class="news-card"><a class="card-image" style="display:block" href="${articleURL(p)}" tabindex="-1" aria-hidden="true">${im?`<img src="${escapeHTML(imgSrc(im))}" alt="" loading="lazy">`:`<div class="card-placeholder">${mountain}</div>`}</a><div class="card-meta"><span class="category">${categories[p.category]||'Материал'}</span>${p.date?`<time>${pageDate(p)}</time>`:''}</div><h3><a href="${articleURL(p)}">${escapeHTML(p.title)}</a></h3><a class="card-bottom" href="${articleURL(p)}"><span>Читать материал</span><span aria-hidden="true">↗</span></a></article>`}
function breadcrumb(label){return `<div class="container breadcrumbs"><a href="#/">Главная</a><span>/</span><span>${escapeHTML(label)}</span></div>`}
function pageIntro(title,desc,eyebrow='АЛТАЙСКИЙ БИОФАРМАЦЕВТИЧЕСКИЙ КЛАСТЕР'){return `<div class="container page-intro"><div class="eyebrow">${escapeHTML(eyebrow)}</div><h1>${escapeHTML(title)}</h1>${desc?`<p>${escapeHTML(desc)}</p>`:''}</div>`}
function findPage(cat){return pages.find(p=>p.category===cat && !p.is_listing)}
function home(){
 const about=findPage('about');
 const memberBrands=[['Эвалар','Наука о здоровье','эвалар'],['Алтайвитамины','Фармацевтическое производство','алтайвитамин'],['Вистерра','Природа и биотехнологии','вистерра'],['ИПХЭТ СО РАН','Наука и исследования','ипхэт']];
 return `<section class="hero container"><div class="hero-intro"><div><div class="eyebrow">СОЗДАЁМ БУДУЩЕЕ ВМЕСТЕ С ПРИРОДОЙ</div><h1>Природа Алтая.<br><em>Технологии будущего.</em></h1></div><div class="hero-side"><p>Объединяем науку, производство и&nbsp;природный потенциал Алтая для&nbsp;развития биофармацевтики.</p><a class="text-link" href="#/members">Знакомьтесь с участниками <span>↗</span></a></div></div><div class="hero-visual"><img src="assets/nature/altai-valley.jpg" alt="Горная долина Алтая: река, хвойные леса и снежные вершины" fetchpriority="high"><span class="landscape-tag">АЛТАЙ — МЕСТО, ГДЕ РОЖДАЕТСЯ СИЛА</span><div class="hero-caption"><div><p>От богатства природы —<br>к новым возможностям.</p><small>Алтайский биофармацевтический кластер</small></div><a class="circle-link" href="#/altai" aria-label="Узнать о природном потенциале Алтая">↓</a></div></div><div class="facts"><div class="fact"><strong>4</strong><span>направления развития</span></div><div class="fact"><strong>${memberPages.length}</strong><span>участников в каталоге сайта</span></div><div class="fact"><strong>Бийск</strong><span>научный центр кластера</span></div><div class="fact"><strong>Алтай</strong><span>уникальное природное сырьё</span></div></div></section>
 <section class="section container" id="about"><div class="about-grid"><div class="section-label"><span class="num">01 /</span> О КЛАСТЕРЕ</div><div class="about-copy"><h2 class="section-heading">В основе — природа.<br>В развитии — наука.</h2><p class="highlight">От фундаментальных исследований<br class="wide-only"> до серийного производства.</p><p>Алтайский биофармацевтический кластер объединяет производственные, научные и образовательные организации. Совместная работа помогает выстраивать всю технологическую цепочку создания новых продуктов.</p><p>Наши точки опоры — природное сырьё Алтая, знания в сфере фармацевтики и научный потенциал Бийска, где расположены основные предприятия кластера.</p>${about?`<a class="text-link" href="${articleURL(about)}">Подробнее о кластере <span>↗</span></a>`:''}</div></div></section>
 <section class="direction-section" id="directions"><div class="container"><div class="section-top"><div><div class="section-label"><span class="num">02 /</span> НАПРАВЛЕНИЯ</div><h2 class="section-heading">Четыре направления.<br>Одна общая цель.</h2></div><p>Развиваем технологии и создаём продукты на стыке науки, природы и современного производства.</p></div><div class="directions">${[['Химическая<br>фармацевтика','Лекарственные субстанции и готовые лекарственные формы.'],['Био&shy;фарма&shy;цевтика','Биотехнологии и разработка современных препаратов.'],['Функциональное<br>питание','Продукты питания с заданными полезными свойствами.'],['Медицинская<br>техника','Разработка и производство оборудования для медицины.']].map((a,i)=>`<div class="direction"><div class="direction-top">${icons[i]}<span>0${i+1}</span></div><h3>${a[0]}</h3><p>${a[1]}</p></div>`).join('')}</div></div></section>
 <section class="altai-section container" id="altai"><div class="altai-grid"><div class="altai-image"><img src="assets/nature/altai-lake.jpg" alt="Озеро среди хвойных лесов и гор Алтая" loading="lazy"><span class="landscape-tag">ПРИРОДНЫЙ ПОТЕНЦИАЛ АЛТАЯ</span></div><div class="altai-content"><div class="eyebrow">МЕСТО СИЛЫ</div><h2>Алтай вдохновляет.<br>Наука открывает.</h2><p>Горные ландшафты, хвойные леса и богатый растительный мир формируют узнаваемый образ Алтая. Для кластера природный потенциал региона — ещё и основа для исследований и работы с уникальным сырьём.</p><p>В Бийске этот потенциал встречается с научной школой и производственными технологиями. Так рождается связь между природой региона и развитием биофармацевтики.</p><div class="altai-rule">${mountain}<span>Бережное отношение к истокам.<br>Открытый взгляд в будущее.</span></div></div></div></section>
 <section class="members-section container"><div class="section-top"><div><div class="section-label"><span class="num">03 /</span> УЧАСТНИКИ КЛАСТЕРА</div><h2 class="section-heading">Сильнее вместе.</h2></div><a class="text-link" href="#/members">Все участники <span>↗</span></a></div><div class="member-strip">${memberBrands.map(([name,sub,key])=>{const p=memberPages.find(p=>(p.title+' '+p.text).toLowerCase().includes(key));return `<a class="member-brand" href="${p?articleURL(p):'#/members'}"><strong>${name}</strong><small>${sub}</small></a>`}).join('')}</div></section>
 <section class="news-section"><div class="container"><div class="section-top"><div><div class="section-label"><span class="num">04 /</span> СОБЫТИЯ И НОВОСТИ</div><h2 class="section-heading">Жизнь кластера.</h2></div><a class="text-link" href="#/news">Все новости <span>↗</span></a></div><div class="news-grid">${newsPages.slice(0,3).map(card).join('')}</div></div></section>
 <section class="cta container"><div class="cta-inner"><div><h2>Возможности начинаются<br>с диалога.</h2><p>Узнайте больше о кластере и возможностях взаимодействия.</p></div><a class="button button-dark" href="#/contacts">Связаться с кластером <span>↗</span></a></div></section>`;
}
function toolbar(kind){return `<div class="archive-toolbar"><label class="search-field"><span class="sr-only">Поиск по материалам</span><input id="list-query" type="search" placeholder="${kind==='members'?'Найти участника…':'Поиск по материалам…'}" value="${escapeHTML(listState.q)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg></label>${kind==='archive'?`<label class="select-wrap"><span class="sr-only">Раздел</span><select id="list-category">${[['all','Все разделы'],['news','Новости'],['announcements','Анонсы'],['member','Участники'],['about','О кластере'],['contacts','Контакты'],['other','Другие материалы']].map(([v,n])=>`<option value="${v}" ${listState.category===v?'selected':''}>${n}</option>`).join('')}</select></label>`:''}</div>`}
function listing(kind){
 const titles={members:['Участники кластера','Производство, исследования и образование. Организации, представленные в каталоге исходного сайта.'],news:['Новости кластера','События, проекты и достижения. Архив новостей Алтайского биофармацевтического кластера.'],announcements:['Анонсы и мероприятия','Конференции, встречи и возможности для профессионального сообщества. Архив анонсов.'],archive:['Архив материалов','Все перенесённые материалы исходного сайта: поиск по заголовкам и полным текстам.']};
 const [title,desc]=titles[kind];
 const memberSource=findPage('members');
 return breadcrumb(title)+pageIntro(title,desc)+`<section class="container archive-section">${kind==='members'&&memberSource?`<p><a class="text-link" href="${articleURL(memberSource)}">Об участии в партнёрстве <span>↗</span></a></p>`:''}${toolbar(kind)}<div id="list-results" aria-live="polite"></div></section>`;
}
function normalized(s){return String(s||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е')}
function matches(p,q){return normalized(p.title+' '+p.text).includes(normalized(q))}
function filteredItems(){let arr=activeView==='members'?memberPages:activeView==='news'?newsPages:activeView==='announcements'?announcementPages:contentPages;return arr.filter(p=>(!listState.q||matches(p,listState.q))&&(activeView!=='archive'||listState.category==='all'||p.category===listState.category));}
function memberCard(p,i){return `<a class="member-card" href="${articleURL(p)}"><div class="member-card-top"><span>${String(i+1).padStart(2,'0')}</span><span aria-hidden="true">↗</span></div><div><h2>${escapeHTML(p.title)}</h2><div class="member-type">Участник Алтайского биофармацевтического кластера</div></div></a>`}
function updateResults(){
 const list=filteredItems(), count=list.length, perPage=activeView==='members'?30:12, max=Math.max(1,Math.ceil(count/perPage));listState.page=Math.min(listState.page,max);const start=(listState.page-1)*perPage;
 $('#list-results').innerHTML=`<div class="result-count">Найдено материалов: ${count}${count?` · Показаны ${start+1}–${Math.min(start+perPage,count)}`:''}</div><div class="${activeView==='members'?'member-grid':'archive-grid'}">${list.slice(start,start+perPage).map((p,i)=>activeView==='members'?memberCard(p,start+i):card(p)).join('')||'<div class="empty"><h2>Ничего не найдено</h2><p>Попробуйте изменить запрос или выбрать другой раздел.</p></div>'}</div>${max>1?pagination(max):''}`;
 decorateArrows($('#list-results'));
 $$('[data-page]').forEach(b=>b.addEventListener('click',()=>{listState.page=Number(b.dataset.page);updateResults();$('#list-query').scrollIntoView({behavior:'smooth',block:'start'})}));
}
function pagination(max){let nums=[1,...Array.from({length:max},(_,i)=>i+1).filter(i=>Math.abs(i-listState.page)<=1),max];nums=[...new Set(nums)].sort((a,b)=>a-b);return `<nav class="pagination" aria-label="Страницы материалов"><button data-page="${listState.page-1}" ${listState.page===1?'disabled':''} aria-label="Предыдущая страница">←</button>${nums.map((n,i)=>`${i&&n-nums[i-1]>1?'<span>…</span>':''}<button data-page="${n}" ${n===listState.page?'aria-current="page"':''}>${n}</button>`).join('')}<button data-page="${listState.page+1}" ${listState.page===max?'disabled':''} aria-label="Следующая страница">→</button></nav>`}
function cleanContent(html){
 const template=document.createElement('template');template.innerHTML=html||'';
 $$('script,style,iframe,object,embed,form,input,button,link,meta',template.content).forEach(n=>n.remove());
 $$('*',template.content).forEach(n=>{[...n.attributes].forEach(a=>{if(a.name.startsWith('on')||['style','class','id','width','height','align','bgcolor'].includes(a.name))n.removeAttribute(a.name)});});
 $$('a',template.content).forEach(a=>{
  const raw=a.getAttribute('href')||'';
  if(/^javascript:/i.test(raw)){a.removeAttribute('href');return}
  if(raw.startsWith('assets/')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('#'))return;
  const url=normalURL(raw),p=byUrl.get(url);if(p){a.href=p.category==='members'?'#/members':p.category==='contacts'?'#/contacts':p.is_listing?(p.category==='news'?'#/news':'#/announcements'):articleURL(p);return}
  if(/^https?:/i.test(raw)){a.target='_blank';a.rel='noopener noreferrer'}
 });
 return template.innerHTML;
}
function article(p){
 const cat=categories[p.category]||'Материал', back={news:'news',announcements:'announcements',member:'members',about:'',contacts:'contacts'}[p.category]??'archive';
 return `<div class="container breadcrumbs"><a href="#/">Главная</a><span>/</span><a href="#/${back}">${cat}</a><span>/</span><span>Материал</span></div>`+pageIntro(p.title,'',cat)+`<div class="container article-layout"><article class="article-body">${cleanContent(p.content_html)}</article><aside class="article-aside"><div class="eyebrow">${cat}</div>${p.date?`<p>Дата публикации<br><time>${pageDate(p)}</time></p>`:''}<p>Материал перенесён с сайта Алтайского биофармацевтического кластера. Сведения сохранены по первоисточнику.</p><a class="source-link" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">Открыть первоисточник <span>↗</span></a><a class="source-link" href="#/${back}">Назад в раздел <span>←</span></a><a class="source-link" href="#/archive">Все материалы <span>↗</span></a></aside></div>`;
}
function contacts(){const p=findPage('contacts');return breadcrumb('Контакты')+pageIntro('Будем на связи.','Вопросы о работе кластера, сотрудничестве и взаимодействии с участниками.')+`<div class="container contact-layout"><div><section class="contact-block"><h2>ЭЛЕКТРОННАЯ ПОЧТА</h2><a class="big-email" href="mailto:abfc2@yandex.ru">abfc2@yandex.ru ↗</a></section><section class="contact-block"><h2>ПОЧТОВЫЙ АДРЕС</h2><p>659322, Российская Федерация,<br>Алтайский край, г. Бийск, а/я 60</p></section><section class="contact-block"><h2>МЕСТОНАХОЖДЕНИЕ</h2><p>659302, Алтайский край, г. Бийск,<br>ул. Кутузова, 11/2, кв. 140<br>Белоусову Д. А.</p><a class="text-link" href="https://yandex.ru/maps/?text=${encodeURIComponent('Бийск Кутузова 11/2')}" target="_blank" rel="noopener noreferrer">Посмотреть на карте <span>↗</span></a></section><p class="contact-note">Контактные данные перенесены с исходного сайта.${p?` <a href="${articleURL(p)}" class="text-link">Полная контактная информация ↗</a>`:''}</p></div><div><section class="requisites"><h2>Реквизиты</h2><dl><dt>Полное наименование</dt><dd>Некоммерческое партнёрство «Алтайский биофармацевтический кластер»</dd><dt>Сокращённое наименование</dt><dd>НП «АБФК»</dd><dt>ИНН</dt><dd>2204039514</dd><dt>КПП</dt><dd>220401001</dd><dt>ОГРН</dt><dd>1082202001573</dd></dl></section></div></div>`}
function notFound(){return `<section class="container error-state"><div class="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</div><h1>Здесь пока тихо.</h1><p>Возможно, адрес изменился. Найдите нужный материал в архиве.</p><a class="button button-dark" href="#/archive">Открыть архив ↗</a></section>`}
function route(){
 const hash=location.hash||'#/';const [path,query='']=hash.replace(/^#/,'').split('?'), parts=path.split('/').filter(Boolean),view=parts[0]||'home';
 if(view==='altai'){if(activeView!=='home'){location.hash='#/';setTimeout(()=>$('#altai')?.scrollIntoView(),40)}else $('#altai')?.scrollIntoView();return}
 if(!data)return;
 activeView=view;
 const params=new URLSearchParams(query);
 if(['members','news','announcements','archive'].includes(view))listState={q:params.get('q')||'',category:params.get('category')||'all',page:1};
 let html='';let title='';
 if(view==='home'){html=home();title='Природа Алтая. Технологии будущего.'}
 else if(['members','news','announcements','archive'].includes(view)){html=listing(view);title={members:'Участники',news:'Новости',announcements:'Анонсы',archive:'Архив материалов'}[view]}
 else if(view==='article'&&byId.has(parts[1])){const p=byId.get(parts[1]);html=article(p);title=p.title}
 else if(view==='contacts'){html=contacts();title='Контакты'}else{html=notFound();title='Страница не найдена'}
 $('#main').innerHTML=html;
 decorateArrows($('#main'));
 document.title=title+' — АлтайБио';
 $$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===view||(view==='article'&&a.dataset.nav===({member:'members',news:'news',announcements:'announcements',contacts:'contacts',about:'home'}[byId.get(parts[1])?.category]))));
 if($('#list-query')){
  updateResults();let timeout;
  $('#list-query').addEventListener('input',e=>{clearTimeout(timeout);timeout=setTimeout(()=>{listState.q=e.target.value;listState.page=1;updateResults()},180)});
  $('#list-category')?.addEventListener('change',e=>{listState.category=e.target.value;listState.page=1;updateResults()});
 }
 $('#mobile-nav').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');
 if(lastRoute!==hash){window.scrollTo({top:0,behavior:'instant'});$('#main').setAttribute('tabindex','-1');if(lastRoute)$('#main').focus({preventScroll:true});}lastRoute=hash;
}
function setupDialogs(){
 $('#search-open').addEventListener('click',()=>{$('#search-dialog').showModal();setTimeout(()=>$('#global-query').focus(),50)});
 $$('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
 $('#global-search').addEventListener('submit',e=>{e.preventDefault();const q=$('#global-query').value.trim();$('#search-dialog').close();location.hash='#/archive?q='+encodeURIComponent(q)});
 $('#global-query').addEventListener('input',e=>{const q=e.target.value.trim();if(!data||q.length<2){$('#quick-results').innerHTML='';return}const list=contentPages.filter(p=>matches(p,q));$('#quick-results').innerHTML=list.slice(0,5).map(p=>`<a class="quick-result" href="${articleURL(p)}"><small>${categories[p.category]||'МАТЕРИАЛ'}</small>${escapeHTML(p.title)}</a>`).join('')||(q?'<p>Материалы не найдены.</p>':'');$$('a',$('#quick-results')).forEach(a=>a.addEventListener('click',()=>$('#search-dialog').close()))});
 $('#credits-open').addEventListener('click',async()=>{
  $('#credits-content').innerHTML=`<p>Содержимое перенесено с <a href="http://altaybio.ru/index.php/about" target="_blank" rel="noopener noreferrer">altaybio.ru</a>. Выполнен разовый обход всех найденных публичных информационных страниц. Архив отражает состояние источника на дату переноса и не обновляется автоматически. Служебные страницы, авторизация и дубли для печати не включены.</p><p>Страниц в обходе: ${data.metadata.page_count??pages.length}. Материалов без страниц пагинации: ${contentPages.length}. Дата переноса: ${escapeHTML(String(data.metadata.completed_at||'2026-10-24').slice(0,10))}.</p><p>Исторические сведения и состав участников сохранены по исходному сайту. Новый раздел об Алтае подготовлен для этой версии.</p><h3>Фотографии природы Алтая</h3><div id="photo-credits">Загружаем авторов…</div><p><a href="data/source.json" download>Скачать полный массив материалов (JSON)</a> · <a href="data/crawl-report.json" download>Отчёт об обходе</a></p>`;
  $('#credits-dialog').showModal();
  try{const attr=await fetch('assets/nature/attribution.json').then(r=>r.json());$('#photo-credits').innerHTML='<ul>'+attr.map(a=>`<li>${escapeHTML(a.author)} — <a href="${escapeHTML(a.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(a.title)}</a>. <a href="${escapeHTML(a.license_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(a.license)}</a>.</li>`).join('')+'</ul>'}catch{$('#photo-credits').textContent='Источники фотографий указаны в assets/nature/attribution.json.'}
 });
 $('#menu-toggle').addEventListener('click',()=>{const n=$('#mobile-nav');n.hidden=!n.hidden;$('#menu-toggle').setAttribute('aria-expanded',String(!n.hidden))});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();$('#search-dialog').showModal();$('#global-query').focus()}});
}
async function init(){
 setupDialogs();$('#year').textContent=new Date().getFullYear();
 decorateArrows();
 try{
  const r=await fetch('data/source.json');if(!r.ok)throw new Error('source unavailable');data=await r.json();pages=data.pages;
  byId=new Map(pages.map(p=>[String(p.id),p]));byUrl=new Map(pages.map(p=>[normalURL(p.url),p]));
  memberPages=pages.filter(p=>p.category==='member'&&!p.is_listing);
  newsPages=sortRecent(pages.filter(p=>p.category==='news'&&!p.is_listing));announcementPages=sortRecent(pages.filter(p=>p.category==='announcements'&&!p.is_listing));
  contentPages=pages.filter(p=>!p.is_listing);
  window.addEventListener('hashchange',route);route();
 }catch(e){$('#main').innerHTML=`<section class="container error-state"><h1>Не удалось загрузить материалы.</h1><p>Проверьте соединение и обновите страницу.</p><button class="button button-dark" onclick="location.reload()">Повторить загрузку ↻</button></section>`;console.error(e)}
}
init();
