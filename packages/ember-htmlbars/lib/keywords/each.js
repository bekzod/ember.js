/**
@module ember
@submodule ember-htmlbars
*/

export default function each(morph, env, scope, params, hash, template, inverse, visitor) {
  let getValue = env.hooks.getValue;
  let keyword = hash['-legacy-keyword'] && getValue(hash['-legacy-keyword']);

  if (keyword) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-keyword', params, hash, template, inverse, visitor);
    return true;
  }

  return false;
}
