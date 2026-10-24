#!/usr/bin/env python3
"""Snapshot the publicly linked informational pages of altaybio.ru.

Run: python -m pip install requests beautifulsoup4
     python scripts/crawl_source.py
HTTP is intentional: the source's HTTPS endpoint returns an upstream error.
No script from the remote site is executed. Joomla email cloaks are decoded as text.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, html, json, re, threading, time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, urlencode, unquote
import requests
from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://altaybio.ru'
MAX_PAGES = 5000
WORKERS = 4
HEADERS = {'User-Agent': 'AltayBio-redesign-content-migration/1.0 (+public-information-snapshot)'}
MAIN = ['about','members','actions','anonce','contacts']
SKIP = re.compile(r'(?:administrator|logout|login|registration|password|reset|remind|search|task=|format=|print=|feed|tmpl=|mailto:|tel:)', re.I)
FILE_EXT = re.compile(r'\.(?:jpe?g|png|gif|webp|svg|pdf|docx?|xlsx?|zip|rar|pptx?|mp[34]|avi|ico|css|js|txt)$',re.I)
lock = threading.Lock()
asset_results = {}
asset_errors = []

def canonical(url, base=BASE):
    full=urljoin(base, html.unescape(url))
    p=urlsplit(full)
    if p.hostname not in ('altaybio.ru','www.altaybio.ru'): return None
    path=p.path.rstrip('/') or '/'
    if path=='/index.php': path='/'
    query=urlencode(sorted((k,v) for k,v in parse_qsl(p.query) if k in ('start','limitstart')))
    if SKIP.search(full) or FILE_EXT.search(path): return None
    if path!='/' and not path.startswith('/index.php/'): return None
    return urlunsplit(('http','altaybio.ru',path,query,''))

def fetch(url):
    failure=None
    for attempt in range(3):
        try:
            response=requests.get(url,headers=HEADERS,timeout=(10,35))
            if response.status_code>=500 and attempt<2:
                time.sleep(0.5*(attempt+1));continue
            response.raise_for_status()
            response.encoding='utf-8'
            return response.text
        except Exception as exc:
            failure=str(exc)
            if attempt<2: time.sleep(0.5*(attempt+1))
    raise RuntimeError(failure)

def decode_emails(soup):
    for script in list(soup.find_all('script')):
        code=script.string or script.get_text()
        # Entity literals contain semicolons; consume quoted strings instead of
        # stopping at the first semicolon inside an encoded address.
        m=re.search(r"var addy_text(\w+)\s*=\s*((?:'[^']*'\s*\+?\s*)+);",code)
        if not m: continue
        # Only concatenate quoted literals; never eval source JavaScript.
        address=''.join(re.findall(r"'([^']*)'",m.group(2)))
        address=html.unescape(address)
        if '@' in address:
            span=soup.find(id='cloak'+m.group(1))
            if span:
                a=soup.new_tag('a',href='mailto:'+address);a.string=address
                span.replace_with(a)

def parse_page(url,markup,member_urls):
    soup=BeautifulSoup(markup,'html.parser')
    main=soup.select_one('main#content') or soup.select_one('main')
    if not main: return None,[]
    title=(soup.select_one('.item-page .page-header h2') or main.select_one('h1,h2'))
    title=title.get_text(' ',strip=True) if title else (soup.title.get_text(' ',strip=True) if soup.title else '')
    path=urlsplit(url).path
    listing=not bool(main.select_one('.item-page'))
    if path=='/':
        title='Главная страница исходного сайта'
        listing=False
    category=('about' if path.endswith('/about') else 'members' if path.endswith('/members') else 'contacts' if path.endswith('/contacts') else 'news' if '/actions' in path else 'announcements' if '/anonce' in path else 'member' if url in member_urls else 'other')
    if category=='news' and listing: title='Новости'
    if category=='announcements' and listing: title='Анонсы'
    # The homepage's lead image lives in a Joomla module before articleBody.
    body=main if path=='/' else (main.select_one('[itemprop="articleBody"]') or main)
    found=[]
    for a in soup.select('a[href]'):
        target=canonical(a['href'],url)
        if target: found.append(target)
    decode_emails(body)
    for node in list(body.find_all(string=lambda x:isinstance(x,Comment))): node.extract()
    for node in list(body.select('script,style,iframe,form,button,input,select,.pagination,.pager,.article-info,#system-message-container')): node.decompose()
    for tag in body.find_all(True):
        for attr in list(tag.attrs):
            if attr.startswith('on') or attr in ('style','class','id','width','height','border','cellspacing','cellpadding','align','valign','rel','itemprop','itemscope','itemtype'): del tag.attrs[attr]
        if tag.name in ('object','embed'): tag.decompose()
    images=[]
    for img in body.select('img[src]'):
        original=urljoin(url,img['src'])
        if urlsplit(original).hostname in ('altaybio.ru','www.altaybio.ru'): original=original.replace('https://','http://',1)
        img['src']=original
        img['loading']='lazy'
        images.append({'src':original,'original':original,'alt':img.get('alt','')})
    links=[]
    for a in body.select('a[href]'):
        href=urljoin(url,a['href'])
        if href.startswith(('javascript:','data:')): del a['href'];continue
        a['href']=href
        links.append({'text':a.get_text(' ',strip=True),'url':href})
    text=body.get_text('\n',strip=True)
    text=re.sub(r'\n{3,}','\n\n',text)
    slug=path.split('/')[-1] or 'home'
    id_=hashlib.sha256(url.encode()).hexdigest()[:12]
    # Numeric Joomla content IDs retain original editorial order where dates aren't published.
    n=re.match(r'^(\d+)-',slug)
    date=None
    for t in main.select('time[datetime]'):
        date=t['datetime'];break
    return {'id':id_,'slug':slug,'url':url,'title':title,'category':category,'is_listing':listing,'source_id':int(n.group(1)) if n else None,'date':date,'content_html':body.decode_contents(),'text':text,'excerpt':re.sub(r'\s+',' ',text)[:240],'images':images,'links':links},found

def download_asset(url):
    p=urlsplit(url)
    if p.hostname not in ('altaybio.ru','www.altaybio.ru'): return None
    ext=Path(unquote(p.path)).suffix.lower() or '.bin'
    basename=re.sub(r'[^a-zA-Z0-9._-]','_',Path(unquote(p.path)).stem)[:60] or 'asset'
    name=f'{basename}-{hashlib.sha256(url.encode()).hexdigest()[:10]}{ext}'
    dest=ROOT/'dist/assets/source'/name
    local='/assets/source/'+name
    try:
        if not dest.exists():
            response=requests.get(url,headers=HEADERS,timeout=(10,45));response.raise_for_status()
            dest.write_bytes(response.content)
        return url,local,dest.stat().st_size
    except Exception as exc:
        return url,None,str(exc)

def run():
    parser=argparse.ArgumentParser();parser.add_argument('--max-pages',type=int,default=MAX_PAGES)
    args=parser.parse_args()
    for rel in ('research/raw','dist/data','dist/assets/source'): (ROOT/rel).mkdir(parents=True,exist_ok=True)
    start=datetime.now(timezone.utc).isoformat()
    queue=deque([BASE+'/']+[BASE+'/index.php/'+x for x in MAIN]);seen=set();pages=[];errors=[];excluded=set();member_urls=set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        while queue and len(seen)<args.max_pages:
            batch=[]
            while queue and len(batch)<WORKERS and len(seen)<args.max_pages:
                url=queue.popleft()
                if url in seen:continue
                seen.add(url);batch.append(url)
            futures={executor.submit(fetch,u):u for u in batch}
            results=[]
            for future in concurrent.futures.as_completed(futures):
                url=futures[future]
                try: results.append((url,future.result()))
                except Exception as exc: errors.append({'url':url,'error':str(exc)})
            # Parse members first so their targets classify consistently.
            results.sort(key=lambda x:0 if x[0].endswith('/members') else 1)
            for url,markup in results:
                key=hashlib.sha256(url.encode()).hexdigest()[:12]
                (ROOT/'research/raw'/f'{key}.html').write_text(markup,encoding='utf-8')
                if url.endswith('/members'):
                    m=BeautifulSoup(markup,'html.parser').select_one('[itemprop="articleBody"]')
                    if m:
                        member_urls.update(filter(None,(canonical(a.get('href',''),url) for a in m.select('a[href]'))))
                page,found=parse_page(url,markup,member_urls)
                if page: pages.append(page)
                else:errors.append({'url':url,'error':'No main content element'})
                for target in found:
                    if target not in seen:queue.append(target)
            print(f'Pages fetched: {len(pages)}, queue: {len(set(queue)-seen)}, failures: {len(errors)}',flush=True)
            time.sleep(.12)
        for page in pages:
            if page['url'] in member_urls:page['category']='member'
        urls=set()
        for page in pages:
            urls.update(i['original'] for i in page['images'])
            urls.update(l['url'] for l in page['links'] if FILE_EXT.search(urlsplit(l['url']).path))
        # Include original site identity asset and full-size certificate links.
        urls.add(BASE+'/images/tmpl/logo.png')
        for i,result in enumerate(executor.map(download_asset,sorted(urls))):
            if not result:continue
            url,local,detail=result
            if local:asset_results[url]={'local':local,'bytes':detail}
            else:asset_errors.append({'url':url,'error':detail})
            if i%20==0:print(f'Assets processed: {i+1}/{len(urls)}',flush=True)
    for page in pages:
        for original,asset in asset_results.items():page['content_html']=page['content_html'].replace(html.escape(original,quote=True),asset['local']).replace(original,asset['local'])
        for img in page['images']:
            if img['original'] in asset_results:img['src']=asset_results[img['original']]['local']
    pages.sort(key=lambda p:(p['category'],not bool(p['source_id']),-(p['source_id'] or 0),p['url']))
    articles=[p for p in pages if not p['is_listing']]
    report={'source':BASE,'started_at':start,'completed_at':datetime.now(timezone.utc).isoformat(),'page_count':len(pages),'article_count':len(articles),'member_count':sum(p['category']=='member' for p in pages),'news_count':sum(p['category']=='news' and not p['is_listing'] for p in pages),'announcement_count':sum(p['category']=='announcements' and not p['is_listing'] for p in pages),'asset_count':len(asset_results),'asset_bytes':sum(a['bytes'] for a in asset_results.values()),'errors':errors,'asset_errors':asset_errors,'remaining_urls':sorted(set(queue)-seen),'coverage':'All publicly linked informational pages from the homepage and five main sections, including pagination. No admin/auth/search/feed/print pages.','excluded_patterns':SKIP.pattern,'max_pages':args.max_pages,'workers':WORKERS,'date_note':'Dates remain null where the source does not publish a machine-readable publication date; no dates were invented.'}
    data={'metadata':{k:v for k,v in report.items() if k not in ('errors','asset_errors')},'pages':pages,'members':[p['id'] for p in pages if p['category']=='member'],'news':[p['id'] for p in pages if p['category']=='news' and not p['is_listing']],'announcements':[p['id'] for p in pages if p['category']=='announcements' and not p['is_listing']]}
    (ROOT/'dist/data/source.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    report_json=json.dumps(report,ensure_ascii=False,indent=2)
    (ROOT/'research/crawl-report.json').write_text(report_json,encoding='utf-8')
    (ROOT/'dist/data/crawl-report.json').write_text(report_json,encoding='utf-8')
    (ROOT/'research/asset-manifest.json').write_text(json.dumps(asset_results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)

if __name__=='__main__':run()
