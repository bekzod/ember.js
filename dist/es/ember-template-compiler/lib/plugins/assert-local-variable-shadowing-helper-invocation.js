import { assert } from '@ember/debug';
import calculateLocationDisplay from '../system/calculate-location-display';
export default function assertLocalVariableShadowingHelperInvocation(env) {
    let { moduleName } = env.meta;
    let locals = [];
    return {
        name: 'assert-local-variable-shadowing-helper-invocation',
        visitor: {
            BlockStatement: {
                enter(node) {
                    locals.push(node.program.blockParams);
                },
                exit() {
                    locals.pop();
                },
            },
            ElementNode: {
                enter(node) {
                    locals.push(node.blockParams);
                },
                exit() {
                    locals.pop();
                },
            },
            SubExpression(node) {
                assert(`${messageFor(node)} ${calculateLocationDisplay(moduleName, node.loc)}`, !isLocalVariable(node.path, locals));
            },
            ElementModifierStatement(node) {
                // The ElementNode get visited first, but modifiers are more of a sibling
                // than a child in the lexical scope (we aren't evaluated in its "block")
                // so any locals introduced by the last element doesn't count
                assert(`${messageFor(node)} ${calculateLocationDisplay(moduleName, node.loc)}`, !isLocalVariable(node.path, locals.slice(0, -1)));
            },
        },
    };
}
function isLocalVariable(node, locals) {
    return !node.this && hasLocalVariable(node.parts[0], locals);
}
function hasLocalVariable(name, locals) {
    return locals.some(names => names.indexOf(name) !== -1);
}
function messageFor(node) {
    let type = isSubExpression(node) ? 'helper' : 'modifier';
    let name = node.path.parts[0];
    return `Cannot invoke the \`${name}\` ${type} because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict.`;
}
function isSubExpression(node) {
    return node.type === 'SubExpression';
}
