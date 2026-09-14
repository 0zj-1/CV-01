import readline from 'node:readline';
import { Writable } from 'node:stream';
import { openStore, setAdmin } from '../lib/store';
async function main(){
let hidden=false;
const output=new Writable({write(chunk,_encoding,callback){if(!hidden)process.stdout.write(chunk);callback();}});
const rl=readline.createInterface({input:process.stdin,output,terminal:true});
const ask=(question:string)=>new Promise<string>(resolve=>rl.question(question,resolve));
try {
 const email=(await ask('管理員電郵：')).trim();
 process.stdout.write('密碼（至少 12 字元，輸入不顯示）：');hidden=true;const password=await ask('');hidden=false;process.stdout.write('\n');
 process.stdout.write('再次輸入密碼：');hidden=true;const confirmation=await ask('');hidden=false;process.stdout.write('\n');
 if(password!==confirmation)throw Error('兩次密碼不一致');
 const db=openStore();setAdmin(db,email,password);db.close();console.log('管理員已設定。請開啟 /admin/login。');
} catch(error){console.error(error instanceof Error?error.message:'設定失敗');process.exitCode=1;}finally{rl.close();}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
