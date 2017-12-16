import { get } from './property_get';
import { descriptorFor, meta as metaFor, peekMeta } from './meta';
import { watchKey, unwatchKey } from './watch_key';
import { cacheFor } from './computed';

const FIRST_KEY = /^([^\.]+)/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

function isObject(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isVolatile(obj, keyName, meta) {
  let desc = descriptorFor(obj, keyName, meta);
  return !(desc !== undefined && desc._volatile === false);
}

class ChainWatchers {
  constructor() {
    // chain nodes that reference a key in this obj by key
    // we only create ChainWatchers when we are going to add them
    // so create this upfront
    this.chains = Object.create(null);
  }

  add(key, node) {
    let nodes = this.chains[key];
    if (nodes === undefined) {
      this.chains[key] = [node];
    } else {
      nodes.push(node);
    }
  }

  remove(key, node) {
    let nodes = this.chains[key];
    if (nodes !== undefined) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) {
          nodes.splice(i, 1);
          break;
        }
      }
    }
  }

  has(key, node) {
    let nodes = this.chains[key];
    if (nodes !== undefined) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) {
          return true;
        }
      }
    }
    return false;
  }

  revalidateAll() {
    for (let key in this.chains) {
      this.notify(key, true, undefined);
    }
  }

  revalidate(key) {
    this.notify(key, true, undefined);
  }

  // key: the string key that is part of a path changed
  // revalidate: boolean; the chains that are watching this value should revalidate
  // callback: function that will be called with the object and path that
  //           will be/are invalidated by this key change, depending on
  //           whether the revalidate flag is passed
  notify(key, revalidate, callback) {
    let nodes = this.chains[key];
    if (nodes === undefined || nodes.length === 0) {
      return;
    }

    let affected;

    if (callback) {
      affected = [];
    }

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].notify(revalidate, affected);
    }

    if (callback === undefined) {
      return;
    }

    // we gather callbacks so we don't notify them during revalidation
    for (let i = 0; i < affected.length; i += 2) {
      let obj  = affected[i];
      let path = affected[i + 1];
      callback(obj, path);
    }
  }
}

function makeChainWatcher() {
  return new ChainWatchers();
}

function makeRootChainNode(obj) {
  return new RootChainNode(obj);
}

function addChainWatcher(obj, keyName, node) {
  let m = metaFor(obj);
  m.writableChainWatchers(makeChainWatcher).add(keyName, node);
  watchKey(obj, keyName, m);
}

function removeChainWatcher(obj, keyName, node, _meta) {
  if (!isObject(obj)) { return; }

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta === undefined || meta.readableChainWatchers() === undefined) {
    return;
  }

  // make meta writable
  meta = metaFor(obj);

  meta.readableChainWatchers().remove(keyName, node);

  unwatchKey(obj, keyName, meta);
}

class RootChainNode {
  constructor(value) {
    this._value = value;
    this._chains = {};
    this._paths = {};
  }

  value() {
    return this._value;
  }

  destroy() {
  }

  // copies a top level object only
  copy(obj) {
    let ret = makeRootChainNode(obj);
    let paths = this._paths;
    let path;
    for (path in paths) {
      if (paths[path] > 0) { ret.add(path); }
    }
    return ret;
  }

  // called on the root node of a chain to setup watchers on the specified
  // path.
  add(path) {
    let paths = this._paths;
    paths[path] = (paths[path] || 0) + 1;

    let key = firstKey(path);
    let tail = path.slice(key.length + 1);

    this.chain(key, tail);
  }

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path) {
    let paths = this._paths;
    if (paths[path] > 0) {
      paths[path]--;
    }

    let key = firstKey(path);
    let tail = path.slice(key.length + 1);

    this.unchain(key, tail);
  }

  chain(key, path) {
    let chains = this._chains;
    let node = chains[key];

    if (node === undefined) {
      node = chains[key] = new ChainNode(this, key);
    }

    node.count++; // count chains...

    // chain rest of path if there is one
    if (path) {
      key = firstKey(path);
      path = path.slice(key.length + 1);
      node.chain(key, path);
    }
  }

  unchain(key, path) {
    let chains = this._chains;
    let node = chains[key];

    // unchain rest of path first...
    if (path && path.length > 1) {
      let nextKey  = firstKey(path);
      let nextPath = path.slice(nextKey.length + 1);
      node.unchain(nextKey, nextPath);
    }

    // delete node if needed.
    node.count--;
    if (node.count <= 0) {
      chains[node._key] = undefined;
      node.destroy();
    }
  }

  notify(revalidate, affected) {
    // then notify chains...
    let chains = this._chains;
    let node;
    for (let key in chains) {
      node = chains[key];
      if (node !== undefined) {
        node.notify(revalidate, affected);
      }
    }
  }

  populateAffected(keys, affected) {
    if (keys.length > 1) {
      affected.push(this.value(), keys.join('.'));
    }
  }
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
class ChainNode {
  constructor(parent, key) {
    this._parent = parent;
    this._key    = key;

    this._chains = undefined;
    this._object = undefined;
    this._value = undefined;
    this._paths = undefined;
    this.count = 0;

    let obj = parent.value();

    if (isObject(obj)) {
      this._object = obj;
      this._watching = true;
      addChainWatcher(this._object, this._key, this);
    }
  }

  value() {
    if (this._value === undefined && this._watching) {
      let obj = this._parent.value();
      this._value = lazyGet(obj, this._key);
    }
    return this._value;
  }

  destroy() {
    if (this._watching) {
      removeChainWatcher(this._object, this._key, this);
      this._watching = false; // so future calls do nothing
    }
  }

  chain(key, path) {
    let chains = this._chains;
    let node;

    if (chains === undefined) {
      chains = this._chains = Object.create(null);
    } else {
      node = chains[key];
    }

    if (node === undefined) {
      if (key === '@each') {
        node = new ArrayChainNode(this);
      } else {
        node = new ChainNode(this, key);
      }

      chains[key] = node;
    }

    node.count++; // count chains...

    // chain rest of path if there is one
    if (path) {
      key = firstKey(path);
      path = path.slice(key.length + 1);
      node.chain(key, path);
    }
  }

  unchain(key, path) {
    let chains = this._chains;
    let node = chains[key];

    // unchain rest of path first...
    if (path && path.length > 1) {
      let nextKey  = firstKey(path);
      let nextPath = path.slice(nextKey.length + 1);
      node.unchain(nextKey, nextPath);
    }

    // delete node if needed.
    node.count--;
    if (node.count <= 0) {
      chains[node._key] = undefined;
      node.destroy();
    }
  }

  notify(revalidate, affected) {
    if (revalidate && this._watching) {
      let parentValue = this._parent.value();

      if (parentValue !== this._object) {
        removeChainWatcher(this._object, this._key, this);

        if (isObject(parentValue)) {
          this._object = parentValue;
          addChainWatcher(parentValue, this._key, this);
        } else {
          this._object = undefined;
        }
      }
      this._value = undefined;
    }

    // then notify chains...
    let chains = this._chains;
    if (chains !== undefined) {
      let node;
      for (let key in chains) {
        node = chains[key];
        if (node !== undefined) {
          node.notify(revalidate, affected);
        }
      }
    }

    if (affected !== undefined) {
      this._parent.populateAffected([this._key], affected);
    }
  }

  populateAffected(keys, affected) {
    keys.unshift(this._key);
    this._parent.populateAffected(keys, affected);
  }
}


class ArrayChainNode {
  constructor(parent) {
    this._parent = parent;
    this._key = '@each';
    this._chains = undefined;
    this.count = 0;

    let obj = parent._parent.value();
    this._object = obj;
    if (isObject(obj)) {
      this._watching = true;
      addChainWatcher(obj, parent._key, this);
    } else {
      this._watching = false;
    }
  }

  value() {
    return this._parent.value();
  }

  chain(key, path) {
    let chains = this._chains;

    if (chains === undefined) {
      let len = lazyGet(this.value(), 'length');
      chains = this._chains = new Array(len);
    }

    for (var i = 0; i < chains.length; i++) {
      let node = chains[i];
      if (node === undefined) {
        node = new ChainNode(this, key);
        chains[i] = node;
      }
      // chain rest of path if there is one
      if (path) {
        key = firstKey(path);
        node.chain(key, path.slice(key.length + 1));
      }
    };

  }

  notify(revalidate, affected) {
    if (revalidate && this._watching) {
      let parentValue = this._parent._parent.value();

      if (parentValue !== this._object) {
        removeChainWatcher(obj, parent._key, this);

        if (isObject(parentValue)) {
          this._object = parentValue;
          addChainWatcher(parentValue, parent._key, this);
        } else {
          this._object = undefined;
        }
      }
      this._value = undefined;
    }

    // then notify chains...
    let chains = this._chains;
    if (chains !== undefined) {
      for (var i = 0; i < chains.length; i++) {
        let node = chains[i];
        if (node !== undefined) {
          node.notify(revalidate, affected);
        }
      };
    }

    if (affected !== undefined) {
      this._parent.populateAffected([this._key], affected);
    }
  }

  populateAffected(keys, affected) {
    keys.unshift(this._key);
    this._parent.populateAffected(keys, affected);
  }

}

function lazyGet(obj, key) {
  if (!isObject(obj)) {
    return;
  }

  let meta = peekMeta(obj);

  // check if object meant only to be a prototype
  if (meta !== undefined && meta.proto === obj) {
    return;
  }

  // Use `get` if the return value is an EachProxy or an uncacheable value.
  if (isVolatile(obj, key, meta)) {
    return get(obj, key);
  // Otherwise attempt to get the cached value of the computed property
  } else {
    let cache = meta.readableCache();
    if (cache !== undefined) {
      return cacheFor.get(cache, key);
    }
  }
}

function finishChains(meta) {
  // finish any current chains node watchers that reference obj
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers !== undefined) {
    chainWatchers.revalidateAll();
  }
  // ensure that if we have inherited any chains they have been
  // copied onto our own meta.
  if (meta.readableChains() !== undefined) {
    meta.writableChains(makeRootChainNode);
  }
}

export {
  finishChains,
  makeRootChainNode,
  removeChainWatcher,
  RootChainNode,
  ChainNode
};
