/*global requireApp suite test assert setup teardown sinon mocha
  suiteTeardown suiteSetup Promise */
suite('DoubleSpace', function() {
  function eventEmitterSpy() {
    var d = document.createElement('div');
    sinon.spy(d, 'addEventListener');
    sinon.spy(d, 'removeEventListener');
    sinon.spy(d, 'dispatchEvent');
    return d;
  }

  mocha.setup({
    globals: [
      'KeyboardTouchHandler',
      'InputField',
      'DoubleSpace'
    ]
  });

  var keyboardTouchHelper, inputField;

  suiteSetup(function(next) {
    window.KeyboardTouchHandler = keyboardTouchHelper = eventEmitterSpy();
    window.InputField = inputField = eventEmitterSpy();

    requireApp('demo-keyboard/js/doublespace.js', next);
  });

  suiteTeardown(function() {
    // @todo restore props on window?
  });

  setup(function() {
    window.DoubleSpace.resetLastKeyWasSpace();
    inputField.replaceSurroundingText =
      sinon.stub().returns(new Promise(function(res) {
        res();
      }));
  });

  function sendKey(key) {
    keyboardTouchHelper.dispatchEvent(new CustomEvent('key', { detail: key }));
  }

  suite('Two spaces (fast)', function() {
    function twoSpaces(initialText, shouldMakeDot) {
      inputField.textBeforeCursor = initialText;
      sendKey('SPACE');
      inputField.textBeforeCursor += ' ';
      sendKey('SPACE');
      if (shouldMakeDot) {
        sinon.assert.callCount(inputField.replaceSurroundingText, 1,
          'replaceSurroundingText callCount');

        assert.equal(JSON.stringify(inputField.replaceSurroundingText.args[0]),
          JSON.stringify([ '. ', -1, 1 ]),
          'replaceSurroundingText arguments');
      }
      else {
        assert.equal(inputField.replaceSurroundingText.callCount, 0,
          'replaceSurroundingText callCount');
      }
    }

    test('Literal text', function() {
      twoSpaces('jan', true);
    });

    test('Empty string', function() {
      twoSpaces('', false);
    });

    test('Literal text with space', function() {
      twoSpaces('yolo ', false);
    });

    test('Literal text with colon', function() {
      twoSpaces('yolo:', false);
    });

    test('Literal text with questionmark', function() {
      twoSpaces('yolo?', false);
    });

    test('Literal text with exclamation', function() {
      twoSpaces('yolo!', false);
    });

    test('Literal text sentence', function() {
      twoSpaces('This is a sentence. Here comes moar', true);
    });
  });

  suite('Two spaces (slow)', function() {
    test('Literal text', function() {
      inputField.textBeforeCursor = 'jan';
      sendKey('SPACE');
      inputField.textBeforeCursor += ' ';
      window.DoubleSpace.resetLastKeyWasSpace();
      sendKey('SPACE');
      assert.equal(inputField.replaceSurroundingText.callCount, 0,
        'replaceSurroundingText callCount');
    });
  });

  suite('Stop key propagation', function() {
    function createSpaceEvents() {
      var ev1 = new CustomEvent('key', { detail: 'SPACE' });
      var ev2 = new CustomEvent('key', { detail: 'SPACE' });
      var spy1 = sinon.spy(ev1, 'stopImmediatePropagation');
      var spy2 = sinon.spy(ev2, 'stopImmediatePropagation');
      return [ev1, ev2, spy1, spy2];
    }

    test('On dot insertion', function(next) {
      let[ev1, ev2, spy1, spy2] = createSpaceEvents();

      inputField.textBeforeCursor = 'jan';
      keyboardTouchHelper.dispatchEvent(ev1);

      setTimeout(function() {
        inputField.textBeforeCursor += ' ';
        keyboardTouchHelper.dispatchEvent(ev2);

        assert.equal(spy1.callCount, 0, 'stopPropagation on event 1');
        assert.equal(spy2.callCount, 1, 'stopPropagation on event 2');

        next();
      }, 0);
    });

    test('On non-dot insertion', function(next) {
      let [ev1, ev2, spy1, spy2] = createSpaceEvents();

      inputField.textBeforeCursor = ''; // empty string doesnt insert dot
      keyboardTouchHelper.dispatchEvent(ev1);

      setTimeout(function() {
        inputField.textBeforeCursor += ' ';
        keyboardTouchHelper.dispatchEvent(ev2);

        assert.equal(spy1.callCount, 0, 'stopPropagation on event 1');
        assert.equal(spy2.callCount, 0, 'stopPropagation on event 2');

        next();
      }, 0);
    });
  });

  suite('Backspace', function() {
    function triggerBackspaceEvent() {
      var ev = new CustomEvent('key', { detail: 'BACKSPACE' });
      var spy = sinon.spy(ev, 'stopImmediatePropagation');
      keyboardTouchHelper.dispatchEvent(ev);
      return [ev, spy];
    }

    test('Literal text', function() {
      inputField.textBeforeCursor = 'yolo';
      let [ev, spy] = triggerBackspaceEvent();
      assert.equal(spy.callCount, 0, 'stopImmediatePropagation callCount');
      assert.equal(inputField.replaceSurroundingText.callCount, 0,
        'replaceSurroundingText callCount');
    });

    test('Literal text and space', function() {
      inputField.textBeforeCursor = 'yolo        ';
      let [ev, spy] = triggerBackspaceEvent();
      assert.equal(spy.callCount, 0, 'stopImmediatePropagation callCount');
      assert.equal(inputField.replaceSurroundingText.callCount, 0,
        'replaceSurroundingText callCount');
    });

    test('Literal text and exclamation mark', function() {
      inputField.textBeforeCursor = 'yolo!';
      let [ev, spy] = triggerBackspaceEvent();
      assert.equal(spy.callCount, 0, 'stopImmediatePropagation callCount');
      assert.equal(inputField.replaceSurroundingText.callCount, 0,
        'replaceSurroundingText callCount');
    });

    test('Space then backspace', function(next) {
      inputField.textBeforeCursor = 'yolo';
      sendKey('SPACE');
      inputField.textBeforeCursor += ' ';
      setTimeout(function() {
        let [ev, spy] = triggerBackspaceEvent();
        assert.equal(spy.callCount, 0, 'stopImmediatePropagation callCount');
        assert.equal(inputField.replaceSurroundingText.callCount, 0,
          'replaceSurroundingText callCount');
        next();
      }, 0);
    });

    test('Double space then backspace', function(next) {
      inputField.textBeforeCursor = 'yolo';
      sendKey('SPACE');
      inputField.textBeforeCursor += ' ';
      setTimeout(function() {
        sendKey('SPACE');

        setTimeout(function() {
          // new stub required
          inputField.replaceSurroundingText = sinon.stub().returns(
            new Promise(function(res) { res(); }));
          let [ev, spy] = triggerBackspaceEvent();
          assert.equal(spy.callCount, 1, 'stopImmediatePropagation callCount');
          assert.equal(inputField.replaceSurroundingText.callCount, 1,
            'replaceSurroundingText callCount');
          assert.equal(
            inputField.replaceSurroundingText.calledWith('  ', -2, 2),
            true, 
            'replaceSurroundingText calledWith');

          next();
        }, 0);
      }, 0);
    });
  });
});
