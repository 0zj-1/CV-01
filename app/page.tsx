import ScrollVideoPrototype from '../components/ScrollVideoPrototype';
import { publishedProjects } from '../lib/db';
import Opening from '../components/Opening/Opening';
import HeroGeometry from '../components/HeroGeometry/HeroGeometry';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const works=await publishedProjects();
 return <Opening><main><HeroGeometry/><ScrollVideoPrototype selected={works.filter(w=>w.placement==='selected')} more={works.filter(w=>w.placement==='more')}/></main></Opening>;
}
