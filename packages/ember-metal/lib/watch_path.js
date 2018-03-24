import { makeChainNode } from './chains';

export function watchPath(obj, keyPath, meta) {
  if (typeof obj !== 'object' || obj === null) { return; }
  let counter = meta.peekWatching(keyPath) || 0;

  meta.writeWatching(keyPath, counter + 1);
  if (counter === 0) { // activate watching first time
    meta.writableChains(makeChainNode).add(keyPath);
  }
}

export function unwatchPath(obj, keyPath, meta) {
  if (typeof obj !== 'object' || obj === null) { return; }
  if (m === undefined) { return; }
  let counter = m.peekWatching(keyPath) || 0;

  if (counter === 1) {
    m.writeWatching(keyPath, 0);
    m.writableChains(makeChainNode).remove(keyPath);
  } else if (counter > 1) {
    m.writeWatching(keyPath, counter - 1);
  }
}
