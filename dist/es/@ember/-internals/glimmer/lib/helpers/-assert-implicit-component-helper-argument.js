import { DEBUG } from '@glimmer/env';
let helper = undefined;
if (DEBUG) {
    class ComponentAssertionReference {
        constructor(component, message) {
            this.component = component;
            this.message = message;
            this.tag = component.tag;
        }
        value() {
            let value = this.component.value();
            if (typeof value === 'string') {
                throw new TypeError(this.message);
            }
            return value;
        }
        get(property) {
            return this.component.get(property);
        }
    }
    helper = (_vm, args) => new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value());
}
export default helper;
