import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export async function buildEntry(root, output) {
  const assets = JSON.parse(await readFile(path.join(root, 'source/entry-assets.json'), 'utf8'));
  await mkdir(path.join(output, 'assets/entry'), { recursive: true });
  for (const { file } of assets) await copyFile(path.join(root, 'source/entry-assets', file), path.join(output, 'assets/entry', file));
  for (const extension of ['css', 'js']) await copyFile(path.join(root, `source/entry-screen.${extension}`), path.join(output, `entry-screen.${extension}`));
  return readFile(path.join(root, 'source/entry-screen.html'), 'utf8');
}

export async function updateEntryManifest(root, output, manifestPath) {
  const assets = JSON.parse(await readFile(path.join(root, 'source/entry-assets.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const asset of assets) {
    const file = `assets/entry/${asset.file}`;
    const bytes = await readFile(path.join(output, file));
    const entry = { ...asset, id: `entry-${path.parse(asset.file).name}`, file, path: `${path.basename(output)}/${file}`, kind: 'image', used: true, review: 'agent-checked', sizeBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), sourceNodes: [asset.nodeId], source: { fileKey: 'CymBugfH4yExnxXn14xaRv', nodeId: asset.nodeId }, designContext: '141:52212' };
    const index = manifest.assets.findIndex(item => item.file === file);
    if (index < 0) manifest.assets.push(entry);
    else manifest.assets[index] = entry;
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
