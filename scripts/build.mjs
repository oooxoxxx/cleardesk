import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'index.html'), join(dist, 'index.html'));
await cp(join(root, 'styles.css'), join(dist, 'styles.css'));
await cp(join(root, 'app.js'), join(dist, 'app.js'));
await cp(join(root, 'manus-routes.json'), join(dist, 'manus-routes.json'));
console.log(`ClearDesk built to ${dist}`);
