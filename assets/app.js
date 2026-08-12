let STOCK=[],kind='all',visible=24,filtered=[],current=null,pickValue='';
const fmt=new Intl.NumberFormat('ru-RU');
const money=n=>n?fmt.format(n)+' ₽':'Цена по запросу';
const km=n=>n?fmt.format(n)+' км':'пробег не указан';
const kindName=k=>k==='tractor'?'Седельный тягач':'Самосвал';
const truckSVG=`<svg viewBox="0 0 96 96" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 25h45v39H14z"/><path d="M59 38h14l11 14v12H59z"/><circle cx="28" cy="69" r="8"/><circle cx="70" cy="69" r="8"/><path d="M36 69h26M73 38v14h11"/></svg>`;
const dumpSVG=`<svg viewBox="0 0 96 96" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 31h42l7 29H19z"/><path d="M61 42h12l11 12v10H61z"/><circle cx="29" cy="69" r="8"/><circle cx="70" cy="69" r="8"/><path d="M20 31l10-10h33l-9 10"/></svg>`;
function uniq(a){return[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),'ru'))}
function fill(id,a,label){document.getElementById(id).innerHTML=`<option value="">${label}</option>`+a.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('')}
async function init(){
  try{
    const urls=Array.from({length:4},(_,i)=>`./data/stock-part-${i+1}.txt`);
    const parts=await Promise.all(urls.map(async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('data');return(await r.text()).trim()}));
    const bin=Uint8Array.from(atob(parts.join('')),c=>c.charCodeAt(0));
    const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    const payload=JSON.parse(await new Response(stream).text());STOCK=payload.items||payload;
  }catch(e){console.error(e);document.getElementById('cards').innerHTML='<div class="empty"><b>Не удалось загрузить каталог.</b><br>Обновите страницу или позвоните нам.</div>';return}
  fill('brand',uniq(STOCK.map(x=>x.brand)),'Все марки');
  fill('year',uniq(STOCK.map(x=>x.year)).sort((a,b)=>b-a),'Любой');
  fill('wheel',uniq(STOCK.map(x=>x.wheel)),'Любая');
  fill('locFilter',uniq(STOCK.map(x=>x.location)),'Все локации');
  readQueryFilters();applyFilters();
  const lot=new URLSearchParams(location.search).get('lot');if(lot&&STOCK.some(x=>x.id===lot))openDetail(lot);
}
function readQueryFilters(){
 const p=new URLSearchParams(location.search);
 const k=p.get('kind');if(k==='tractor'||k==='dump'){kind=k;document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('active',b.dataset.kind===k))}
 const brandEl=document.getElementById('brand'),yearEl=document.getElementById('year'),priceEl=document.getElementById('price'),wheelEl=document.getElementById('wheel');
 const b=p.get('brand');if(b&&[...brandEl.options].some(o=>o.value===b))brandEl.value=b;
 const y=p.get('year');if(y&&[...yearEl.options].some(o=>o.value===y))yearEl.value=y;
 const pr=p.get('price');if(pr&&[...priceEl.options].some(o=>o.value===pr))priceEl.value=pr;
 const w=(p.get('wheel')||'').replace(/x/g,'×');if(w&&[...wheelEl.options].some(o=>o.value===w))wheelEl.value=w;
}
function setKind(k){kind=k;visible=24;document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('active',b.dataset.kind===k));applyFilters()}
function applyFilters(){
 const q=document.getElementById('q').value.toLowerCase().trim(),b=document.getElementById('brand').value,y=+document.getElementById('year').value||0,p=+document.getElementById('price').value||0,w=document.getElementById('wheel').value,l=document.getElementById('locFilter').value,s=document.getElementById('sort').value;
 filtered=STOCK.filter(x=>(kind==='all'||x.kind===kind)&&(!q||(x.brand+' '+x.model+' '+x.modification+' '+x.wheel+' '+x.id+' '+x.location).toLowerCase().includes(q))&&(!b||x.brand===b)&&(!y||x.year>=y)&&(!p||x.price<=p)&&(!w||x.wheel===w)&&(!l||x.location===l));
 if(s==='priceAsc')filtered.sort((a,b)=>(a.price||1e12)-(b.price||1e12));else if(s==='priceDesc')filtered.sort((a,b)=>b.price-a.price);else if(s==='yearDesc')filtered.sort((a,b)=>b.year-a.year);else filtered.sort((a,b)=>(b.score||0)-(a.score||0));render();
}
function card(x){
 const deal=x.medianDelta<=-10?`<span class="deal">${Math.abs(x.medianDelta)}% ниже медианы каталога</span>`:'';
 const loc=x.location||x.district||'Россия';
 return`<article class="card"><div class="visual"><div class="placeholder">${x.kind==='tractor'?truckSVG:dumpSVG}<b>Фото готовится</b></div><span class="badge">${kindName(x.kind)}</span>${deal}</div><div class="body"><div class="meta">Лот ${x.id} • ${loc}</div><div class="title">${x.brand} ${x.model}</div><div class="specs"><span class="spec">${x.year||'—'} г.</span>${x.wheel?`<span class="spec">${x.wheel}</span>`:''}<span class="spec">${km(x.mileage)}</span></div>${x.conditionSummary?`<div class="condition">${x.conditionSummary}</div>`:''}<div class="price">${money(x.price)}</div><div class="sub">Цена из последнего загруженного стока. Требует подтверждения.</div><div class="cardactions"><button class="btn secondary" onclick="openDetail('${x.id}')">Подробнее</button><a class="btn primary" href="tel:880022735700" onclick="rememberLot('${x.id}')">Позвонить</a></div></div></article>`;
}
function render(){document.getElementById('count').textContent=fmt.format(filtered.length)+' предложений';const p=filtered.slice(0,visible);document.getElementById('cards').innerHTML=p.length?p.map(card).join(''):'<div class="empty"><b>По выбранным параметрам ничего не найдено.</b><br>Измените фильтры или сформируйте запрос на подбор.</div>';document.getElementById('more').style.display=visible<filtered.length?'inline-flex':'none'}
function showMore(){visible+=24;render()}
function rememberLot(id){try{localStorage.setItem('stocktrak_last_lot',id)}catch(e){}}
function openDetail(id){
 current=STOCK.find(x=>x.id===id);if(!current)return;const x=current;rememberLot(id);
 document.getElementById('dKind').textContent=kindName(x.kind)+' • лот '+x.id;document.getElementById('dTitle').textContent=x.brand+' '+x.model;document.getElementById('dPrice').textContent=money(x.price);
 const rows=[['Год',x.year||'—'],['Пробег',km(x.mileage)],['Колёсная формула',x.wheel||'—'],['Локация',x.location||x.district||'—'],['Модификация',x.modification||'—'],['VIN',x.vinMasked||'—'],['ПТС',x.pts||'—'],['Ключи',x.keys||'—']];
 document.getElementById('dDetails').innerHTML=rows.map(v=>`<div class="detail"><small>${v[0]}</small><b>${v[1]}</b></div>`).join('');
 document.getElementById('dCondition').innerHTML=x.condition?`<b>Комментарий по состоянию</b><br>${x.condition}`:'Состояние и комплектность уточняются при подтверждении лота.';
 document.getElementById('copyLot').onclick=()=>copyText('Лот '+x.id+' — '+x.brand+' '+x.model,'Номер лота скопирован');
 history.replaceState(null,'','?lot='+encodeURIComponent(id)+'#catalog');document.getElementById('detailModal').classList.add('open');
}
function openPick(){pickValue=[document.getElementById('pKind').value,document.getElementById('pBudget').value,document.getElementById('pYear').value,document.getElementById('pBrand').value].join(' • ');document.getElementById('pickText').textContent=pickValue;document.getElementById('pickModal').classList.add('open')}
function copyPick(){copyText(pickValue,'Запрос скопирован')}
async function copyText(text,msg){try{await navigator.clipboard.writeText(text);alert(msg)}catch(e){prompt('Скопируйте текст:',text)}}
function closeModal(id){document.getElementById(id).classList.remove('open');if(id==='detailModal')history.replaceState(null,'',location.pathname+'#catalog')}
function backdrop(e,id){if(e.target.id===id)closeModal(id)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.getElementById('detailModal').classList.remove('open');document.getElementById('pickModal').classList.remove('open')}})
init();