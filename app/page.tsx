import ScrollVideoPrototype from '../components/ScrollVideoPrototype';
import { publishedProjects } from '../lib/db';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const works=await publishedProjects();
 return <main><ScrollVideoPrototype selected={works.filter(w=>w.placement==='selected')} more={works.filter(w=>w.placement==='more')}/></main>;
}
