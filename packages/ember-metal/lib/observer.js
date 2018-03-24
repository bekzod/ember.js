import {
  watch,
  unwatch
} from './watching';
import {
  addListener,
  removeListener
} from './events';
import {
  meta as metaFor
} from './meta';
/**
@module @ember/object
*/

const AFTER_OBSERVERS = ':change';

export function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
}

/**
  @method addObserver
  @static
  @for @ember/object/observers
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
export function addObserver(obj, path, target, method) {
  addListener(obj, changeEvent(path), target, method);
  watch(obj, path, metaFor(obj));
}

/**
  @method removeObserver
  @static
  @for @ember/object/observers
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
export function removeObserver(obj, path, target, method) {
  unwatch(obj, path, metaFor(obj));
  removeListener(obj, changeEvent(path), target, method);
}
