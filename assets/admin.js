const API='/api'
const app=document.querySelector('#app')
const overlay=document.querySelector('#overlay-root')
const toastRoot=document.querySelector('#toast-root')

const pages={
  dashboard:{label:'经营总览',eyebrow:'COMMAND CENTER',desc:'活动状态、中奖、核销、库存与门店表现集中在一个工作面。',icon:'⌂'},
  settings:{label:'活动设置',eyebrow:'ACTIVITY',desc:'控制活动时间、每日次数、领奖有效期和消费者端品牌素材。',icon:'◫'},
  pools:{label:'奖池管理',eyebrow:'PRIZE POOLS',desc:'每个产品批次绑定独立奖池，防止奖品库存和概率相互污染。',icon:'◇'},
  prizes:{label:'奖品与库存',eyebrow:'INVENTORY',desc:'维护奖品价值、权重、库存、低库存阈值和启停状态。',icon:'▦'},
  cash:{label:'红包领取记录',eyebrow:'CASH REWARDS',desc:'核对用户领取、微信确认和实际到账状态；金额来自中奖凭证。',icon:'¥'},
  batches:{label:'批次与兑换码',eyebrow:'CODE BATCHES',desc:'管理产品批次、中奖概率、有效期，并生成或导出唯一 6 位数字兑换码。',icon:'⌗'},
  stores:{label:'门店与账号',eyebrow:'STORE NETWORK',desc:'维护核销网点、定位资料和门店角色账号。',icon:'⌂'},
  sales:{label:'销售账号',eyebrow:'SALES ACCESS',desc:'为公司销售开通独立账号，门店归属和查看范围由服务端自动隔离。',icon:'♙'},
  orders:{label:'兑奖订单',eyebrow:'REDEMPTIONS',desc:'跨批次追踪兑奖状态，处理异常冻结并导出业务明细。',icon:'≡'},
  customers:{label:'用户风控',eyebrow:'CUSTOMERS',desc:'检索消费者参与情况，对异常账号限制或恢复参与。',icon:'◎'},
  audit:{label:'审计日志',eyebrow:'AUDIT TRAIL',desc:'核查登录、兑奖、核销、重复拦截和总部管理操作。',icon:'◴'},
  notifications:{label:'通知队列',eyebrow:'MESSAGING',desc:'查看中奖、核销、到期等微信订阅消息的投递队列。',icon:'✉'}
}

const DEFAULT_BRANDING={brand:'倌榔',brandEn:'GUANLANG',brandMark:'倌',brandLogo:'',adminSubtitle:'总部运营中枢'}
const state={token:localStorage.getItem('xbl_admin_token')||'',user:readStorage('xbl_admin_user'),branding:{...DEFAULT_BRANDING,...(readStorage('xbl_admin_branding')||{})},page:location.hash.slice(1)||'dashboard',menu:false}

function readStorage(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function attr(value){return esc(value)}
function q(selector,root=document){return root.querySelector(selector)}
function qa(selector,root=document){return [...root.querySelectorAll(selector)]}
function fmt(value){if(!value)return '—';return new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Number(value)))}
function money(value){return `¥${Number(value||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function yuanFromCents(value){return (Number(value||0)/100).toFixed(2)}
function centsFromYuan(value,label='金额'){
  const amount=Number(value)
  if(!Number.isFinite(amount)||amount<0)throw new Error(`${label}请输入有效的非负金额`)
  const cents=Math.round(amount*100)
  if(Math.abs(cents/100-amount)>1e-8)throw new Error(`${label}最多保留两位小数`)
  return cents
}
function roleLabel(role){return ({super_admin:'超级管理员',operator:'活动运营',auditor:'只读审计',sales:'公司销售'})[role]||role}
function statusLabel(status){return ({active:'启用',disabled:'停用',pending:'待核销',verified:'已核销',frozen:'已冻结',expired:'已过期',lose:'未中奖',unused:'未使用',redeemed:'已兑换',sent:'已发送',failed:'失败',skipped:'已跳过',paused:'已暂停'})[status]||status||'—'}
function badge(status,label=''){return `<span class="status status-${attr(status)}">${esc(label||statusLabel(status))}</span>`}
function readOnly(){return state.user?.role==='auditor'}
function navigationGroups(){
  if(state.user?.role==='sales')return [['门店拓展',['stores']]]
  const groups=[['运营工作台',['dashboard','settings']],['活动资产',['pools','prizes','batches']],['履约网络',['stores','orders','cash']],['安全与审计',['customers','audit','notifications']]]
  if(state.user?.role==='super_admin')groups[2][1].splice(1,0,'sales')
  return groups
}
function allowedPages(){return navigationGroups().flatMap(group=>group[1])}
function defaultPage(){return state.user?.role==='sales'?'stores':'dashboard'}
function setBranding(config={}){const next={...DEFAULT_BRANDING,...state.branding};for(const key of Object.keys(DEFAULT_BRANDING))if(config[key]!=null)next[key]=config[key];state.branding=next;localStorage.setItem('xbl_admin_branding',JSON.stringify(next))}
function brandSymbol(){return state.branding.brandLogo?`<img src="${attr(state.branding.brandLogo)}" alt="${attr(state.branding.brand)} Logo">`:esc(state.branding.brandMark)}
function applyBranding(){
  const symbol=q('[data-brand-symbol]');if(symbol){symbol.innerHTML=brandSymbol();symbol.classList.toggle('has-image',Boolean(state.branding.brandLogo))}
  const name=q('[data-brand-name]');if(name)name.textContent=state.branding.brand
  const subtitle=q('[data-brand-subtitle]');if(subtitle)subtitle.textContent=state.branding.adminSubtitle
  const loginBrand=q('[data-login-brand]');if(loginBrand)loginBrand.textContent=[state.branding.brand,state.branding.brandEn].filter(Boolean).join(' · ')
  document.title=state.token?`${pages[state.page]?.label||'运营中枢'} · ${state.branding.brand}${state.branding.adminSubtitle}`:`登录 · ${state.branding.brand}${state.branding.adminSubtitle}`
}
async function loadBranding(){try{setBranding(await api('/public/config'));applyBranding()}catch{}}
function field(label,name,value='',type='text',options='',hint=''){return `<div class="field"><label for="f-${attr(name)}">${esc(label)}</label><input class="input" id="f-${attr(name)}" name="${attr(name)}" type="${attr(type)}" value="${attr(value)}" ${options}>${hint?`<small class="field-help">${esc(hint)}</small>`:''}</div>`}
function selectField(label,name,value,items){return `<div class="field"><label for="f-${attr(name)}">${esc(label)}</label><select class="select" id="f-${attr(name)}" name="${attr(name)}">${items.map(i=>`<option value="${attr(i.value)}" ${String(i.value)===String(value)?'selected':''}>${esc(i.label)}</option>`).join('')}</select></div>`}
function imagePreview(url,alt='图片预览'){return url?`<img src="${attr(url)}" alt="${attr(alt)}">`:'<span>暂无图片</span>'}
function imageUploadField({label='图片',name='img',value='',title='上传图片',description='支持 PNG、JPG、WebP，文件不超过 5MB。',required=false,span=true,preview='square'}={}){
  const id=`f-upload-${name}`
  return `<div class="field ${span?'span-2':''} image-field image-field-${attr(preview)}" data-image-uploader data-image-label="${attr(label)}" data-image-required="${required?'1':'0'}"><label for="${attr(id)}">${esc(label)}</label><div class="image-uploader"><div class="image-preview image-preview-${attr(preview)}" data-image-preview>${imagePreview(value,`${label}预览`)}</div><div class="image-upload-copy"><strong>${esc(title)}</strong><p>${esc(description)}</p><div class="image-upload-actions"><label class="btn btn-small" data-image-select>选择图片<input id="${attr(id)}" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button class="btn btn-small" type="button" data-image-clear ${value?'':'disabled'}>移除图片</button></div><small class="field-help" data-image-status>${value?'已保存图片，可重新上传替换。':required?'保存前请先上传图片。':'未上传时使用系统默认图片。'}</small></div></div><input type="hidden" name="${attr(name)}" value="${attr(value)}" data-image-value></div>`
}
function fileDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('图片读取失败，请重新选择'));reader.readAsDataURL(file)})}
function bindImageUploader(root,onBusy=()=>{}){
  const input=q('input[type=file]',root);const hidden=q('[data-image-value]',root);const preview=q('[data-image-preview]',root);const status=q('[data-image-status]',root);const clear=q('[data-image-clear]',root);const select=q('[data-image-select]',root);const label=root.dataset.imageLabel||'图片'
  const render=url=>{preview.innerHTML=imagePreview(url,`${label}预览`);clear.disabled=!url;const image=q('img',preview);image?.addEventListener('error',()=>{preview.innerHTML='<span>图片无法预览</span>'},{once:true})}
  clear.addEventListener('click',()=>{hidden.value='';input.value='';render('');status.textContent=root.dataset.imageRequired==='1'?'图片已移除，保存前请重新上传。':'图片已移除，保存后生效。'})
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){input.value='';toast('图片格式不支持','请选择 PNG、JPG 或 WebP 图片','error');return}
    if(file.size<=0||file.size>5*1024*1024){input.value='';toast('图片大小不符合要求','请选择 5MB 以内的图片','error');return}
    onBusy(true);select.classList.add('is-loading');status.textContent='正在上传图片…'
    try{const data=await fileDataUrl(file);const uploaded=await api('/admin/uploads',{method:'POST',body:{name:file.name,mime:file.type,data}});hidden.value=uploaded.url;render(uploaded.url);status.textContent=`上传成功 · ${(uploaded.size/1024).toFixed(0)}KB`;toast(`${label}上传成功`)}
    catch(error){input.value='';status.textContent='上传失败，请重新选择图片。';toast('图片上传失败',error.message,'error')}
    finally{select.classList.remove('is-loading');onBusy(false)}
  })
  render(hidden.value)
}
function bindImageUploaders(root,onBusy=()=>{}){
  let busyCount=0
  qa('[data-image-uploader]',root).forEach(node=>bindImageUploader(node,busy=>{busyCount+=busy?1:-1;onBusy(busyCount>0)}))
}
function pageHead(page,actions=''){const meta=pages[page];return `<header class="page-head"><div><div class="eyebrow">${meta.eyebrow}</div><h1>${meta.label}</h1><p>${meta.desc}</p></div><div class="page-actions">${actions}</div></header>`}
function loading(){return '<div class="loading"><div><div class="spinner"></div>正在读取业务数据…</div></div>'}
function empty(title='暂无数据',desc='调整筛选条件后再试。'){return `<div class="empty"><strong>${esc(title)}</strong>${esc(desc)}</div>`}

function toast(title,message='',kind='success'){
  const node=document.createElement('div');node.className=`toast ${kind==='error'?'error':''}`;node.innerHTML=`<strong>${esc(title)}</strong>${message?`<span>${esc(message)}</span>`:''}`;toastRoot.append(node);setTimeout(()=>node.remove(),3800)
}

async function api(path,{method='GET',body}={}){
  const response=await fetch(API+path,{method,headers:{...(state.token?{Authorization:`Bearer ${state.token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
  let payload={};try{payload=await response.json()}catch{}
  if(response.status===401&&state.token){logout(false);throw new Error('登录已过期，请重新登录')}
  if(!response.ok)throw Object.assign(new Error(payload.error?.message||`请求失败（${response.status}）`),{code:payload.error?.code,status:response.status})
  return payload.data
}

async function download(path,filename){
  try{const response=await fetch(API+path,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok){const payload=await response.json();throw new Error(payload.error?.message||'导出失败')}const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);toast('导出已开始',filename)}catch(error){toast('导出失败',error.message,'error')}
}

function saveSession(data){state.token=data.token;state.user=data.user;localStorage.setItem('xbl_admin_token',data.token);localStorage.setItem('xbl_admin_user',JSON.stringify(data.user))}
function logout(render=true){state.token='';state.user=null;localStorage.removeItem('xbl_admin_token');localStorage.removeItem('xbl_admin_user');if(render)renderApp()}

function renderLogin(){
  document.title=`登录 · ${state.branding.brand}${state.branding.adminSubtitle}`
  app.innerHTML=`<main class="login">
    <section class="login-art" aria-label="品牌介绍"><div class="login-brand" data-login-brand>${esc([state.branding.brand,state.branding.brandEn].filter(Boolean).join(' · '))}</div><div class="login-copy"><div class="kicker">ONE-CODE REWARD PLATFORM</div><h1>把每一次兑奖，<br>变成可信的连接。</h1><p>统一管理活动、奖池、兑换码、门店与核销，让消费者体验与总部经营数据始终保持一致。</p></div><div class="login-note">系统写操作均记录操作者、时间、对象与结果</div></section>
    <section class="login-main"><div class="login-card"><h2>欢迎回来</h2><p>请使用总部管理账号进入运营工作台。</p><form class="login-form" id="login-form">
      ${field('管理账号','username','','text','autocomplete="username" required')}
      ${field('登录密码','password','','password','autocomplete="current-password" required minlength="8"')}
      <button class="btn btn-primary" type="submit">安全登录 <span aria-hidden="true">→</span></button>
    </form><div class="login-help">请使用总部管理员分配的正式账号登录。所有登录和业务操作均会写入审计日志。</div></div></section>
  </main>`
  q('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=q('button',event.currentTarget);button.disabled=true;button.textContent='正在验证…';try{const form=new FormData(event.currentTarget);const data=await api('/admin/auth/login',{method:'POST',body:Object.fromEntries(form)});saveSession(data);toast('登录成功',`欢迎，${data.user.name}`);renderApp()}catch(error){toast('无法登录',error.message,'error');button.disabled=false;button.textContent='安全登录 →'}})
}

function renderShell(){
  const groups=navigationGroups()
  app.innerHTML=`<div class="shell ${state.menu?'menu-open':''}"><aside class="sidebar"><div class="brand"><div class="brand-mark ${state.branding.brandLogo?'has-image':''}" data-brand-symbol>${brandSymbol()}</div><div><strong data-brand-name>${esc(state.branding.brand)}</strong><small data-brand-subtitle>${esc(state.branding.adminSubtitle)}</small></div></div>${groups.map(([label,ids])=>`<div class="nav-label">${label}</div><nav class="nav">${ids.map(id=>`<button class="nav-button ${state.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${pages[id].icon}</span>${pages[id].label}</button>`).join('')}</nav>`).join('')}<div class="side-footer"><strong>${esc(state.user?.name||'管理员')}</strong>${roleLabel(state.user?.role)} · 安全会话</div></aside>
    <section class="main"><header class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="icon-btn mobile-menu" id="mobile-menu" aria-label="打开菜单">☰</button><div class="breadcrumb">运营中枢 / <strong>${pages[state.page]?.label||'页面'}</strong></div></div><div class="top-actions"><span class="live-dot"></span><span class="live-label">服务正常</span><div class="account-chip"><span class="avatar">${esc((state.user?.name||'管').slice(0,1))}</span><div><strong>${esc(state.user?.name||'管理员')}</strong><small>${roleLabel(state.user?.role)}</small></div></div><button class="btn btn-small" id="logout">退出</button></div></header><main class="content" id="main">${loading()}</main></section></div>`
  qa('[data-page]').forEach(button=>button.addEventListener('click',()=>{state.menu=false;location.hash=button.dataset.page}))
  q('#mobile-menu').addEventListener('click',()=>{state.menu=!state.menu;q('.shell').classList.toggle('menu-open',state.menu)})
  q('#logout').addEventListener('click',()=>logout())
  loadPage()
}

async function renderApp(){
  if(!state.token){renderLogin();loadBranding();return}
  try{if(!state.user)state.user=await api('/admin/me')}catch{renderLogin();return}
  if(!pages[state.page]||!allowedPages().includes(state.page))state.page=defaultPage()
  renderShell()
  loadBranding()
}

window.addEventListener('hashchange',()=>{const requested=location.hash.slice(1)||defaultPage();state.page=allowedPages().includes(requested)?requested:defaultPage();if(state.token)renderShell()})

async function loadPage(){
  const main=q('#main');if(!main)return;main.innerHTML=loading();document.title=`${pages[state.page].label} · ${state.branding.brand}${state.branding.adminSubtitle}`
  try{await pageRenderers[state.page](main)}catch(error){main.innerHTML=pageHead(state.page)+`<div class="panel">${empty('页面加载失败',error.message)}</div>`;toast('加载失败',error.message,'error')}
}

function openModal({title,desc='',content,submit='保存',danger=false,onSubmit,width}){
  overlay.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ${width?`style="width:${attr(width)}"`:''}><form id="modal-form"><header class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}</div><button class="icon-btn" type="button" data-close aria-label="关闭">×</button></header><div class="modal-body">${content}</div><footer class="modal-foot"><button class="btn" type="button" data-close>取消</button>${onSubmit?`<button class="btn ${danger?'btn-danger':'btn-primary'}" type="submit">${esc(submit)}</button>`:''}</footer></form></section></div>`
  const close=()=>{overlay.innerHTML=''};qa('[data-close]',overlay).forEach(button=>button.addEventListener('click',close));q('.modal-backdrop',overlay).addEventListener('click',event=>{if(event.target===event.currentTarget)close()});document.addEventListener('keydown',function key(event){if(event.key==='Escape'){close();document.removeEventListener('keydown',key)}},{once:true})
  if(onSubmit)q('#modal-form',overlay).addEventListener('submit',async event=>{event.preventDefault();const button=q('[type=submit]',event.currentTarget);button.disabled=true;const before=button.textContent;button.textContent='正在提交…';try{await onSubmit(new FormData(event.currentTarget),close)}catch(error){toast('操作失败',error.message,'error');button.disabled=false;button.textContent=before}})
  setTimeout(()=>q('input,select,textarea,button',q('.modal'))?.focus(),0)
}

function pager(data,page,onPage){
  if(data.pages<=1)return `<div class="pagination"><span>共 ${data.total} 条记录</span></div>`
  setTimeout(()=>{q('[data-prev]')?.addEventListener('click',()=>onPage(page-1));q('[data-next]')?.addEventListener('click',()=>onPage(page+1))},0)
  return `<div class="pagination"><span>共 ${data.total} 条 · 第 ${data.page}/${data.pages} 页</span><div class="actions"><button class="btn btn-small" data-prev ${page<=1?'disabled':''}>上一页</button><button class="btn btn-small" data-next ${page>=data.pages?'disabled':''}>下一页</button></div></div>`
}

async function dashboardPage(main){
  const data=await api('/admin/dashboard');const totalCodes=Object.values(data.codeStats).reduce((a,b)=>a+b,0);const maxRank=Math.max(1,...data.storeRank.map(i=>i.verified))
  main.innerHTML=pageHead('dashboard',`<button class="btn" id="refresh">↻ 刷新数据</button>`)+`<section class="stats">
    <article class="stat"><span class="stat-label">累计兑换</span><strong class="stat-value">${data.totals.redeemed}</strong><div class="stat-meta">覆盖 ${totalCodes} 个已入库兑换码</div></article>
    <article class="stat"><span class="stat-label">累计中奖</span><strong class="stat-value">${data.totals.won}</strong><div class="stat-meta"><strong>${data.totals.winRate}%</strong> 当前中奖率</div></article>
    <article class="stat"><span class="stat-label">已完成核销</span><strong class="stat-value">${data.totals.verified}</strong><div class="stat-meta">${data.totals.pending} 笔等待到店</div></article>
    <article class="stat"><span class="stat-label">风控冻结</span><strong class="stat-value">${data.totals.frozen}</strong><div class="stat-meta">需要总部人工复核</div></article></section>
    <section class="grid-2"><div><article class="panel"><header class="panel-head"><div><h2>最近兑奖动态</h2><p>消费者兑奖和门店履约的最新状态</p></div><button class="btn btn-small" data-jump="orders">查看全部</button></header>${ordersTable(data.recent,false)}</article></div><div><article class="panel"><header class="panel-head"><div><h2>门店核销排行</h2><p>按累计完成量排序</p></div></header><div class="panel-body rank">${data.storeRank.map((item,index)=>`<div class="rank-row"><span class="rank-no">${index+1}</span><div><strong>${esc(item.name)}</strong><div class="bar"><span style="width:${item.verified/maxRank*100}%"></span></div></div><strong>${item.verified}</strong></div>`).join('')||empty()}</div></article><article class="panel"><header class="panel-head"><div><h2>库存预警</h2><p>达到预警阈值的启用奖品</p></div></header><div class="panel-body alerts">${data.lowStock.map(item=>`<div class="alert-row"><strong><span>${esc(item.name)}</span><span>${item.stock} 件</span></strong><p>${esc(item.poolName)} · 阈值 ${item.lowStockThreshold}</p></div>`).join('')||'<div style="color:var(--muted)">当前没有库存预警。</div>'}</div></article></div></section>`
  q('#refresh').addEventListener('click',loadPage);qa('[data-jump]').forEach(b=>b.addEventListener('click',()=>location.hash=b.dataset.jump))
}

async function settingsPage(main){
  const item=await api('/admin/settings')
  const notice=item.notice||{}
  const service=item.service||{}
  const fallbackFlow=[
    {title:'购买活动产品',description:'购买带有“开码有奖”标识的倌榔产品'},
    {title:'获取数字兑换码',description:'打开包装，找到包装内的 6 位数字兑换码'},
    {title:'登录后自主选牌',description:'微信登录后输入兑换码，选择一张牌翻开本次结果'},
    {title:'按奖励领取',description:'换购奖到店补款核销；现金红包在微信小程序内领取'}
  ]
  const flow=fallbackFlow.map((fallback,index)=>({...fallback,...(item.flow?.[index]||{})}))
  const limitOptions=[{value:0,label:'不限次数（推荐）'},...Array.from({length:20},(_,index)=>({value:index+1,label:`每日 ${index+1} 次`}))]
  const flowRows=flow.map((step,index)=>`<div class="flow-row"><span class="flow-number">${String(index+1).padStart(2,'0')}</span><div class="form-grid">${field('步骤标题',`flowTitle${index}`,step.title||step.t||'','text','required maxlength="40"')}<div class="field"><label for="f-flowDesc${index}">步骤说明</label><textarea class="textarea" id="f-flowDesc${index}" name="flowDesc${index}" required maxlength="160">${esc(step.description||step.d||'')}</textarea></div></div></div>`).join('')
  main.innerHTML=pageHead('settings')+`<form class="panel settings-form" id="settings-form"><header class="panel-head"><div><h2>消费者端统一配置</h2><p>保存后，小程序重新进入或刷新时读取最新内容。</p></div>${badge(item.active?'active':'paused',item.active?'活动进行中':'活动已暂停')}</header><div class="settings-sections">
    <section class="settings-section"><div class="settings-section-head"><div><span>01</span><h3>品牌与活动基础</h3></div><p>品牌标识会同步到后台侧边栏、小程序登录页、首页和门店端。</p></div><div class="form-grid">
      ${field('品牌名称','brand',item.brand,'text','required maxlength="80"')}${field('品牌英文名','brandEn',item.brandEn,'text','maxlength="80"')}
      ${field('方块文字标识','brandMark',item.brandMark||'倌','text','required maxlength="2"','未上传品牌 Logo 时显示，建议填写 1 个汉字。')}${field('后台副标题','adminSubtitle',item.adminSubtitle||'总部运营中枢','text','required maxlength="80"','显示在总部后台品牌名称下方。')}
      ${imageUploadField({label:'品牌 Logo',name:'brandLogo',value:item.brandLogo||'',title:'上传统一品牌 Logo',description:'建议透明底 PNG，上传后在小程序展示完整 Logo；移除后恢复文字标识。'})}
      ${field('活动名称','actName',item.actName,'text','required maxlength="100"')}${field('活动副标题','actSub',item.actSub,'text','maxlength="120"')}
      ${field('品牌口号','slogan',item.slogan,'text','maxlength="120"')}<div class="field"><label>活动开关</label><div class="switch-row"><span>允许消费者提交兑换码</span><input class="switch" type="checkbox" name="active" ${item.active?'checked':''}></div></div>
      ${field('活动开始日','actStart',item.actStart,'date','required')}${field('活动结束日','actEnd',item.actEnd,'date','required')}
      ${selectField('每人每日兑奖次数','dailyLimit',item.dailyLimit,limitOptions)}${field('中奖后有效天数','prizeValidDays',item.prizeValidDays,'number','required min="1" max="365"')}
    </div></section>
    <section class="settings-section"><div class="settings-section-head"><div><span>02</span><h3>小程序图片</h3></div><p>直接上传即可，不需要填写图片地址。统一支持 PNG、JPG、WebP，单张不超过 5MB。</p></div><div class="form-grid">
      ${imageUploadField({label:'首页背景图',name:'homeBg',value:item.homeBg,title:'首页品牌背景',description:'建议 1500 × 1000，至少 750 × 500，横版 3:2；左上区域保持简洁，避免文字被遮挡。',required:true,preview:'landscape'})}
      ${imageUploadField({label:'活动海报图（选填）',name:'poster',value:item.poster,title:'活动公告备用海报',description:'建议 1500 × 900 横版。可留空；30 元和 50 元的包装与背景在奖池管理中分别设置。',preview:'landscape'})}
      ${imageUploadField({label:'产品主图',name:'productImg',value:item.productImg,title:'中奖页产品展示图',description:'建议 1200 × 1200 正方形，产品完整、背景干净；中奖弹窗也会使用奖品自身图片。',required:true})}
      ${imageUploadField({label:'规则页背景图',name:'ruleBg',value:item.ruleBg,title:'活动规则页品牌背景',description:'建议 1500 × 840，至少 750 × 420，横版；中央和左侧保留文字安全区。',required:true,preview:'landscape'})}
    </div></section>
    <section class="settings-section"><div class="settings-section-head"><div><span>03</span><h3>进入小程序弹窗</h3></div><p>控制用户首次进入首页时看到的活动公告。</p></div><div class="form-grid">
      <div class="field span-2"><label>弹窗开关</label><div class="switch-row"><span>进入小程序时展示活动公告</span><input class="switch" type="checkbox" name="noticeEnabled" ${notice.enabled||notice.on?'checked':''}></div></div>
      ${field('弹窗角标','noticeBadge',notice.badge||'公告','text','required maxlength="12"','显示在弹窗左上角，例如“公告”“活动通知”。')}${field('确认按钮文字','noticeButtonText',notice.buttonText||'我知道了','text','required maxlength="20"','显示在弹窗底部的关闭按钮。')}
      ${imageUploadField({label:'弹窗顶部图片',name:'noticeImage',value:notice.image||'',title:'上传公告弹窗顶部图片',description:'建议 1200 × 600 横版，主要内容放在中间安全区。未上传时自动使用兑奖页海报图。',preview:'landscape'})}
      ${field('弹窗标题','noticeTitle',notice.title||'','text','maxlength="80"')}${field('显示日期','noticeDate',notice.date||'','date')}
      <div class="field span-2"><label for="f-noticeLines">公告内容</label><textarea class="textarea textarea-tall" id="f-noticeLines" name="noticeLines" placeholder="每行一条内容">${esc(Array.isArray(notice.lines)?notice.lines.join('\n'):'')}</textarea><small class="field-help">每行会显示为一条独立说明。关闭弹窗开关后，内容仍会保留。</small></div>
    </div></section>
    <section class="settings-section"><div class="settings-section-head"><div><span>04</span><h3>兑奖操作说明</h3></div><p>这里修改后，小程序“参与流程”四个步骤会同步更新。</p></div><div class="flow-list">${flowRows}</div></section>
    <section class="settings-section"><div class="settings-section-head"><div><span>05</span><h3>客服支持</h3></div><p>同步到小程序“活动规则”底部，用户可直接拨号或复制客服微信。</p></div><div class="form-grid">
      ${field('客服热线','servicePhone',service.phone||'','tel','maxlength="40"','客服电话和客服微信至少填写一项。')}${field('客服微信','serviceWechat',service.wechat||'','text','maxlength="80"','用户点击后会复制到剪贴板。')}
      ${field('服务时间','serviceTime',service.time||service.hours||'','text','maxlength="80"','例如：09:00 - 21:00')}<div class="field span-2"><label for="f-serviceNote">客服说明</label><textarea class="textarea" id="f-serviceNote" name="serviceNote" maxlength="300">${esc(service.note||'')}</textarea></div>
    </div></section>
  </div><footer class="modal-foot">${readOnly()?'<span class="hint">当前审计账号为只读权限</span>':'<button class="btn btn-primary" type="submit">保存全部设置</button>'}</footer></form>`
  const form=q('#settings-form')
  if(readOnly()){qa('input,select,textarea,button',form).forEach(control=>control.disabled=true);return}
  let imageUploading=false
  const button=q('[type=submit]',form)
  bindImageUploaders(form,busy=>{imageUploading=busy;button.disabled=busy})
  form.addEventListener('submit',async event=>{event.preventDefault();if(imageUploading)return;button.disabled=true;try{
    const values=Object.fromEntries(new FormData(form));for(const name of ['homeBg','productImg','ruleBg'])if(!values[name])throw new Error('首页背景、产品主图和规则页背景需要保留有效图片');values.active=q('[name=active]',form).checked;values.dailyLimit=Number(values.dailyLimit);values.prizeValidDays=Number(values.prizeValidDays)
    values.notice={enabled:q('[name=noticeEnabled]',form).checked,badge:values.noticeBadge||'公告',buttonText:values.noticeButtonText||'我知道了',image:values.noticeImage||'',title:values.noticeTitle||'',date:values.noticeDate||'',lines:String(values.noticeLines||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean)}
    values.flow=flow.map((step,index)=>({no:String(index+1).padStart(2,'0'),icon:step.icon||'',title:values[`flowTitle${index}`],description:values[`flowDesc${index}`]}))
    values.service={phone:String(values.servicePhone||'').trim(),wechat:String(values.serviceWechat||'').trim(),time:String(values.serviceTime||'').trim(),note:String(values.serviceNote||'').trim()}
    const previousService={phone:service.phone||'',wechat:service.wechat||'',time:service.time||service.hours||'',note:service.note||''}
    if(Object.keys(previousService).every(key=>values.service[key]===String(previousService[key]).trim()))delete values.service
    for(const key of ['noticeBadge','noticeButtonText','noticeImage','noticeTitle','noticeDate','noticeLines','servicePhone','serviceWechat','serviceTime','serviceNote',...flow.flatMap((_,index)=>[`flowTitle${index}`,`flowDesc${index}`])])delete values[key]
    const saved=await api('/admin/settings',{method:'PUT',body:values});setBranding(saved);applyBranding();toast('设置已保存','品牌信息会同步到后台和小程序，小程序需重新进入或刷新');loadPage()
  }catch(error){toast('保存失败',error.message,'error');button.disabled=false}})
}

function poolModal(item){
  const display=item?.presentation||{};let imageUploading=false
  openModal({title:item?'编辑奖池':'新建独立奖池',desc:'兑换码决定实际奖池和包装样式；充值金额用于支付红包，奖项和库存由此处配置。',content:`<div class="form-grid">
    ${field('奖池名称','name',item?.name||'','text','required maxlength="80"','名称可以重复，请通过产品档位和奖池说明区分不同规格。')}${field('产品档位','tier',item?.tier||'','text','required maxlength="80"')}
    ${selectField('状态','status',item?.status||'active',[{value:'active',label:'启用'},{value:'disabled',label:'停用'}])}
    ${selectField('包装配色','theme',display.theme||'auto',[{value:'auto',label:'按批次售价识别'},{value:'gold',label:'30 元棕金装'},{value:'blue',label:'50 元深蓝装'},{value:'neutral',label:'通用活动'}])}
    ${selectField('首页与规则页展示','visible',display.visible===false?'false':'true',[{value:'true',label:'公开展示'},{value:'false',label:'不公开展示，专用兑换码仍可领取'}])}
    <div class="field span-2"><label for="f-desc">消费者可见说明</label><textarea class="textarea" id="f-desc" name="desc" maxlength="300">${esc(item?.desc||'')}</textarea><small class="field-help">填写消费者需要了解的活动说明，不填写测试用途、内部预算和部署说明。</small></div>
    ${imageUploadField({label:'本档包装图',name:'productImg',value:display.productImg||'',title:'上传此奖池对应的产品包装',description:'可不上传，30 元棕金装、50 元深蓝装会使用对应默认包装。'})}
    ${imageUploadField({label:'本档背景图',name:'backgroundImg',value:display.backgroundImg||'',title:'上传该档页面背景',description:'可不上传，使用所选包装的默认配色和纹理。',preview:'landscape'})}
    </div>`,onSubmit:async(form,close)=>{if(imageUploading)throw new Error('图片仍在上传，请稍候');const values=Object.fromEntries(form);values.presentation={theme:values.theme,visible:values.visible==='true',productImg:values.productImg,backgroundImg:values.backgroundImg};for(const key of ['theme','visible','productImg','backgroundImg'])delete values[key];await api(`/admin/pools${item?'/'+item.id:''}`,{method:item?'PUT':'POST',body:values});close();toast('奖池已保存','包装与展示设置会同步到小程序');loadPage()}})
  bindImageUploaders(overlay,busy=>{imageUploading=busy;const button=q('#modal-form [type=submit]',overlay);if(button)button.disabled=busy})
}

function deletePoolModal(item){
  const hasHistory=Number(item.redemptionCount||0)>0
  openModal({
    title:hasHistory?'该奖池不能删除':`删除奖池「${item.name}」`,
    desc:hasHistory?'正式兑奖和核销历史必须永久保留。':'删除后无法恢复，请确认关联数据。',
    content:hasHistory
      ? `<div class="guide-example"><strong>已有 ${item.redemptionCount} 条兑奖记录</strong><p>请关闭此窗口后把奖池状态改为“停用”。停用后消费者端不会继续使用该奖池，历史订单仍可查询和核销。</p></div>`
      : `<div class="guide-example"><strong>将同时永久删除</strong><p>${item.prizeCount} 个奖品、${item.batchCount} 个产品批次、${item.codeCount||0} 个兑换码，以及奖池本身。用户、门店和系统设置不会受影响。</p></div>`,
    submit:'确认删除',
    danger:true,
    onSubmit:hasHistory?null:async(form,close)=>{const result=await api(`/admin/pools/${item.id}`,{method:'DELETE'});close();toast('奖池已删除',`${result.deleted.prizes} 个奖品 · ${result.deleted.batches} 个批次 · ${result.deleted.codes} 个兑换码`);loadPage()}
  })
}

function poolGuide(){return `<details class="guide-panel" id="pool-guide" open><summary><span><strong>奖池设置操作说明</strong><small>按“奖池 → 奖品 → 批次 → 兑换码”的顺序配置</small></span><span class="guide-toggle">展开 / 收起</span></summary><div class="guide-body"><ol class="guide-steps"><li><strong>按产品档位建奖池</strong><span>30 元、50 元建议分别创建独立奖池，避免奖品库存互相占用。</span></li><li><strong>添加奖品和库存</strong><span>到“奖品与库存”绑定奖池，填写库存、低库存阈值和抽奖权重。</span></li><li><strong>创建产品批次</strong><span>价格直接按元填写，选择对应奖池，再设置批次总中奖率和有效期。</span></li><li><strong>检查后生成兑换码</strong><span>确认奖池、库存和日期无误，再生成 6 位纯数字兑换码并导出交付印刷。</span></li></ol><div class="guide-example"><strong>充值后会自动增加奖品吗？</strong><p>不会。充值只补充微信发红包余额；红包金额、换购补款、库存和权重在“奖品与库存”设置，中奖率在“产品批次”设置。</p><strong>权重怎么算？</strong><p>若两个奖品权重为 1 和 4，则在“已中奖用户”中约占 20% 和 80%。若批次总中奖率是 10%，两项总体命中率约为 2% 和 8%；库存为 0 的奖品会停止发放。</p></div></div></details>`}

async function poolsPage(main){
  const items=await api('/admin/pools');main.innerHTML=pageHead('pools',`${readOnly()?'':`<button class="btn btn-primary" id="add">＋ 新建奖池</button>`}<button class="btn" id="show-guide">操作说明</button>`)+poolGuide()+`<section class="panel"><header class="panel-head"><div><h2>独立奖池</h2><p>共 ${items.length} 个，每个批次只绑定一个奖池；编辑奖池可设置包装图、配色和公开展示开关。</p></div></header><div class="table-wrap"><table class="table"><thead><tr><th>奖池</th><th>产品档位</th><th>奖品数</th><th>关联批次</th><th>兑换码</th><th>兑奖记录</th><th>状态</th><th></th></tr></thead><tbody>${items.map(item=>`<tr><td><span class="cell-main">${esc(item.name)}</span><span class="cell-sub">${esc(item.desc)}</span></td><td>${esc(item.tier)}</td><td>${item.prizeCount}</td><td>${item.batchCount}</td><td>${item.codeCount}</td><td>${item.redemptionCount}</td><td>${badge(item.status)}</td><td><div class="actions">${readOnly()?'':`<button class="btn btn-small" data-edit="${item.id}">编辑</button><button class="btn btn-small btn-danger" data-delete="${item.id}">删除</button>`}</div></td></tr>`).join('')}</tbody></table></div></section>`
  q('#add')?.addEventListener('click',()=>poolModal());q('#show-guide')?.addEventListener('click',()=>{const guide=q('#pool-guide');guide.open=true;guide.scrollIntoView({behavior:'smooth',block:'center'})});qa('[data-edit]').forEach(button=>button.addEventListener('click',()=>poolModal(items.find(i=>i.id===button.dataset.edit))));qa('[data-delete]').forEach(button=>button.addEventListener('click',()=>deletePoolModal(items.find(i=>i.id===button.dataset.delete))))
}

function prizeModal(item,pools){
  let imageUploading=false
  openModal({title:item?'编辑奖品':'添加奖品',desc:'库存会在消费者中奖时原子扣减；库存为 0 时该奖项自动停止发放。',content:`<div class="form-grid">
    ${selectField('所属奖池','poolId',item?.pool||pools[0]?.id,pools.map(p=>({value:p.id,label:`${p.name} · ${p.tier}`})))}${field('奖品名称','name',item?.name||'','text','required')}
    ${field('规格','spec',item?.spec||'')}${field('奖项等级','level',item?.level||'')}${selectField('类型','type',item?.type||'goods',[{value:'exchange',label:'到店加价换购一袋'},{value:'cash',label:'现金红包（微信领取）'},{value:'goods',label:'实物奖品'},{value:'coupon',label:'历史优惠券奖品'}])}${field('参考价值（元）','valueYuan',yuanFromCents(item?.valueCents??0),'number','required min="0" max="100000" step="0.01" inputmode="decimal"','直接填写人民币金额，例如 30 表示 ¥30.00。')}
    <div class="field span-2" data-exchange-fields>${field('到店补款（元）','exchangeYuan',yuanFromCents(item?.exchangeCents??0),'number','min="0.01" step="0.01"','仅用于加价换购：顾客支付此金额，店员交付一袋商品后核销。商品价值填写对应 30 元或 50 元包装售价。')}</div><p class="hint span-2" data-cash-hint>现金红包按参考价值发放至微信零钱，无需门店核销。商户配置完成后开放领取；未配置时含启用现金奖品的奖池暂停开奖，兑换码不会消耗。</p>
    ${field('当前库存','stock',item?.stock??0,'number','required min="0"')}${field('已发放数','sent',item?.sent??0,'number','required min="0"')}${field('低库存阈值','lowStockThreshold',item?.lowStockThreshold??10,'number','required min="0"')}${field('抽奖权重','weight',item?.weight??1,'number','required min="0.0001" step="0.0001"')}
    ${imageUploadField({label:'中奖弹窗图片',name:'img',value:item?.img||'',title:'上传中奖后展示的奖品图片',description:'建议 1200 × 1200 正方形，奖品居中、背景干净；支持 PNG、JPG、WebP，不超过 5MB。现金红包可不上传图片，小程序会显示默认红包图案。',required:false})} ${selectField('状态','status',item?.status||'active',[{value:'active',label:'启用'},{value:'disabled',label:'停用'}])}</div>`,onSubmit:async(form,close)=>{if(imageUploading)throw new Error('图片仍在上传，请稍候');const values=Object.fromEntries(form);if(values.type!=='cash'&&!values.img)throw new Error('请先上传商品图片');values.exchangeCents=values.type==='exchange'?centsFromYuan(values.exchangeYuan,'到店补款'):0;delete values.exchangeYuan;values.valueCents=centsFromYuan(values.valueYuan,'参考价值');delete values.valueYuan;for(const key of ['stock','sent','lowStockThreshold','weight'])values[key]=Number(values[key]);await api(`/admin/prizes${item?'/'+item.id:''}`,{method:item?'PUT':'POST',body:values});close();toast('奖品已保存');loadPage()}})
  bindImageUploader(q('[data-image-uploader]',overlay),busy=>{imageUploading=busy;const submit=q('#modal-form [type=submit]',overlay);if(submit)submit.disabled=busy})
  const rewardType=q('[name=type]',overlay);const syncRewardFields=()=>{const exchange=rewardType.value==='exchange';q('[data-exchange-fields]',overlay).hidden=!exchange;const amount=q('[name=exchangeYuan]',overlay);amount.disabled=!exchange;amount.required=exchange;q('[data-cash-hint]',overlay).hidden=rewardType.value!=='cash'};rewardType.addEventListener('change',syncRewardFields);syncRewardFields()
}

async function prizesPage(main){
  const [items,pools]=await Promise.all([api('/admin/prizes'),api('/admin/pools')]);main.innerHTML=pageHead('prizes',readOnly()?'':`<button class="btn btn-primary" id="add">＋ 添加奖品</button>`)+`<section class="panel"><div class="filters"><div class="field grow"><label>库存状态</label><div class="hint">低于预警阈值的奖品以橙色数字提示；库存耗尽仍保留历史记录。</div></div></div><div class="table-wrap"><table class="table"><thead><tr><th>奖品</th><th>奖池</th><th>价值</th><th>库存 / 阈值</th><th>已发</th><th>权重</th><th>状态</th><th></th></tr></thead><tbody>${items.map(item=>`<tr><td><div class="prize-cell"><div class="prize-thumb">${item.img?`<img src="${attr(item.img)}" alt="">`:'无图'}</div><div><span class="cell-main">${esc(item.name)}</span><span class="cell-sub">${esc(item.level)} · ${esc(item.spec)}${item.type==='exchange'?` · 补 ${money(item.exchangeAmount)} 换 1 袋`:item.type==='cash'?' · 微信现金红包':''}</span></div></div></td><td>${esc(item.poolName)}</td><td class="money">${money(item.value)}</td><td><strong style="color:${item.stock<=item.lowStockThreshold?'var(--orange)':'inherit'}">${item.stock}</strong> / ${item.lowStockThreshold}</td><td>${item.sent}</td><td>${item.weight}</td><td>${badge(item.status)}</td><td><div class="actions">${readOnly()?'':`<button class="btn btn-small" data-edit="${item.id}">编辑</button>`}</div></td></tr>`).join('')}</tbody></table></div></section>`
  q('#add')?.addEventListener('click',()=>prizeModal(null,pools));qa('[data-edit]').forEach(button=>button.addEventListener('click',()=>prizeModal(items.find(i=>i.id===button.dataset.edit),pools)))
}

function batchModal(item,pools){
  const iso=value=>value?new Date(value).toISOString().slice(0,16):''
  openModal({title:item?'编辑批次':'新建产品批次',desc:'价格按人民币元填写，中奖率按百分比填写；每个批次与其他批次完全隔离。',content:`<div class="form-grid">${item?'':field('批次编号','id','','text','required pattern="[A-Za-z0-9_-]{2,40}"')}${field('批次名称','name',item?.name||'','text','required')}${field('产品档位','productTier',item?.productTier||'','text','required')}${field('产品价格（元）','priceYuan',yuanFromCents(item?.priceCents??0),'number','required min="0" max="100000" step="0.01" inputmode="decimal"','直接填写包装售价，例如 30 表示 ¥30.00。')}${selectField('独立奖池','poolId',item?.poolId||pools[0]?.id,pools.map(p=>({value:p.id,label:`${p.name} · ${p.tier}`})))}${field('中奖率（%）','winRate',item?.winRate??10,'number','required min="0" max="100" step="0.0001"')}${selectField('状态','status',item?.status||'active',[{value:'active',label:'启用'},{value:'paused',label:'暂停'},{value:'expired',label:'已结束'}])}${field('生效时间','startsAt',iso(item?.startsAt),'datetime-local','required')}${field('失效时间','expiresAt',iso(item?.expiresAt),'datetime-local','required')}</div>`,onSubmit:async(form,close)=>{const values=Object.fromEntries(form);values.priceCents=centsFromYuan(values.priceYuan,'产品价格');delete values.priceYuan;values.winRatePpm=Math.round(Number(values.winRate)*10000);values.startsAt=new Date(values.startsAt).getTime();values.expiresAt=new Date(values.expiresAt).getTime();delete values.winRate;await api(`/admin/batches${item?'/'+item.id:''}`,{method:item?'PUT':'POST',body:values});close();toast('批次已保存');loadPage()}})
}

async function showCodes(batch){
  const data=await api(`/admin/batches/${batch.id}/codes?pageSize=100`);openModal({title:`${batch.id} · 兑换码明细`,desc:`当前显示前 ${data.items.length} 条，共 ${data.total} 条。`,width:'860px',content:`<div class="table-wrap"><table class="table"><thead><tr><th>兑换码</th><th>状态</th><th>生成时间</th><th>兑换时间</th></tr></thead><tbody>${data.items.map(item=>`<tr><td class="code">${item.code}</td><td>${badge(item.status)}</td><td>${fmt(item.createdAt)}</td><td>${fmt(item.redeemedAt)}</td></tr>`).join('')}</tbody></table></div>`})
}

function generateCodes(batch){openModal({title:`为 ${batch.id} 生成兑换码`,desc:'系统使用安全随机数生成全局唯一的 6 位纯数字兑换码。',content:`${field('生成数量','count',100,'number','required min="1" max="50000"')}<p class="hint">单次最多 50,000 个；生成后可导出 Excel 交付印刷或包装环节。每个兑换码只能成功兑奖一次。</p>`,submit:'确认生成',onSubmit:async(form,close)=>{const result=await api(`/admin/batches/${batch.id}/codes/generate`,{method:'POST',body:{count:Number(form.get('count'))}});close();toast('兑换码生成完成',`本次成功生成 ${result.count} 个`);loadPage()}})}

async function batchesPage(main){
  const [items,pools]=await Promise.all([api('/admin/batches'),api('/admin/pools')]);main.innerHTML=pageHead('batches',readOnly()?'':`<button class="btn btn-primary" id="add">＋ 新建批次</button>`)+`<section class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>批次</th><th>产品 / 售价 / 奖池</th><th>中奖率</th><th>有效期</th><th>兑换码状态</th><th>状态</th><th></th></tr></thead><tbody>${items.map(item=>`<tr><td><span class="cell-main code">${item.id}</span><span class="cell-sub">${esc(item.name)}</span></td><td>${esc(item.productTier)}<span class="cell-sub">${money(item.price)} · ${esc(item.poolName)}</span></td><td><strong>${item.winRate}%</strong></td><td>${fmt(item.startsAt)}<span class="cell-sub">至 ${fmt(item.expiresAt)}</span></td><td><span class="cell-main">${item.codeStats.unused} 未用</span><span class="cell-sub">${item.codeStats.redeemed} 已兑 · ${item.codeStats.verified} 已核</span></td><td>${badge(item.status)}</td><td><div class="actions"><button class="btn btn-small" data-codes="${item.id}">查看</button><button class="btn btn-small" data-export="${item.id}">导出</button>${readOnly()?'':`<button class="btn btn-small" data-generate="${item.id}">生成</button><button class="btn btn-small" data-edit="${item.id}">编辑</button>`}</div></td></tr>`).join('')}</tbody></table></div></section>`
  q('#add')?.addEventListener('click',()=>batchModal(null,pools));qa('[data-edit]').forEach(b=>b.addEventListener('click',()=>batchModal(items.find(i=>i.id===b.dataset.edit),pools)));qa('[data-codes]').forEach(b=>b.addEventListener('click',()=>showCodes(items.find(i=>i.id===b.dataset.codes))));qa('[data-generate]').forEach(b=>b.addEventListener('click',()=>generateCodes(items.find(i=>i.id===b.dataset.generate))));qa('[data-export]').forEach(b=>b.addEventListener('click',()=>download(`/admin/batches/${b.dataset.export}/codes/export`,`兑换码-${b.dataset.export}.xls`)))
}

function salesModal(item){
  const passwordOptions=item?'minlength="8" maxlength="128" autocomplete="new-password"':'required minlength="8" maxlength="128" autocomplete="new-password"'
  openModal({title:item?'编辑销售账号':'新增公司销售',desc:'销售登录总部后台后，只能查看和管理由自己创建的门店及其门店账号。',content:`<div class="form-grid">
    ${field('登录账号','username',item?.username||'','text','required maxlength="80" autocomplete="off"','建议使用销售姓名拼音或工号，平台内不可重复。')}
    ${field(item?'重置密码（可不填）':'初始密码','password','','password',passwordOptions,item?'不修改密码时请留空。':'至少 8 位，创建后请安全交付给销售本人。')}
    ${field('销售姓名','name',item?.name||'','text','required maxlength="100"')}
    ${selectField('账号状态','active',item?.active===false?'0':'1',[{value:'1',label:'启用，可正常登录'},{value:'0',label:'停用，禁止登录'}])}
    <div class="guide-example span-2"><strong>固定数据权限</strong><p>可新增、编辑本人门店，并为本人门店创建店主或店员账号。看不到其他销售门店，也不能进入奖池、订单、用户、设置和审计功能。</p></div>
  </div>`,onSubmit:async(form,close)=>{const values=Object.fromEntries(form);values.active=values.active==='1';if(!values.password)delete values.password;await api(`/admin/sales${item?'/'+item.id:''}`,{method:item?'PATCH':'POST',body:values});close();toast(item?'销售账号已更新':'销售账号已创建',`${values.name} · ${values.username}`);loadPage()}})
}

async function salesPage(main){
  const items=await api('/admin/sales')
  main.innerHTML=pageHead('sales','<button class="btn btn-primary" id="add">＋ 新增销售</button>')+`<section class="panel"><header class="panel-head"><div><h2>公司销售账号</h2><p>共 ${items.length} 个账号。停用销售不会删除其已创建门店，门店归属仍会保留。</p></div></header><div class="table-wrap"><table class="table"><thead><tr><th>销售</th><th>登录账号</th><th>创建门店</th><th>最近登录</th><th>状态</th><th></th></tr></thead><tbody>${items.map(item=>`<tr><td><span class="cell-main">${esc(item.name)}</span><span class="cell-sub code">${item.id}</span></td><td class="code">${esc(item.username)}</td><td><strong>${item.storeCount}</strong> 家</td><td>${fmt(item.lastLoginAt)}</td><td>${badge(item.active?'active':'disabled')}</td><td><div class="actions"><button class="btn btn-small" data-edit="${item.id}">编辑 / 重置密码</button></div></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty"><strong>还没有销售账号</strong>新增后，销售即可登录后台创建并管理自己的门店。</div></td></tr>'}</tbody></table></div></section>`
  q('#add')?.addEventListener('click',()=>salesModal())
  qa('[data-edit]').forEach(button=>button.addEventListener('click',()=>salesModal(items.find(item=>item.id===button.dataset.edit))))
}

function storeModal(item){
  let imageUploading=false
  openModal({title:item?'编辑门店':'新增核销门店',desc:'地址和高德坐标会用于消费者选店、距离计算和核销定位。',content:`<div class="form-grid">
    ${field('门店全称','name',item?.name||'','text','required maxlength="120"')}${field('门店简称','short',item?.short||'','text','required maxlength="80"')}
    ${field('联系电话','phone',item?.phone||'','text','required maxlength="40"')}${field('营业时间','hours',item?.hours||'','text','required maxlength="80"')}
    ${field('经度（Longitude）','longitude',item?.longitude??112.97,'number','required min="-180" max="180" step="0.000001"','高德地图坐标的第一个数字，例如 112.976000。')}${field('纬度（Latitude）','latitude',item?.latitude??28.19,'number','required min="-90" max="90" step="0.000001"','高德地图坐标的第二个数字，例如 28.194200。')}
    <div class="location-tools span-2"><div><strong>请使用 GCJ-02（高德/腾讯）坐标</strong><p>填写后先在地图中验证，确认标记落在门店入口附近，再保存。不要直接填未经转换的 GPS 坐标。</p></div><div class="location-actions"><button class="btn btn-small" type="button" id="verify-location">在高德地图验证</button><a class="btn btn-small" href="https://lbs.amap.com/api/uri-api/gettingstarted" target="_blank" rel="noopener">坐标说明</a></div></div>
    <div class="field span-2"><label for="f-addr">详细地址</label><textarea class="textarea" id="f-addr" name="addr" required maxlength="300">${esc(item?.addr||'')}</textarea><small class="field-help">地址用于列表展示和人工确认，定位与距离计算以经纬度为准。</small></div>
    ${imageUploadField({label:'门店图片',name:'img',value:item?.img||'',title:'上传门店门头或店内环境图',description:'建议 1200 × 800 横版，画面清晰、便于顾客识别；支持 PNG、JPG、WebP，不超过 5MB。',preview:'landscape'})}
    ${selectField('状态','status',item?.status||'active',[{value:'active',label:'启用'},{value:'disabled',label:'停用'}])}
  </div>`,onSubmit:async(form,close)=>{if(imageUploading)throw new Error('图片仍在上传，请稍候');const values=Object.fromEntries(form);values.latitude=Number(values.latitude);values.longitude=Number(values.longitude);await api(`/admin/stores${item?'/'+item.id:''}`,{method:item?'PUT':'POST',body:values});close();toast('门店已保存');loadPage()}})
  bindImageUploader(q('[data-image-uploader]',overlay),busy=>{imageUploading=busy;const submit=q('#modal-form [type=submit]',overlay);if(submit)submit.disabled=busy})
  const rewardType=q('[name=type]',overlay);const syncRewardFields=()=>{const exchange=rewardType.value==='exchange';q('[data-exchange-fields]',overlay).hidden=!exchange;const amount=q('[name=exchangeYuan]',overlay);amount.disabled=!exchange;amount.required=exchange;q('[data-cash-hint]',overlay).hidden=rewardType.value!=='cash'};rewardType.addEventListener('change',syncRewardFields);syncRewardFields()
  q('#verify-location',overlay)?.addEventListener('click',()=>{
    const longitude=Number(q('[name=longitude]',overlay).value);const latitude=Number(q('[name=latitude]',overlay).value);const name=q('[name=name]',overlay).value.trim()||'待确认门店'
    if(!Number.isFinite(longitude)||longitude < -180||longitude > 180||!Number.isFinite(latitude)||latitude < -90||latitude > 90){toast('坐标格式不正确','请先填写有效的经度和纬度','error');return}
    const url=`https://uri.amap.com/marker?position=${encodeURIComponent(`${longitude},${latitude}`)}&name=${encodeURIComponent(name)}&src=jinlangji&coordinate=gaode&callnative=0`
    window.open(url,'_blank','noopener')
  })
}

function deleteStoreModal(item){
  const hasHistory=Number(item.redemptionCount||0)>0
  openModal({
    title:hasHistory?'该门店不能删除':`删除门店「${item.short}」`,
    desc:hasHistory?'正式兑奖和核销记录需要永久保留。':'删除后无法恢复，请核对门店与账号信息。',
    content:hasHistory
      ? `<div class="guide-example"><strong>已有 ${item.redemptionCount} 条业务关联记录</strong><p>请关闭此窗口，点击“编辑”，把门店状态改为“停用”。停用后消费者不能再选择该门店，但历史订单仍可正常查询。</p></div>`
      : `<div class="guide-example"><strong>将同时删除 ${item.accountCount||0} 个门店账号</strong><p>门店、店主和店员账号会永久删除。该门店当前没有兑奖或核销记录，可以安全删除。</p></div>`,
    submit:'确认删除门店',danger:true,
    onSubmit:hasHistory?null:async(form,close)=>{const result=await api(`/admin/stores/${item.id}`,{method:'DELETE'});close();toast('门店已删除',`同时删除 ${result.deleted.accounts} 个门店账号`);loadPage()}
  })
}

function storeLocationGuide(){return `<details class="guide-panel" id="store-guide"><summary><span><strong>门店定位与删除说明</strong><small>新增前先取得高德坐标，保存前完成地图验证</small></span><span class="guide-toggle">展开 / 收起</span></summary><div class="guide-body"><ol class="guide-steps"><li><strong>搜索门店地址</strong><span>在高德地图确认门店入口，不要只定位到街道或商场中心。</span></li><li><strong>复制经纬度</strong><span>第一个数字填经度，第二个数字填纬度，使用 GCJ-02 坐标。</span></li><li><strong>打开地图验证</strong><span>在新增或编辑窗口点击“在高德地图验证”，确认落点后保存。</span></li><li><strong>删除或停用</strong><span>无业务记录可直接删除；已有兑奖或核销记录的门店只能停用。</span></li></ol></div></details>`}

async function storeAccountsModal(store){
  const accounts=await api(`/admin/stores/${store.id}/accounts`)
  const rows=accounts.map(a=>`<tr><td><span class="cell-main">${esc(a.name)}</span><span class="cell-sub">${esc(a.phone)}</span></td><td class="code">${esc(a.username)}</td><td>${a.role==='owner'?'店主':'店员'}</td><td>${badge(a.active?'active':'disabled')}</td><td>${fmt(a.lastLoginAt)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty account-empty"><strong>还没有门店账号</strong>请先创建一个店主账号，店主登录后可以继续添加店员。</div></td></tr>'
  const create=readOnly()?'':`<div id="account-create" class="account-create"><div class="account-create-head"><div><h3>创建门店账号</h3><p>登录账号在整个平台内不可重复，保存后可以立即用于门店端登录。</p></div></div><div class="form-grid account-create-grid">${field('登录账号','username','','text','required maxlength="80" autocomplete="off"','建议使用门店简称加人员姓名，例如 cs_wang。')}${field('初始密码','password','','password','required minlength="8" maxlength="128" autocomplete="new-password"','至少 8 位，创建后请交由本人妥善保存。')}${field('人员姓名','name','','text','required maxlength="80"')}${field('联系电话','phone','','tel','maxlength="30"')}${selectField('账号角色','role','owner',[{value:'owner',label:'店主，可管理本店数据与店员'},{value:'staff',label:'店员，仅可核销'}])}<div class="account-create-actions"><span>新门店建议先创建一个店主账号。</span><button class="btn btn-primary" type="submit" data-create-account>创建账号</button></div></div></div>`
  openModal({title:`${store.short} · 门店账号`,desc:`当前 ${accounts.length} 个账号。店主可查看本店经营数据和管理员工；店员仅可核销。`,width:'860px',content:`${create}<div class="table-wrap account-table"><table class="table"><thead><tr><th>人员</th><th>登录账号</th><th>角色</th><th>状态</th><th>最近登录</th></tr></thead><tbody>${rows}</tbody></table></div>`})
  const form=q('#modal-form')
  if(readOnly()||!form)return
  form.addEventListener('submit',async event=>{event.preventDefault();const button=q('[data-create-account]',form);if(!button||button.disabled)return;const values=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent='正在创建…';try{await api(`/admin/stores/${store.id}/accounts`,{method:'POST',body:values});toast('账号创建成功',`${values.name} · ${values.username}`);overlay.innerHTML='';await storeAccountsModal(store)}catch(error){toast('创建失败',error.message,'error');button.disabled=false;button.textContent='创建账号'}})
}

async function storesPage(main){
  const items=await api('/admin/stores');const salesScope=state.user?.role==='sales';const creatorHead=salesScope?'':'<th>创建销售</th>';const scopeNote=salesScope?`<div class="scope-note"><strong>当前为销售专属视图</strong><span>这里只显示由你创建的 ${items.length} 家门店，其他销售的门店在接口层已隔离。</span></div>`:'';main.innerHTML=pageHead('stores',`${state.user?.role==='super_admin'?'<button class="btn" id="manage-sales">销售账号</button>':''}${readOnly()?'':`<button class="btn btn-primary" id="add">＋ 新增门店</button>`}<button class="btn" id="show-store-guide">定位说明</button>`)+scopeNote+storeLocationGuide()+`<section class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>门店</th>${creatorHead}<th>地址 / 坐标</th><th>营业信息</th><th>账号</th><th>兑奖关联 / 已核销</th><th>状态</th><th></th></tr></thead><tbody>${items.map(item=>`<tr><td><span class="cell-main">${esc(item.short)}</span><span class="cell-sub code">${item.id}</span></td>${salesScope?'':`<td>${esc(item.createdByName||'历史门店')}<span class="cell-sub">${esc(item.createdByUsername||'未记录创建人')}</span></td>`}<td>${esc(item.addr)}<span class="cell-sub code">${Number(item.longitude).toFixed(6)}, ${Number(item.latitude).toFixed(6)}</span></td><td>${esc(item.hours)}<span class="cell-sub">${esc(item.phone)}</span></td><td>${item.accountCount}</td><td>${item.redemptionCount} / ${item.verifiedCount}</td><td>${badge(item.status)}</td><td><div class="actions"><button class="btn btn-small" data-accounts="${item.id}">账号</button>${readOnly()?'':`<button class="btn btn-small" data-edit="${item.id}">编辑</button><button class="btn btn-small btn-danger" data-delete-store="${item.id}">删除</button>`}</div></td></tr>`).join('')||`<tr><td colspan="${salesScope?7:8}"><div class="empty"><strong>还没有门店</strong>点击“新增门店”录入第一家合作门店，并继续创建门店登录账号。</div></td></tr>`}</tbody></table></div></section>`
  q('#manage-sales')?.addEventListener('click',()=>{location.hash='sales'})
  q('#add')?.addEventListener('click',()=>storeModal());q('#show-store-guide')?.addEventListener('click',()=>{const guide=q('#store-guide');guide.open=true;guide.scrollIntoView({behavior:'smooth',block:'center'})});qa('[data-edit]').forEach(b=>b.addEventListener('click',()=>storeModal(items.find(i=>i.id===b.dataset.edit))));qa('[data-delete-store]').forEach(b=>b.addEventListener('click',()=>deleteStoreModal(items.find(i=>i.id===b.dataset.deleteStore))));qa('[data-accounts]').forEach(b=>b.addEventListener('click',()=>storeAccountsModal(items.find(i=>i.id===b.dataset.accounts))))
}

function ordersTable(items,actions=true){return items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>订单 / 兑换码</th><th>消费者</th><th>结果</th><th>状态</th><th>意向 / 核销门店</th><th>时间</th>${actions?'<th></th>':''}</tr></thead><tbody>${items.map(item=>`<tr><td><span class="cell-main code">${esc(item.code)}</span><span class="cell-sub">${esc(item.orderNo)}</span></td><td>${esc(item.userNick)}<span class="cell-sub">${esc(item.userPhone)}</span></td><td>${item.win?`<span class="cell-main">${esc(item.prizeName)}</span><span class="cell-sub money">${money(item.prizeValue)}</span>`:'未中奖'}</td><td>${badge(item.status,item.prizeType==='cash'?(item.cashState==='SUCCESS'?'已到账':'现金待领取'):'')}</td><td>${item.prizeType==='cash'?'微信零钱':esc(item.storeName||item.preferStoreName||'—')}<span class="cell-sub">${item.verifiedBy?`由 ${esc(item.verifiedBy)} 核销`:''}</span></td><td>${fmt(item.redeemAt)}<span class="cell-sub">${item.verifiedAt?`核销 ${fmt(item.verifiedAt)}`:`截止 ${fmt(item.expireAt)}`}</span></td>${actions?`<td><div class="actions">${item.status==='pending'&&!readOnly()?`<button class="btn btn-small btn-danger" data-freeze="${item.id}">冻结</button>`:''}${item.status==='frozen'&&!readOnly()?`<button class="btn btn-small" data-unfreeze="${item.id}">解冻</button>`:''}</div></td>`:''}</tr>`).join('')}</tbody></table></div>`:empty('没有符合条件的订单')}

async function ordersPage(main,filters={page:1,status:'',storeId:'',keyword:''}){
  const queryString=new URLSearchParams({page:filters.page,pageSize:20,...(filters.status?{status:filters.status}:{}),...(filters.storeId?{storeId:filters.storeId}:{}),...(filters.keyword?{keyword:filters.keyword}:{})});const [data,stores]=await Promise.all([api('/admin/redemptions?'+queryString),api('/admin/stores')]);const exportQuery=new URLSearchParams({...(filters.status?{status:filters.status}:{}),...(filters.storeId?{storeId:filters.storeId}:{}),...(filters.keyword?{keyword:filters.keyword}:{})});const selectedStore=stores.find(store=>store.id===filters.storeId);const hasFilter=Boolean(filters.status||filters.storeId||filters.keyword)
  main.innerHTML=pageHead('orders',`<button class="btn" id="export">⇩ ${hasFilter?'导出筛选结果':'导出全部订单'}</button>`)+`<section class="panel"><form class="filters" id="order-filter"><div class="field grow"><label>订单、兑换码、昵称或手机</label><input class="input" name="keyword" value="${attr(filters.keyword)}" placeholder="输入关键词"></div>${selectField('意向或核销门店','storeId',filters.storeId,[{value:'',label:'全部门店'},...stores.map(store=>({value:store.id,label:`${store.short}（${store.id}）`}))])}${selectField('订单状态','status',filters.status,[{value:'',label:'全部状态'},{value:'pending',label:'待核销'},{value:'verified',label:'已核销'},{value:'frozen',label:'已冻结'},{value:'expired',label:'已过期'},{value:'lose',label:'未中奖'}])}<button class="btn btn-primary" type="submit">查询</button></form>${ordersTable(data.items)}${pager(data,filters.page,page=>ordersPage(main,{...filters,page}))}</section>`
  q('#export').addEventListener('click',()=>download(`/admin/redemptions/export${exportQuery.size?'?'+exportQuery:''}`,selectedStore?`${selectedStore.short}-兑奖订单.xls`:'兑奖订单.xls'));q('#order-filter').addEventListener('submit',event=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));ordersPage(main,{page:1,...form})});qa('[data-freeze]').forEach(b=>b.addEventListener('click',()=>openModal({title:'冻结兑奖订单',desc:'冻结后门店无法核销，原因会在门店端明确显示并写入审计日志。',danger:true,submit:'确认冻结',content:`<div class="field"><label for="f-reason">冻结原因</label><textarea class="textarea" id="f-reason" name="reason" required placeholder="请说明风险信号或复核事项"></textarea></div>`,onSubmit:async(form,close)=>{await api(`/admin/redemptions/${b.dataset.freeze}/freeze`,{method:'POST',body:{reason:form.get('reason')}});close();toast('订单已冻结');ordersPage(main,filters)}})));qa('[data-unfreeze]').forEach(b=>b.addEventListener('click',async()=>{try{await api(`/admin/redemptions/${b.dataset.unfreeze}/unfreeze`,{method:'POST',body:{}});toast('订单已解冻');ordersPage(main,filters)}catch(error){toast('解冻失败',error.message,'error')}}))
}

async function customersPage(main,filters={page:1,keyword:'',blocked:''}){
  const queryString=new URLSearchParams({page:filters.page,pageSize:20,...(filters.keyword?{keyword:filters.keyword}:{}),...(filters.blocked?{blocked:'1'}:{})});const data=await api('/admin/customers?'+queryString)
  main.innerHTML=pageHead('customers')+`<section class="panel"><form class="filters" id="customer-filter"><div class="field grow"><label>昵称、手机或 OpenID</label><input class="input" name="keyword" value="${attr(filters.keyword)}" placeholder="输入关键词"></div>${selectField('账号范围','blocked',filters.blocked,[{value:'',label:'全部用户'},{value:'1',label:'仅受限用户'}])}<button class="btn btn-primary">查询</button></form><div class="table-wrap"><table class="table"><thead><tr><th>用户</th><th>OpenID</th><th>参与 / 中奖</th><th>注册时间</th><th>状态</th><th></th></tr></thead><tbody>${data.items.map(item=>`<tr><td><span class="cell-main">${esc(item.nick)}</span><span class="cell-sub">${esc(item.phone)}</span></td><td class="code">${esc(item.openid)}</td><td>${item.redemptionCount} / ${item.winCount}</td><td>${fmt(item.createdAt)}</td><td>${item.blocked?badge('disabled','已限制'):badge('active','正常')}</td><td><div class="actions">${readOnly()?'':item.blocked?`<button class="btn btn-small" data-unblock="${item.id}">解除限制</button>`:`<button class="btn btn-small btn-danger" data-block="${item.id}">限制参与</button>`}</div></td></tr>`).join('')}</tbody></table></div>${pager(data,filters.page,page=>customersPage(main,{...filters,page}))}</section>`
  q('#customer-filter').addEventListener('submit',event=>{event.preventDefault();customersPage(main,{page:1,...Object.fromEntries(new FormData(event.currentTarget))})});qa('[data-block]').forEach(b=>b.addEventListener('click',()=>openModal({title:'限制用户参与',desc:'被限制账号无法继续提交兑换码；历史记录不会删除。',danger:true,submit:'确认限制',content:`<div class="field"><label for="f-reason">限制原因</label><textarea class="textarea" id="f-reason" name="reason" required></textarea></div>`,onSubmit:async(form,close)=>{await api(`/admin/customers/${b.dataset.block}/blacklist`,{method:'POST',body:{blocked:true,reason:form.get('reason')}});close();toast('用户已限制');customersPage(main,filters)}})));qa('[data-unblock]').forEach(b=>b.addEventListener('click',async()=>{try{await api(`/admin/customers/${b.dataset.unblock}/blacklist`,{method:'POST',body:{blocked:false}});toast('限制已解除');customersPage(main,filters)}catch(error){toast('操作失败',error.message,'error')}}))
}

async function auditPage(main,filters={page:1,actorType:'',keyword:''}){
  const queryString=new URLSearchParams({page:filters.page,pageSize:30,...(filters.actorType?{actorType:filters.actorType}:{}),...(filters.keyword?{keyword:filters.keyword}:{})});const data=await api('/admin/audit?'+queryString)
  main.innerHTML=pageHead('audit')+`<section class="panel"><form class="filters" id="audit-filter"><div class="field grow"><label>操作者、业务对象或结果</label><input class="input" name="keyword" value="${attr(filters.keyword)}" placeholder="输入关键词"></div>${selectField('操作者类型','actorType',filters.actorType,[{value:'',label:'全部来源'},{value:'customer',label:'消费者'},{value:'store',label:'门店'},{value:'admin',label:'总部'},{value:'system',label:'系统'}])}<button class="btn btn-primary">查询</button></form><div class="table-wrap"><table class="table"><thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>业务对象</th><th>门店 / 位置</th><th>结果</th></tr></thead><tbody>${data.items.map(item=>`<tr><td>${fmt(item.at)}</td><td><span class="cell-main">${esc(item.byName||item.actorType)}</span><span class="cell-sub code">${esc(item.byId)}</span></td><td class="code">${esc(item.action)}</td><td>${esc(item.entityType)}<span class="cell-sub code">${esc(item.entityId)}</span></td><td>${esc(item.storeId||'—')}<span class="cell-sub">${esc(item.pos)}</span></td><td>${esc(item.result)}</td></tr>`).join('')}</tbody></table></div>${pager(data,filters.page,page=>auditPage(main,{...filters,page}))}</section>`
  q('#audit-filter').addEventListener('submit',event=>{event.preventDefault();auditPage(main,{page:1,...Object.fromEntries(new FormData(event.currentTarget))})})
}

async function notificationsPage(main,filters={page:1,status:''}){
  const queryString=new URLSearchParams({page:filters.page,pageSize:30,...(filters.status?{status:filters.status}:{})});const data=await api('/admin/notifications?'+queryString)
  main.innerHTML=pageHead('notifications',readOnly()?'':`<button class="btn btn-primary" id="process-notices">▶ 立即处理消息</button>`)+`<section class="panel"><form class="filters" id="notice-filter">${selectField('投递状态','status',filters.status,[{value:'',label:'全部状态'},{value:'pending',label:'待发送'},{value:'sent',label:'已发送'},{value:'failed',label:'发送失败'},{value:'skipped',label:'未配置/已跳过'}])}<button class="btn btn-primary">查询</button></form><div class="table-wrap"><table class="table"><thead><tr><th>创建时间</th><th>用户</th><th>消息类型</th><th>内容</th><th>重试</th><th>状态</th></tr></thead><tbody>${data.items.map(item=>`<tr><td>${fmt(item.created_at)}</td><td class="code">${esc(item.customer_id)}</td><td>${esc(item.type)}</td><td><span class="cell-main">${esc(item.payload?.title)}</span><span class="cell-sub">${esc(item.payload?.description)}</span></td><td>${item.attempts}</td><td>${badge(item.status)}</td></tr>`).join('')}</tbody></table></div>${pager(data,filters.page,page=>notificationsPage(main,{...filters,page}))}</section>`
  q('#notice-filter').addEventListener('submit',event=>{event.preventDefault();notificationsPage(main,{page:1,...Object.fromEntries(new FormData(event.currentTarget))})})
  q('#process-notices')?.addEventListener('click',async()=>{try{const result=await api('/admin/notifications/process',{method:'POST',body:{}});toast('消息队列处理完成',`发送 ${result.sent}，失败 ${result.failed}，未配置 ${result.skipped}`);notificationsPage(main,filters)}catch(error){toast('处理失败',error.message,'error')}})
}

const pageRenderers={dashboard:dashboardPage,settings:settingsPage,pools:poolsPage,prizes:prizesPage,cash:cashPage,batches:batchesPage,stores:storesPage,sales:salesPage,orders:ordersPage,customers:customersPage,audit:auditPage,notifications:notificationsPage}

renderApp()

async function cashPage(main){
 const data=await api('/admin/cash-rewards');main.innerHTML=pageHead('cash', '<button class="btn" id="cash-refresh">刷新状态</button>')+`<section class="panel"><header class="panel-head"><div><h2>现金奖励领取记录</h2><p>${data.ready?'商户领取接口已配置':'商户领取接口尚未配置，当前不会发起真实转账'} · 最近 200 条</p></div></header>${data.items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>兑换码 / 转账单号</th><th>顾客</th><th>红包金额</th><th>微信状态</th><th>核对信息</th><th>更新时间</th></tr></thead><tbody>${data.items.map(item=>`<tr><td><strong class="code">${esc(item.code)}</strong><span class="cell-sub">${esc(item.out_bill_no)}</span></td><td>${esc(item.nickname)}</td><td class="money">${money(item.amount_cents/100)}</td><td>${esc(item.label)}</td><td>${esc(item.last_error||'—')}</td><td>${fmt(item.updated_at)}</td></tr>`).join('')}</tbody></table></div>`:empty('暂无红包领取记录','用户中奖并点击领取后，在这里查看处理状态。')}</section>`;q('#cash-refresh').addEventListener('click',()=>loadPage())
}
