import { redirect } from 'next/navigation';
import { authenticated } from '../../lib/auth';
import { database } from '../../lib/db';
import { listProjects } from '../../lib/store';
import Manager from './Manager';
import './admin.css';
export const dynamic='force-dynamic';
export default async function AdminPage(){
 if(!await authenticated())redirect('/admin/login');
 return <Manager initial={listProjects(database())}/>;
}
