/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @emails oncall+internationalization
 * @format
 */

jest.autoMockOff();

const {payload, transform, withFbtRequireStatement} = require('../FbtTestUtil');
const {FbtVariationType} = require('../translate/IntlVariations');
const {TestUtil} = require('fb-babel-plugin-utils');

// Given a test config's "filter" status, decides whether we should run it with
// jest's it/fit/xit function.
// This is useful when you want to run only a subset of unit tests from a testData object.
const {$it} = TestUtil;

const generalTestData = {
  'should convert simple strings': {
    input: withFbtRequireStatement(
      `var x = fbt('A simple string', "It's simple");`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'A simple string',
        ],
        "It's simple",
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A simple string',
          desc: "It's simple",
        })},
      );`,
    ),
  },

  'should allow description concatenation': {
    input: withFbtRequireStatement(
      `var x = fbt(
        'A short string',
        'With a ridiculously long description that' +
          ' requires concatenation',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A short string',
          desc:
            'With a ridiculously long description that requires concatenation',
        })},
      );`,
    ),
  },

  'should maintain newlines': {
    input: withFbtRequireStatement(
      `var x = fbt(
        'A simple string... ' +
        'with some other stuff.',
        'blah'
      );
      baz();`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A simple string... with some other stuff.',
          desc: 'blah',
        })},
      );
      baz();`,
    ),
  },

  // Initially needed for JS source maps accuracy
  'should maintain newlines within arguments': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var z = fbt(
        'a' +
        ' b ' +
        fbt.param('name1', val1) +
        ' c ' +
        // comments
        ' d ' +
        fbt.param('name2', val2) +
        ' e ',
        'a',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var z = fbt(
        [
          'a' +
          ' b ',
          fbt.param('name1', val1),
          ' c ',
          // comments
          ' d ',
          fbt.param('name2', val2),
          ' e ',
        ], 'a',
      );`,
    ),

    output: withFbtRequireStatement(
      `var z = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'a b {name1} c d {name2} e',
          desc: 'a',
        })},
        [fbt._param('name1', val1), fbt._param('name2', val2)],
      );`,
    ),
  },

  // Initially needed for JS source maps accuracy
  'should maintain intra-argument newlines': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var z = fbt(
        fbt.param(
          'name1',
          foo ? (
            <a>
              bar
            </a>
          ) : (
            qux
          ),
        ) +
          ' blah ' +
          fbt.param('name2', qux),
        'a',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var z = fbt(
        [
          fbt.param(
            'name1',
            foo ? (
              <a>
                bar
              </a>
            ) : (
              qux
            ),
          ),
          ' blah ',
          fbt.param('name2', qux),
        ], 'a',
      );`,
    ),

    output: withFbtRequireStatement(
      `var z = fbt._(
        ${payload({
          type: 'text',
          jsfbt: '{name1} blah {name2}',
          desc: 'a',
        })},
        [
          fbt._param(
            'name1',
            foo
              ? React.createElement(
                  "a",
                  null,
                  "bar",
                )
              : qux,
          ),
          fbt._param('name2', qux),
        ],
      );`,
    ),
  },

  'should be able to nest within React nodes': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var React = require('react');
      var x = <div>{fbt('A nested string', 'nested!')}</div>;`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var React = require('react');
      var x = <div>{fbt(['A nested string'], 'nested!')}</div>;`,
    ),

    output: withFbtRequireStatement(
      `var React = require('react');
      var x = React.createElement(
        'div',
        null,
        fbt._(
          ${payload({
            type: 'text',
            jsfbt: 'A nested string',
            desc: 'nested!',
          })},
        ),
      );`,
    ),
  },

  'should handle a JSX fragment nested with fbt.param as an argument': {
    filter: 'skip',
    // TODO(T38926768) Enable this once we support proper auto-parameterization in JSX
    inputWithArraySyntax: withFbtRequireStatement(
      `var React = require('react');
      var x = fbt(
        [
          'A1',
          <a>
            B1
            <b>
              C1
              {
                // TODO(T27672828) fbt constructs like fbt.pronoun() should return some opaque type
                // like FbtElement to work with React components
              }
              {fbt.param('paramName', paramValue)}
              C2
            </b>
            B2
          </a>,
          'A2',
        ],
        'nested!',
        {
          subject: subjectValue,
        }
      );`,
    ),

    output: withFbtRequireStatement(
      `var React = require('react');
      var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A1 {=B1 C1 [paramName] C2 B2} A2',
          desc: 'nested!',
        })},
        [
          fbt._param(
            '=B1 C1 [paramName] C2 B2',
            React.createElement(
              'a',
              null,
              fbt._(
                ${payload({
                  type: 'text',
                  jsfbt: 'B1 {=C1 [paramName] C2} B2',
                  desc: 'In the phrase: "A1 {=B1 C1 [paramName] C2 B2} A2"',
                })},
                [
                  fbt._param(
                    '=C1 [paramName] C2',
                    React.createElement(
                      'b',
                      null,
                      fbt._(
                        ${payload({
                          type: 'text',
                          jsfbt: 'C1 {paramName} C2',
                          desc:
                            'In the phrase: "A1 B1 {=C1 [paramName] C2} B2 A2"',
                        })},
                        [
                          fbt._param('paramName', paramValue)
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      )`,
    ),
  },

  'should handle params': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'A parameterized message to ' +
          fbt.param('personName', truthy ? ifTrue : ifFalse),
        'Moar params',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'A parameterized message to ',
          fbt.param('personName', truthy ? ifTrue : ifFalse),
        ],
        'Moar params',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A parameterized message to {personName}',
          desc: 'Moar params',
        })},
        [fbt._param('personName', truthy ? ifTrue : ifFalse)],
      );`,
    ),
  },

  'should accept well-formed options': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `fbt('A string that moved files', 'options!', {
        author: 'jwatson',
        project: 'Super Secret',
      });`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `fbt(['A string that moved files'], 'options!', {
        author: 'jwatson',
        project: 'Super Secret',
      });`,
    ),

    output: withFbtRequireStatement(
      `fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A string that moved files',
          desc: 'options!',
          project: 'Super Secret',
        })},
      );`,
    ),
  },

  'should handle enums (with array values)': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Click to see ' + fbt.enum('groups', ['groups', 'photos', 'videos']),
        'enum as an array',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Click to see ',
          fbt.enum('groups', ['groups', 'photos', 'videos']),
        ],
        'enum as an array',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              groups: 'Click to see groups',
              photos: 'Click to see photos',
              videos: 'Click to see videos',
            },
            m: [null],
          },
          desc: 'enum as an array',
        })},
        [
          fbt._enum('groups', {
            "groups": 'groups',
            "photos": 'photos',
            "videos": 'videos',
          }),
        ],
      );`,
    ),
  },

  'should handle enums (with value map)': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Click to see ' +
          fbt.enum('id1', {id1: 'groups', id2: 'photos', id3: 'videos'}),
        'enum as an object',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Click to see ',
          fbt.enum('id1', {id1: 'groups', id2: 'photos', id3: 'videos'}),
        ],
        'enum as an object',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              id1: 'Click to see groups',
              id2: 'Click to see photos',
              id3: 'Click to see videos',
            },
            m: [null],
          },
          desc: 'enum as an object',
        })},
        [
          fbt._enum('id1', {
            "id1": 'groups',
            "id2": 'photos',
            "id3": 'videos'
          })
        ],
      );`,
    ),
  },

  'should handle plurals that have different count variables': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        fbt.plural('cat', catCount, {name: 'cat_token', showCount: 'yes'}) +
        ' and ' +
        fbt.plural('dog', dogCount, {name: 'dog_token', showCount: 'yes'}),
        'plurals',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          fbt.plural('cat', catCount, {name: 'cat_token', showCount: 'yes'}),
          ' and ',
          fbt.plural('dog', dogCount, {name: 'dog_token', showCount: 'yes'}),
        ],
        'plurals',
      )`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*': {
                '*': '{cat_token} cats and {dog_token} dogs',
                _1: '{cat_token} cats and 1 dog',
              },
              _1: {'*': '1 cat and {dog_token} dogs', _1: '1 cat and 1 dog'},
            },
            m: [
              {
                token: 'cat_token',
                type: FbtVariationType.NUMBER,
                singular: true,
              },
              {
                token: 'dog_token',
                type: FbtVariationType.NUMBER,
                singular: true,
              },
            ],
          },
          desc: 'plurals',
          project: '',
        })},
        [
          fbt._plural(catCount, 'cat_token'),
          fbt._plural(dogCount, 'dog_token'),
        ],
      );`,
    ),
  },

  'should handle plurals that share the same count variable': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'There ' +
          fbt.plural('was ', count, {showCount: 'no', many: 'were '}) +
          fbt.plural('a like', count, {showCount: 'ifMany', many: 'likes'}),
        'plurals',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'There ',
          fbt.plural('was ', count, {showCount: 'no', many: 'were '}),
          fbt.plural('a like', count, {showCount: 'ifMany', many: 'likes'}),
        ],
        'plurals',
      )`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*': {
                '*': 'There were {number} likes',
              },
              _1: {
                _1: 'There was a like',
              },
            },
            m: [
              null,
              {
                token: 'number',
                type: FbtVariationType.NUMBER,
                singular: true,
              },
            ],
          },
          desc: 'plurals',
        })},
        [fbt._plural(count), fbt._plural(count, 'number')],
      );`,
    ),
  },

  'should handle multiple plurals with no showCount (i.e. no named params)': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'There ' +
        fbt.plural('is ', count, {many: 'are '}) +
        fbt.plural('a like', count, {showCount: 'ifMany', many: 'likes'}),
        'plurals',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'There ',
          fbt.plural('is ', count, {many: 'are '}),
          fbt.plural('a like', count, {showCount: 'ifMany', many: 'likes'}),
        ], 'plurals',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*': {
                '*': 'There are {number} likes',
              },
              _1: {
                _1: 'There is a like',
              },
            },
            m: [
              null,
              {
                token: 'number',
                type: FbtVariationType.NUMBER,
                singular: true,
              },
            ],
          },
          desc: 'plurals',
        })},
        [fbt._plural(count), fbt._plural(count, 'number')],
      );`,
    ),
  },

  'should throw on bad showCount value': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'There were ' + fbt.plural('a like', count, {showCount: 'badkey'}),
        'plurals',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'There were ',
          fbt.plural('a like', count, {showCount: 'badkey'}),
        ], 'plurals',
      );`,
    ),

    throws: true,
  },

  'should throw on unknown options': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'There were ' + fbt.plural('a like', count, {whatisthis: 'huh?'}),
        'plurals',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'There were ',
          fbt.plural('a like', count, {whatisthis: 'huh?'}),
        ], 'plurals',
      );`,
    ),

    throws: true,
  },

  'should handle names': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'You just friended ' + fbt.name('name', personname, gender),
        'names',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'You just friended ',
          fbt.name('name', personname, gender),
        ], 'names',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*': 'You just friended {name}',
            },
            m: [
              {
                token: 'name',
                type: FbtVariationType.GENDER,
              },
            ],
          },
          desc: 'names',
        })},
        [fbt._name('name', personname, gender)],
      );`,
    ),
  },

  'should handle variations': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Click to see ' + fbt.param('count', c, {number: true}) + ' links',
        'variations!',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Click to see ',
          fbt.param('count', c, {number: true}),
          ' links',
        ], 'variations!',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*': 'Click to see {count} links',
            },
            m: [
              {
                token: 'count',
                type: FbtVariationType.NUMBER,
              },
            ],
          },
          desc: 'variations!',
        })},
        [fbt._param('count', c, [0])],
      );`,
    ),
  },

  'should insert param in place of fbt.sameParam if it exists': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var z = fbt(
        fbt.param('name1', val1) + ' and ' + fbt.sameParam('name1'),
        'd',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var z = fbt(
        [
          fbt.param('name1', val1),
          ' and ',
          fbt.sameParam('name1'),
        ], 'd',
      );`,
    ),

    output: withFbtRequireStatement(
      `var z = fbt._(
        ${payload({
          type: 'text',
          jsfbt: '{name1} and {name1}',
          desc: 'd',
        })},
        [fbt._param('name1', val1)],
      );`,
    ),
  },

  'should handle variations + same param': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var val = 42;
      fbt(
        'You have ' +
        fbt.param('count', val, {number: true}) +
        ' likes. Comment on it to get more than ' +
        fbt.sameParam('count') +
        ' likes',
        'test variations + sameParam',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var val = 42;
      fbt(
        [
          'You have ',
          fbt.param('count', val, {number: true}),
          ' likes. Comment on it to get more than ',
          fbt.sameParam('count'),
          ' likes',
        ], 'test variations + sameParam',
      );`,
    ),

    output: withFbtRequireStatement(
      `var val = 42;
      fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '*':
                'You have {count} likes. Comment on it to get more than {count} likes',
            },
            m: [
              {
                token: 'count',
                type: FbtVariationType.NUMBER,
              },
            ],
          },
          desc: 'test variations + sameParam',
        })},
        [fbt._param('count', val, [0])],
      );`,
    ),
  },

  'should get project from docblock': {
    input: `/** @fbt {"project": "dev"}*/
      ${withFbtRequireStatement(
        `var x = fbt('Also simple string', "It's simple");`,
      )}`,

    inputWithArraySyntax: `/** @fbt {"project": "dev"}*/
      ${withFbtRequireStatement(
        `var x = fbt(['Also simple string'], "It's simple");`,
      )}`,

    output: `/** @fbt {"project": "dev"}*/
      ${withFbtRequireStatement(
        `var x = fbt._(
          ${payload({
            type: 'text',
            jsfbt: 'Also simple string',
            desc: "It's simple",
            project: 'dev',
          })},
        );`,
      )}`,
  },

  'should handler wrapping parens': {
    input: withFbtRequireStatement(
      `var x = fbt('foo' + 'bar' + 'baz' + 'qux', 'desc');
      var y = fbt('foo' + ('bar' + 'baz' + 'qux'), 'desc');
      var q = fbt('foo' + 'bar' + ('baz' + 'qux'), 'desc');`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'foo' + 'bar',
          'baz' + 'qux'
        ], 'desc'
      );
      var y = fbt(
        [
          'foo',
          ('bar' + 'baz' + 'qux'),
        ], 'desc'
      );
      var q = fbt(
        [
          'foo',
          'bar' + ('baz' + 'qux'),
        ], 'desc'
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'foobarbazqux',
          desc: 'desc',
        })},
      );
      var y = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'foobarbazqux',
          desc: 'desc',
        })},
      );
      var q = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'foobarbazqux',
          desc: 'desc',
        })},
      );`,
    ),
  },

  'should handle enums with more text after': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Hello, ' + fbt.enum('groups', ['groups', 'photos', 'videos']) + '!',
        'enums!',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Hello, ',
          fbt.enum('groups', ['groups', 'photos', 'videos']),
          '!',
        ], 'enums!',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              groups: 'Hello, groups!',
              photos: 'Hello, photos!',
              videos: 'Hello, videos!',
            },
            m: [null],
          },
          desc: 'enums!',
        })},
        [
          fbt._enum('groups', {
            "groups": 'groups',
            "photos": 'photos',
            "videos": 'videos',
          }),
        ],
      );`,
    ),
  },

  'should handle duplicate enums': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Look! ' +
          fbt.enum('groups', {
            groups: 'Groups',
            photos: 'Photos',
            videos: 'Videos',
          }) +
          ' and ' +
          fbt.enum('groups', {
            groups: 'groups',
            photos: 'photos',
            videos: 'videos',
          }) +
          '!',
        'enums!',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Look! ',
          fbt.enum('groups', {
            groups: 'Groups',
            photos: 'Photos',
            videos: 'Videos',
          }),
          ' and ',
          fbt.enum('groups', {
            groups: 'groups',
            photos: 'photos',
            videos: 'videos',
          }),
          '!',
        ],
        'enums!',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              groups: 'Look! Groups and groups!',
              photos: 'Look! Photos and photos!',
              videos: 'Look! Videos and videos!',
            },
            m: [null],
          },
          desc: 'enums!',
        })},
        [
          fbt._enum('groups', {
            "groups": 'Groups',
            "photos": 'Photos',
            "videos": 'Videos',
          }),
        ],
      );`,
    ),
  },

  'should handle object pronoun': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
          'I know ' +
            fbt.pronoun('object', gender) +
            '.',
          'object pronoun',
        );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
          [
            'I know ',
            fbt.pronoun('object', gender),
            '.'
          ],
          'object pronoun',
        );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '0': 'I know this.',
              '1': 'I know her.',
              '2': 'I know him.',
              '*': 'I know them.',
            },
            m: [null],
          },
          desc: 'object pronoun',
        })},
        [fbt._pronoun(0, gender)],
      );`,
    ),
  },

  'should handle subject and reflexive pronouns': {
    filter: 'skip',
    input:
      // eslint-disable-next-line fb-www/gender-neutral-language
      // I.e. He wished himself a happy birthday.
      withFbtRequireStatement(
        `var x = fbt(
          fbt.pronoun('subject', gender, {capitalize: true, human: true}) +
            ' wished ' +
            fbt.pronoun('reflexive', gender, {human: true}) +
            ' a happy birthday.',
          'subject+reflexive pronouns',
        );`,
      ),

    inputWithArraySyntax:
      // eslint-disable-next-line fb-www/gender-neutral-language
      // I.e. He wished himself a happy birthday.
      withFbtRequireStatement(
        `var x = fbt(
          [
            fbt.pronoun('subject', gender, {capitalize: true, human: true}),
            ' wished ',
            fbt.pronoun('reflexive', gender, {human: true}),
            ' a happy birthday.'
          ], 'subject+reflexive pronouns',
        );`,
      ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '1': {
                '1': 'She wished herself a happy birthday.',
              },
              '2': {
                '2': 'He wished himself a happy birthday.',
              },
              '*': {
                '*': 'They wished themselves a happy birthday.',
              },
            },
            m: [null, null],
          },
          desc: 'subject+reflexive pronouns',
        })},
        [
          fbt._pronoun(3, gender, {human: 1}),
          fbt._pronoun(2, gender, {human: 1})
        ],
      );`,
    ),
  },

  'should handle possessive pronoun': {
    filter: 'skip',
    input:
      // eslint-disable-next-line fb-www/gender-neutral-language
      // I.e. It is her birthday.
      withFbtRequireStatement(
        `var x = fbt(
          'It is ' + fbt.pronoun('possessive', gender) + ' birthday.',
          'possessive pronoun',
        );`,
      ),

    inputWithArraySyntax:
      // eslint-disable-next-line fb-www/gender-neutral-language
      // I.e. It is her birthday.
      withFbtRequireStatement(
        `var x = fbt(
          [
            'It is ',
            fbt.pronoun('possessive', gender),
            ' birthday.'
          ], 'possessive pronoun',
        );`,
      ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              '1': 'It is her birthday.',
              '2': 'It is his birthday.',
              '*': 'It is their birthday.',
            },
            m: [null],
          },
          desc: 'possessive pronoun',
        })},
        [fbt._pronoun(1, gender)],
      );`,
    ),
  },

  'should throw on pronoun usage not StringLiteral': {
    filter: 'skip',
    input:
      // Note use of variable for pronoun usage.
      withFbtRequireStatement(
        `var u = 'possessive';
        var x = fbt(
          'It is ' + fbt.pronoun(u, gender) + ' birthday.',
          'throw not StringLiteral',
        );`,
      ),

    inputWithArraySyntax:
      // Note use of variable for pronoun usage.
      withFbtRequireStatement(
        `var u = 'possessive';
        var x = fbt(
          [
            'It is ',
            fbt.pronoun(u, gender),
            ' birthday.',
          ], 'throw not StringLiteral',
        );`,
      ),

    throws: true,
  },

  'should throw on pronoun usage invalid': {
    filter: 'skip',
    input:
      // Note 'POSSESSION' instead of 'possessive'.
      withFbtRequireStatement(
        `var x = fbt(
          'It is ' + fbt.pronoun('POSSESSION', gender) + ' birthday.',
          'throw because of unknown pronoun type',
        );`,
      ),

    inputWithArraySyntax:
      // Note 'POSSESSION' instead of 'possessive'.
      withFbtRequireStatement(
        `var x = fbt(
          [
            'It is ',
            fbt.pronoun('POSSESSION', gender),
            ' birthday.'
          ], 'throw because of unknown pronoun type',
        );`,
      ),

    throws: true,
  },

  'should throw when concatenating an fbt construct to a string while using the array argument syntax': {
    filter: 'skip',
    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
          [
            'It is ' + fbt.pronoun('possession', gender) + ' birthday.'
          ], 'throw because fbt constructs should be used as array items only',
        );`,
    ),

    throws: true,
  },

  // Initially needed for JS source maps accuracy
  // This is useful only for testing column/line coordinates
  // Newlines are not preserved in the extracted fbt string
  'should maintain newlines when using string templates': {
    input: withFbtRequireStatement(
      `var x = fbt(
        \`A simple string...
with some other stuff.\`,
        'blah',
      );
      baz();`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          \`A simple string...
with some other stuff.\`
        ],
        'blah',
      );
      baz();`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'text',
          jsfbt: 'A simple string... with some other stuff.',
          desc: 'blah',
        })},
      );
      baz();`,
    ),
  },

  'should deduplicate branches when fbt.enum() calls share the same key in string templates': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        \`Look!  \${fbt.enum('groups', {
          groups: 'Groups',
          photos: 'Photos',
          videos: 'Videos',
        })}  and  \${fbt.enum('groups', {
          "groups": 'groups',
          "photos": 'photos',
          "videos": 'videos',
        })}!\`,
        'enums!',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              groups: 'Look! Groups and groups!',
              photos: 'Look! Photos and photos!',
              videos: 'Look! Videos and videos!',
            },
            m: [null],
          },
          desc: 'enums!',
        })},
        [
          fbt._enum('groups', {
            "groups": 'Groups',
            "photos": 'Photos',
            "videos": 'Videos',
          }),
        ],
      );`,
    ),
  },

  'should deduplicate branches when fbt.enum() calls share the same key': {
    filter: 'skip',
    input: withFbtRequireStatement(
      `var x = fbt(
        'Look! ' +
          fbt.enum('groups', {
            groups: 'Groups',
            photos: 'Photos',
            videos: 'Videos',
          }) +
          ' and ' +
          fbt.enum('groups', {
            groups: 'groups',
            photos: 'photos',
            videos: 'videos',
          }) +
          '!',
        'enums!',
      );`,
    ),

    inputWithArraySyntax: withFbtRequireStatement(
      `var x = fbt(
        [
          'Look! ',
          fbt.enum('groups', {
            groups: 'Groups',
            photos: 'Photos',
            videos: 'Videos',
          }),
          ' and ',
          fbt.enum('groups', {
            groups: 'groups',
            photos: 'photos',
            videos: 'videos',
          }),
          '!'
        ], 'enums!',
      );`,
    ),

    output: withFbtRequireStatement(
      `var x = fbt._(
        ${payload({
          type: 'table',
          jsfbt: {
            t: {
              groups: 'Look! Groups and groups!',
              photos: 'Look! Photos and photos!',
              videos: 'Look! Videos and videos!',
            },
            m: [null],
          },
          desc: 'enums!',
        })},
        [
          fbt._enum('groups', {
            "groups": 'Groups',
            "photos": 'Photos',
            "videos": 'Videos',
          }),
        ],
      );`,
    ),
  },
};

function prepareTestDataForInputKey(inputKeyName) {
  const testData = {};
  for (const title in generalTestData) {
    const testCase = generalTestData[title];
    const input = testCase[inputKeyName];
    if (input != null) {
      testData[title] = {
        ...testCase,
        input,
      };
    }
  }
  return testData;
}

function describeTestScenarios(testData) {
  // TODO(T40113359): re-enable this when the clientside JS transform is implemented
  xdescribe('Translation transform', () =>
    TestUtil.testSection(testData, transform));

  describe('Meta-data collection', () => {
    function forEachTestScenario(callback, options = {}) {
      for (const title in testData) {
        callback(title, testData[title], options);
      }
    }

    function stripDocBlock(code) {
      return code.replace(/\/\*\*(?:\/|[^*]|\*+[^*\/])*\*+\/\n/, '');
    }

    function testFbtMetaData(title, originalSingleTestData, options) {
      // TODO(T40113359): enable testing for React Native once the non-RN version is done
      const singleTestData = {
        ...originalSingleTestData,
        filter: options.reactNativeMode
          ? 'skip'
          : originalSingleTestData.filter,
      };

      // Skip scenarios that test an error
      if (singleTestData.throws) {
        return;
      }

      $it(singleTestData)(`for scenario "${title}"`, () => {
        const fbtTransform = require('../index');
        const pluginOptions = {
          collectFbt: true,
          reactNativeMode: options.reactNativeMode || false,
        };
        transform(stripDocBlock(singleTestData.input), pluginOptions);
        expect(fbtTransform.getExtractedStrings()).toMatchSnapshot();
      });
    }

    describe('should collect correct meta data', () => {
      forEachTestScenario(testFbtMetaData);
    });

    describe('should collect correct meta data (react native)', () => {
      forEachTestScenario(testFbtMetaData, {reactNativeMode: true});
    });

    function testFbtNodeCreation(title, originalSingleTestData, options) {
      // TODO(T40113359): enable testing for React Native once the non-RN version is done
      const singleTestData = {
        ...originalSingleTestData,
        filter: options.reactNativeMode
          ? 'skip'
          : originalSingleTestData.filter,
      };

      // Skip scenarios that test an error
      if (singleTestData.throws) {
        return;
      }

      $it(singleTestData)(`for scenario "${title}"`, () => {
        const FbtFunctionCallProcessor = require('../babel-processors/FbtFunctionCallProcessor');
        const spy = jest.spyOn(
          FbtFunctionCallProcessor.prototype,
          'convertToFbtNode',
        );

        const pluginOptions = {
          collectFbt: true,
          reactNativeMode: options.reactNativeMode || false,
        };
        transform(stripDocBlock(singleTestData.input), pluginOptions);

        expect(spy).toHaveBeenCalled();
        for (const result of spy.mock.results) {
          if (result.type === 'return') {
            expect(result.value).toMatchSnapshot();
          }
        }
      });
    }

    describe('should create correct FbtNode objects', () => {
      forEachTestScenario(testFbtNodeCreation);
    });

    describe('should create correct FbtNode objects (react native)', () => {
      forEachTestScenario(testFbtNodeCreation, {reactNativeMode: true});
    });
  });
}

describe('Functional FBT API', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('using string-concatenated arguments:', () => {
    describeTestScenarios(prepareTestDataForInputKey('input'));
  });

  describe('using array arguments:', () => {
    describeTestScenarios(prepareTestDataForInputKey('inputWithArraySyntax'));
  });
});
