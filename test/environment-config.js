/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/* jshint node: true, undef: true, unused: true, esversion: 6 */
/* global describe, it, require */
'use strict';

const expect = require('chai').expect;
const assert = require('chai').assert;
const testDefinitions = require('./environment-config-test-definitions');
const envConfig = require('../');
const envConfigDoc = require('../').doc;

describe('environment-config', () => {
  const allTests = testDefinitions();
  for (const testType of Object.keys(allTests)) {
    const tests = allTests[testType];
    describe(testType, () => {
      for (const testCase of tests) {
        it(testCase.name, () => {
          try {
            expect(
              envConfig(testCase.configDefinition, testCase.configOptions))
              .to
              .deep
              .equal(testCase.expectedConfig);
          } catch (error) {
            if (!testCase.expectedErrorPattern) {
              throw error;
            }

            expect(error.message).to.match(new RegExp(testCase.expectedErrorPattern));
          }
        });
      }
    });
  }

  describe('Immutability', () => {
    const configDefinition = {
      'app': {
        'enabled': {
          'doc': 'boolean value',
          'type': 'boolean',
          'default': false,
          'required': true,
        },
        'nested': {
          'nested': {
            'doc': 'string value',
            'type': 'string',
            'default': 'nested',
            'required': true,
          },
        },
      },
    };

    it('Immutable', () => {
      const config = envConfig(
        configDefinition,
        {
          'environmentVariables': {},
        });

      try {
        config.app.enabled = true;
      } catch (error) {
        expect(error.message).to.match(new RegExp(/Cannot assign to read only property 'enabled'.*/));
      }

      try {
        config.app.nested.nested = 'anyvalue';
      } catch (error) {
        expect(error.message).to.match(new RegExp(/Cannot assign to read only property 'nested'.*/));
      }
    });
    it('Mutable', () => {
      const config = envConfig(
        configDefinition, {
          'immutable': false,
          'environmentVariables': {},
        });

      config.app.enabled = true;
      config.app.nested.nested = 'someValue';
      assert.isTrue(config.app.enabled);
      assert.equal(config.app.nested.nested, 'someValue');
    });
  });

  describe('markdown generator', () => {
    const configDefinition = {
      'app': {
        'enabled': {
          'doc': 'boolean value',
          'type': 'boolean',
          'default': false,
          'required': true,
        },
        'nested': {
          'nested': {
            'doc': 'string value',
            'type': 'string',
            'default': 'nested',
            'required': true,
          },
          'url': {
            'doc': 'custom value',
            'type': 'other',
            'default': 'http://some_url',
            'transform': (value) => `http://${value}`,
            'required': true,
          },
        },
      },
    };

    it('Default options', () => {
      assert.equal(
        envConfigDoc(
          configDefinition,
          {
            'environmentVariablePrefix': 'TEST',
            'environmentVariables': {},
          }),
        `
| env | doc | type | default | required | transform |
| --- | --- | --- | --- | --- | --- |
| TEST_APP_ENABLED | boolean value | boolean | --- | true | --- |
| TEST_APP_NESTED_NESTED | string value | string | nested | true | --- |
| TEST_APP_NESTED_URL | custom value | other | http://some_url | true | (value) => \`http://\${value}\` |`);
    });
    it('Custom options', () => {
      assert.equal(
        envConfigDoc(
          configDefinition,
          {
            'environmentVariablePrefix': 'TEST',
            'environmentVariables': {},
            'docColumnMapping': [
              ['env', 'Environment variable'],
              ['doc', 'Documentation'],
              ['type', 'Kind'],
              ['required', 'Must specify'],
            ],
          }),
        `
| Environment variable | Documentation | Kind | Must specify |
| --- | --- | --- | --- |
| TEST_APP_ENABLED | boolean value | boolean | true |
| TEST_APP_NESTED_NESTED | string value | string | true |
| TEST_APP_NESTED_URL | custom value | other | true |`);
    });
    it('Partial custom options', () => {
      assert.equal(
        envConfigDoc(
          configDefinition,
          {
            'environmentVariablePrefix': 'TEST',
            'environmentVariables': {},
            'docColumnMapping': [
              ['doc', 'Documentation'],
              ['type', 'Kind'],
              ['required', 'Must specify'],
            ],
          }),
        `
| Documentation | Kind | Must specify |
| --- | --- | --- |
| boolean value | boolean | true |
| string value | string | true |
| custom value | other | true |`);
    });
    it('Custom options different order', () => {
      assert.equal(
        envConfigDoc(
          configDefinition,
          {
            'environmentVariablePrefix': 'TEST',
            'environmentVariables': {},
            'docColumnMapping': [
              ['doc', 'Documentation'],
              ['required', 'Must specify'],
              ['env', 'Environment variable'],
            ],
          }),
        `
| Documentation | Must specify | Environment variable |
| --- | --- | --- |
| boolean value | true | TEST_APP_ENABLED |
| string value | true | TEST_APP_NESTED_NESTED |
| custom value | true | TEST_APP_NESTED_URL |`);
    });
  });
});