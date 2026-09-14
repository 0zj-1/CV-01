import { openStore, seedProjects, listProjects, type Store } from './store';
import { allWorks } from '../content/works';
let store: Store;
export function database() {
  if (!store) { store = openStore(); seedProjects(store, allWorks); }
  return store;
}
export function publishedProjects() { return listProjects(database(), true); }
