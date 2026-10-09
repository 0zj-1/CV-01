import ScrollVideoPrototype from '../components/ScrollVideoPrototype';
import { publishedProjects } from '../lib/db';
import Opening from '../components/Opening/Opening';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const works=await publishedProjects();
 return <Opening><main><ScrollVideoPrototype selected={works.filter(w=>w.placement==='selected')} more={works.filter(w=>w.placement==='more')}/></main></Opening>;
}
