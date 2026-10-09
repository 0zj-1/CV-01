import { env } from 'cloudflare:workers';
import { allWorks } from '../content/works';
import { listProjects, seedProjects } from './store';

let ready: Promise<void> | undefined;

export async function database() {
  ready ??= seedProjects(env.DB, allWorks);
  await ready;
  return env.DB;
}

export async function publishedProjects() {
  return listProjects(await database(), true);
}
