'use client';
import { useState } from 'react';
export default function Login(){
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 return <form className="admin-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'登入失敗');window.location.assign('/admin');}catch(error){setError(error instanceof Error?error.message:'無法連接後台');setBusy(false);}}}>
 <label>電郵<input name="email" type="email" autoComplete="username" required/></label><label>密碼<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button disabled={busy}>{busy?'登入中…':'登入'}</button><p role="alert">{error}</p></form>;
}
