'use client';
import { useState } from 'react';
import type { ManagedProject } from '../../lib/store';
const empty=():ManagedProject=>({id:0,slug:'',title:'',description:'',cover:'',coverAlt:'',images:[],videos:[],placeholderNumber:'',placeholderLabel:'PROJECT IMAGE PLACEHOLDER',detail:{category:'',year:String(new Date().getFullYear()),headline:'',introduction:'',approach:''},published:false,placement:'more',order:0});
export default function Manager({initial}:{initial:ManagedProject[]}){
 const [projects,setProjects]=useState(initial);const [work,setWork]=useState<ManagedProject>(initial[0]||empty());
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [dirty,setDirty]=useState(false);
 function change(patch:Partial<ManagedProject>){setWork(previous=>({...previous,...patch}));setDirty(true);}
 function choose(project:ManagedProject){if(dirty&&!window.confirm('放棄尚未儲存的修改？'))return;setWork(structuredClone(project));setDirty(false);setMessage('');}
 async function api(url:string,options:RequestInit){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw Error(data.error||'操作失敗');return data;}
 async function upload(file:File|undefined,field:'cover'|'images'|'videos'){
  if(!file)return;if(file.size>100*1024*1024){setMessage('檔案上限為 100 MB');return;}
  setBusy(true);setMessage('上傳中…');try{const form=new FormData();form.set('file',file);const result=await api('/api/admin/upload',{method:'POST',body:form});
   if((field==='videos')!==result.type.startsWith('video/'))throw Error('請選擇正確的圖片或影片類型');
   change(field==='cover'?{cover:result.url}:{[field]:[...work[field],result.url]});setMessage('素材已上傳，請按「儲存作品」套用。');
  }catch(error){setMessage(error instanceof Error?error.message:'上傳失敗');}finally{setBusy(false);}
 }
 const field=(key:'title'|'slug'|'description'|'coverAlt',label:string)=><label>{label}<input value={work[key]} required={key==='title'||key==='slug'} onChange={e=>change({[key]:e.target.value})}/></label>;
 return <main className="admin"><header><h1>作品管理</h1><div className="admin-actions"><a href="/" target="_blank" rel="noreferrer">查看網站 ↗</a><button disabled={busy} onClick={async()=>{if(dirty&&!confirm('放棄尚未儲存的修改並登出？'))return;try{await api('/api/admin/logout',{method:'POST'});location.assign('/admin/login');}catch(e){setMessage(String(e));}}}>登出</button></div></header>
 <div className="admin-grid"><aside className="admin-list"><button disabled={busy} onClick={()=>choose({...empty(),order:projects.length})}>＋ 新增作品</button>{projects.map(p=><button disabled={busy} key={p.id} aria-pressed={p.id===work.id} onClick={()=>choose(p)}>{p.title}<br/><small>{p.published?'已發布':'草稿'} · {p.placement==='selected'?'主要作品':'More Works'} · {p.order}</small></button>)}</aside>
 <form className="admin-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const data=await api('/api/admin/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(work)});setProjects(data.projects);setWork(data.project);setDirty(false);setMessage('已儲存。已發布的內容會在網站重新整理後顯示。');}catch(error){setMessage(error instanceof Error?error.message:'儲存失敗');}finally{setBusy(false);}}}>
 <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="admin-form">
 <div className="admin-row">{field('title','作品名稱')}{field('slug','網址名稱（小寫英文、數字、-）')}</div>
 <div className="admin-row"><label>首頁分區<select value={work.placement} onChange={e=>change({placement:e.target.value as ManagedProject['placement']})}><option value="selected">主要作品</option><option value="more">More Works</option></select></label><label>排序（數字越小越前）<input type="number" min={0} max={10000} required value={work.order} onChange={e=>change({order:Number(e.target.value)})}/></label></div>
 <label><span><input type="checkbox" checked={work.published} onChange={e=>change({published:e.target.checked})}/> 發布至網站（不勾選則為草稿）</span></label>
 {field('description','首頁作品說明')}
 <label>封面路徑<input value={work.cover} onChange={e=>change({cover:e.target.value})}/><input aria-label="上傳封面" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e=>{void upload(e.target.files?.[0],'cover');e.target.value='';}}/></label>
 {work.cover&&<img className="admin-thumb" src={work.cover} alt="封面預覽"/>}{field('coverAlt','封面圖片描述')}
 {(['category','year','headline','introduction','approach'] as const).map((key,i)=><label key={key}>{['分類','年份','詳情頁標題','作品介紹','設計方法'][i]}<textarea value={work.detail[key]} onChange={e=>change({detail:{...work.detail,[key]:e.target.value}})}/></label>)}
 {(['images','videos'] as const).map(key=><label key={key}>{key==='images'?'圖片清單（每行一個路徑，順序就是展示順序）':'影片清單（第一個用作 More Works 預覽）'}<textarea value={work[key].join('\n')} onChange={e=>change({[key]:e.target.value.split('\n')})}/><input type="file" accept={key==='images'?'image/jpeg,image/png,image/gif,image/webp':'video/mp4'} onChange={e=>{void upload(e.target.files?.[0],key);e.target.value='';}}/></label>)}
 <p className="admin-help">圖片支援 JPG、PNG、GIF、WebP；影片支援 MP4。單檔最多 100 MB。刪除清單中的路徑只會移除展示，素材檔案會保留。</p>
 </div></fieldset>
 <div className="admin-actions"><button disabled={busy} type="submit">{busy?'處理中…':'儲存作品'}</button>{work.id>0&&<button disabled={busy} type="button" onClick={async()=>{if(!confirm(`確定刪除「${work.title}」？作品資料會刪除，素材檔案保留。`))return;setBusy(true);try{const result=await api('/api/admin/projects',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:work.id})});setProjects(result.projects);setWork(result.projects[0]||empty());setDirty(false);setMessage('已刪除作品');}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>刪除作品</button>}{work.published&&work.id>0&&<a href={`/works/${work.slug}`} target="_blank" rel="noreferrer">查看作品 ↗</a>}</div>
 <p className="admin-status" role="status">{message}</p>
 </form></div></main>;
}
