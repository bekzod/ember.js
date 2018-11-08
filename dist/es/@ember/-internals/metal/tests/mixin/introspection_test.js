// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

import { guidFor, NAME_KEY } from '@ember/-internals/utils';
import { mixin, Mixin } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const PrivateProperty = Mixin.create({
  _foo: '_FOO',
});
const PublicProperty = Mixin.create({
  foo: 'FOO',
});
const PrivateMethod = Mixin.create({
  _fooMethod() {},
});
const PublicMethod = Mixin.create({
  fooMethod() {},
});
const BarProperties = Mixin.create({
  _bar: '_BAR',
  bar: 'bar',
});
const BarMethods = Mixin.create({
  _barMethod() {},
  barMethod() {},
});

const Combined = Mixin.create(BarProperties, BarMethods);

let obj;

moduleFor(
  'Basic introspection',
  class extends AbstractTestCase {
    beforeEach() {
      obj = {};
      mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
    }

    ['@test Ember.mixins()'](assert) {
      function mapGuids(ary) {
        return ary.map(x => guidFor(x));
      }

      assert.deepEqual(
        mapGuids(Mixin.mixins(obj)),
        mapGuids([
          PrivateProperty,
          PublicProperty,
          PrivateMethod,
          PublicMethod,
          Combined,
          BarProperties,
          BarMethods,
        ]),
        'should return included mixins'
      );
    }

    ['@test setting a NAME_KEY on a mixin does not error'](assert) {
      assert.expect(0);

      let instance = Mixin.create();
      instance[NAME_KEY] = 'My special name!';
    }

    ['@test setting a NAME_KEY on a mixin instance does not error'](assert) {
      assert.expect(0);

      Mixin.create({ [NAME_KEY]: 'My special name' });
    }
  }
);
