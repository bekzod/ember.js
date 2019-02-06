import AssertIfHelperWithoutArguments from './assert-if-helper-without-arguments';
import AssertInputHelperWithoutBlock from './assert-input-helper-without-block';
import AssertLocalVariableShadowingHelperInvocation from './assert-local-variable-shadowing-helper-invocation';
import AssertModifiersNotInComponents from './assert-modifiers-not-in-components';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';
import AssertSplattributeExpressions from './assert-splattribute-expression';
import DeprecateSendAction from './deprecate-send-action';
import TransformActionSyntax from './transform-action-syntax';
import TransformAttrsIntoArgs from './transform-attrs-into-args';
import TransformComponentInvocation from './transform-component-invocation';
import TransformEachInIntoEach from './transform-each-in-into-each';
import TransformHasBlockSyntax from './transform-has-block-syntax';
import TransformInElement from './transform-in-element';
import TransformInputTypeSyntax from './transform-input-type-syntax';
import TransformLinkTo from './transform-link-to';
import TransformLogAction from './transform-log-action';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import TransformQuotedBindingsIntoJustBindings from './transform-quoted-bindings-into-just-bindings';

import {
  EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS,
  EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES,
} from '@ember/canary-features';
import { SEND_ACTION } from '@ember/deprecated-features';
import { ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

export type APluginFunc = (env: ASTPluginEnvironment) => ASTPlugin | undefined;

const transforms: Array<APluginFunc> = [
  TransformComponentInvocation,
  TransformLinkTo,
  TransformOldClassBindingSyntax,
  TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments,
  TransformActionSyntax,
  TransformAttrsIntoArgs,
  TransformEachInIntoEach,
  TransformHasBlockSyntax,
  AssertLocalVariableShadowingHelperInvocation,
  AssertInputHelperWithoutBlock,
  TransformInElement,
  AssertIfHelperWithoutArguments,
  AssertSplattributeExpressions,
  TransformLogAction,
];

if (!EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS) {
  transforms.push(TransformInputTypeSyntax);
}

if (!EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES) {
  transforms.push(AssertModifiersNotInComponents);
}

if (SEND_ACTION) {
  transforms.push(DeprecateSendAction);
}

export default Object.freeze(transforms);
