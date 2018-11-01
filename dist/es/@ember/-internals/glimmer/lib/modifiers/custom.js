import { valueForCapturedArgs } from '../utils/managers';
// Currently there are no capabilities for modifiers
export function capabilities(_managerAPI, _optionalFeatures) {
    return {};
}
export class CustomModifierDefinition {
    constructor(name, ModifierClass, delegate) {
        this.name = name;
        this.ModifierClass = ModifierClass;
        this.delegate = delegate;
        this.manager = CUSTOM_MODIFIER_MANAGER;
        this.state = {
            ModifierClass,
            name,
            delegate,
        };
    }
}
export class CustomModifierState {
    constructor(element, delegate, modifier, args) {
        this.element = element;
        this.delegate = delegate;
        this.modifier = modifier;
        this.args = args;
    }
    destroy() {
        const { delegate, modifier, args } = this;
        let modifierArgs = valueForCapturedArgs(args);
        delegate.destroyModifier(modifier, modifierArgs);
    }
}
class CustomModifierManager {
    create(element, definition, args) {
        const capturedArgs = args.capture();
        let modifierArgs = valueForCapturedArgs(capturedArgs);
        let instance = definition.delegate.createModifier(definition.ModifierClass, modifierArgs);
        return new CustomModifierState(element, definition.delegate, instance, capturedArgs);
    }
    getTag({ args }) {
        return args.tag;
    }
    install(state) {
        let { element, args, delegate, modifier } = state;
        let modifierArgs = valueForCapturedArgs(args);
        delegate.installModifier(modifier, element, modifierArgs);
    }
    update(state) {
        let { args, delegate, modifier } = state;
        let modifierArgs = valueForCapturedArgs(args);
        delegate.updateModifier(modifier, modifierArgs);
    }
    getDestructor(state) {
        return state;
    }
}
const CUSTOM_MODIFIER_MANAGER = new CustomModifierManager();
