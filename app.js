(() => {
  'use strict';
  const menus = window.MENUS;
  const KEY = 'hansik-memory-v1';
  const ingredientNames = {간:'간장',소:'소금',설:'설탕',파:'파',마:'마늘',후:'후추',깨:'깨소금',참:'참기름'};
  let records = {}, storageOK = true;
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) for (const menu of menus) if (['known','review'].includes(saved[menu.id])) records[menu.id] = saved[menu.id]; } catch { storageOK = false; }
  let view = 'cards', filter = 'all', query = '', allVisible = false, currentId = null, round = [], answered = 0;
  const revealed = new Set();
  const openRecipes = new Set();
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const statusOf = menu => records[menu.id] || 'new';
  const isStudy = () => view === 'study';
  const counts = () => ({all:menus.length,new:menus.filter(m=>statusOf(m)==='new').length,review:menus.filter(m=>statusOf(m)==='review').length,known:menus.filter(m=>statusOf(m)==='known').length});
  function pool() { return menus.filter(menu => {
    const terms = menu.parts.map(part => { const mnemonic=part.text.split(' + ').pop(); return part.text+' '+(/^[간소설파마후깨참]+$/.test(mnemonic)?[...mnemonic].map(c=>ingredientNames[c]).join(' '):''); }).join(' ');
    return (filter === 'all' || statusOf(menu) === filter) && (!query || `${menu.name} ${(menu.ingredients || []).join(" ")} ${terms} ${menu.note}`.replace(/\s/g,'').includes(query.replace(/\s/g,'')));
  }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(records)); storageOK = true; } catch { storageOK = false; } $('#storage-note').textContent = storageOK ? '학습 기록은 이 기기의 브라우저에 저장돼요.' : '현재 브라우저에 기록을 저장할 수 없어요. 이번 화면에서만 유지됩니다.'; }
  function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(()=>$('#toast').classList.remove('visible'),1800); }
  function chooseNext() {
    const available = pool();
    const valid = new Set(available.map(x=>x.id));
    round = round.filter(id=>valid.has(id));
    if (!round.length) { round=available.map(x=>x.id); for(let i=round.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[round[i],round[j]]=[round[j],round[i]];} }
    if (round.length > 1 && round[round.length-1] === currentId) [round[0],round[round.length-1]]=[round[round.length-1],round[0]];
    currentId = round.pop() ?? null;
    if (currentId) revealed.delete(currentId);
  }
  function answerHTML(menu) { return menu.parts.map(part => {
    const split = part.text.split(' + '), mnemonic = split.pop(), extra = split.join(' · ');
    const expanded = /^[간소설파마후깨참]+$/.test(mnemonic) ? [...mnemonic].map(c=>ingredientNames[c]).join(' · ') : '';
    return `<div class="answer-block"><span class="answer-label">${escape(part.label)}</span>${extra?`<span class="answer-extras">${escape(extra)}<b>＋</b></span>`:''}<strong class="mnemonic">${escape(mnemonic)}</strong>${expanded?`<div class="expanded">${escape(expanded)}</div>`:''}</div>`;
  }).join(''); }
  function recipeHTML(menu) {
    if (!menu.recipe) return '';
    const recipe = menu.recipe;
    return `<details class="recipe-details" data-recipe-id="${menu.id}" ${openRecipes.has(menu.id)?'open':''}><summary><span class="recipe-closed">레시피 요약 펼치기</span><span class="recipe-open">레시피 요약 접기</span><span class="recipe-time">${escape(recipe.minutes)}분</span></summary><div class="recipe-body"><p class="recipe-source">제공한 사진 기준 · T = 큰술, C = 컵</p><ol>${recipe.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${recipe.finish?`<p class="recipe-finish">${escape(recipe.finish)}</p>`:''}${recipe.note?`<p class="recipe-note">${escape(recipe.note)}</p>`:''}</div></details>`;
  }
  function cardHTML(menu) {
    const visible = isStudy() ? revealed.has(menu.id) : allVisible || revealed.has(menu.id), status = statusOf(menu);
    const statusLabel = {new:'아직 안 외움',known:'외웠어요',review:'다시 보기'}[status];
    return `<article class="card" data-id="${menu.id}" aria-label="${escape(menu.name)} 양념 카드"><div class="card-head"><span class="card-number">${String(menu.id).padStart(2,'0')}</span><h3>${escape(menu.name)}</h3><span class="status ${status}">${statusLabel}</span></div><div class="card-ingredients"><span>시험 지급재료 · ${(menu.materials || []).length}종</span><p>${(menu.ingredients || []).map(escape).join(" · ")}</p><details class="material-details"><summary>지급량·규격 보기</summary><dl>${(menu.materials || []).map(item=>`<div><dt>${escape(item.name)}${item.spec || item.note ? `<small>${escape([item.spec,item.note].filter(Boolean).join(" · "))}</small>` : ""}</dt><dd>${escape(item.quantity)} ${escape(item.unit)}</dd></div>`).join("")}</dl><p class="material-tip">지급량은 양념에 모두 넣는 사용량이 아니에요. 재료 수급에 따라 일부 변경될 수 있어요.</p></details></div>${visible?`${answerHTML(menu)}${menu.note?`<div class="card-note">${escape(menu.note)}</div>`:''}<div class="answer-control"><button data-action="hide" data-id="${menu.id}" aria-label="${escape(menu.name)} 양념 가리기">양념 가리기 ↑</button></div>`:`<button class="answer-hidden" data-action="reveal" data-id="${menu.id}" aria-label="${escape(menu.name)} 양념 보기"><span aria-hidden="true">✧</span><strong>어떤 양념이 들어갈까요?</strong><small>떠올렸다면 눌러서 확인하기</small></button>`}${recipeHTML(menu)}<div class="card-actions"><button class="mark-button review ${status==='review'?'selected':''}" data-action="review" data-id="${menu.id}" aria-pressed="${status==='review'}" ${isStudy()&&!visible?'disabled':''}>↺ 다시 보기</button><button class="mark-button known ${status==='known'?'selected':''}" data-action="known" data-id="${menu.id}" aria-pressed="${status==='known'}" ${isStudy()&&!visible?'disabled':''}>✓ 외웠어요</button></div><a class="video-link" href="${menu.video}" target="_blank" rel="noopener noreferrer">박문각 영상 보기 ↗</a></article>`;
  }
  function render() {
    const c = counts(), available = pool();
    $('#progress-label').textContent = `${c.known} / 33`;
    $('#progress-fill').style.width = `${c.known/33*100}%`;
    $('.progress-track').setAttribute('aria-valuenow',c.known);
    $('#review-count').textContent = `다시 볼 메뉴 ${c.review}개`;
    $('#nav-review-count').textContent = c.review;
    document.querySelectorAll('[data-filter]').forEach(button=>{ const selected = button.dataset.filter === filter; button.classList.toggle('active',selected); button.setAttribute('aria-pressed',selected); button.querySelector('span').textContent = c[button.dataset.filter]; });
    document.querySelectorAll('[data-view]').forEach(button=>{ const selected = button.dataset.view===view; button.classList.toggle('active',selected); if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current'); });
    $('#view-title').textContent = isStudy() ? '한 장씩, 랜덤 암기' : view==='review' ? '한 번 더 떠올려요' : '나의 양념 카드';
    $('#view-kicker').textContent = isStudy() ? 'A LITTLE PRACTICE' : view==='review' ? 'ONE MORE TIME' : 'MY RECIPE CARDS';
    $('#visibility-toggle').hidden = isStudy();
    $('#visibility-toggle').textContent = allVisible?'양념 모두 가리기':'양념 모두 보기';
    $('#visibility-toggle').setAttribute('aria-pressed',allVisible);
    $('#cards').classList.toggle('study-mode',isStudy());
    $('#list-hint').textContent = isStudy() ? '답을 확인한 뒤 기록해요' : '먼저 떠올린 뒤 확인해요';
    $('#results-label').textContent = isStudy() ? `출제 대상 ${available.length}개 · ${answered}장 복습` : `${available.length}개의 양념 카드`;
    if(isStudy() && !available.some(m=>m.id===currentId)) chooseNext();
    const shown = isStudy()?available.filter(m=>m.id===currentId):available;
    $('#cards').innerHTML = shown.map(cardHTML).join('') + (isStudy()&&shown.length?'<button class="study-next" data-action="next">다른 카드로 건너뛰기 →</button>':'');
    $('#empty').hidden = shown.length>0;
    $('#empty-text').textContent = query ? '검색어를 바꾸거나 전체 카드에서 찾아보세요.' : filter==='review' ? '헷갈리는 카드에서 ‘다시 보기’를 눌러 모아보세요.' : filter==='new' ? '모든 메뉴를 한 번씩 공부했어요. 전체 카드로 복습해 볼까요?' : filter==='known' ? '카드에서 ‘외웠어요’를 누르면 이곳에 모여요.' : '필터를 바꾸어 다시 시작해 보세요.';
    if(!storageOK)$('#storage-note').textContent='현재 브라우저에 기록을 저장할 수 없어요. 이번 화면에서만 유지됩니다.';
  }
  function setView(next) { view=next;filter=next==='review'?'review':'all';round=[];currentId=null;revealed.clear();allVisible=false;render();$('.workspace').scrollIntoView({behavior:'smooth',block:'start'}); }
  $('#cards').addEventListener('toggle',event=>{const details=event.target;if(!details.matches('.recipe-details'))return;const id=Number(details.dataset.recipeId);if(details.open)openRecipes.add(id);else openRecipes.delete(id);},true);
  $('#cards').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    const id=Number(button.dataset.id),action=button.dataset.action;
    if(action==='reveal')revealed.add(id);
    if(action==='hide'){ if(allVisible){allVisible=false;menus.forEach(m=>revealed.add(m.id));}revealed.delete(id); }
    if(action==='next')chooseNext();
    if(['known','review'].includes(action)) { if(!isStudy()&&records[id]===action)delete records[id];else records[id]=action;save();if(isStudy()){answered++;chooseNext();}toast(action==='known'?'기억에 한 장 더 쌓였어요':'다시 볼 카드에 담았어요'); }
    render();
    if(isStudy())$('#cards').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;round=[];currentId=null;render();}));
  $('#search').addEventListener('input',event=>{query=event.target.value.trim();round=[];currentId=null;render();});
  $('#visibility-toggle').addEventListener('click',()=>{allVisible=!allVisible;revealed.clear();render();});
  $('#clear-filters').addEventListener('click',()=>{query='';$('#search').value='';filter='all';if(view==='review')view='cards';round=[];currentId=null;render();});
  $('.brand').addEventListener('click',event=>{event.preventDefault();query='';$('#search').value='';setView('cards');window.scrollTo({top:0,behavior:'smooth'});});
  $('#help').addEventListener('click',()=>$('#help-dialog').showModal());
  $('#close-help').addEventListener('click',()=>$('#help-dialog').close());
  $('#help-dialog').addEventListener('click',event=>{if(event.target===$('#help-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  $('#reset').addEventListener('click',()=>$('#reset-dialog').showModal());
  $('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());
  $('#confirm-reset').addEventListener('click',()=>{records={};answered=0;round=[];currentId=null;save();$('#reset-dialog').close();render();toast('처음부터 차근차근 시작해요');});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#help-dialog').open){event.preventDefault();$('#search').focus();}});
  window.addEventListener('storage',event=>{if(event.key===KEY){try{const saved=JSON.parse(event.newValue||'{}');records={};for(const m of menus)if(['known','review'].includes(saved?.[m.id]))records[m.id]=saved[m.id];render();}catch{}}});
  render();
  if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
