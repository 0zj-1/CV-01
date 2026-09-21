import { redirect } from 'next/navigation';
import { authenticated } from '../../../lib/auth';
import { database } from '../../../lib/db';
import Login from './Login';
import '../admin.css';
export const dynamic='force-dynamic';
export default async function LoginPage(){
 if(await authenticated())redirect('/admin');
 const configured=!!await (await database()).prepare('SELECT id FROM admin').first();
 return <main className="admin admin-login"><h1>作品管理登入</h1>{configured?<Login/>:<><p>請先在專案終端設定管理員：</p><pre>npm run admin:setup</pre><p>完成後重新整理這一頁。</p></>}<p><a href="/">返回網站</a></p></main>;
}
