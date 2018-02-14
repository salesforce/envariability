/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/* jshint node: true, undef: true, unused: true, esversion: 6 */
/* global module */
/* eslint max-len: ["error", { "ignoreStrings": true }] */
'use strict';

module.exports = () => {
  return {
    'correct-definitions': [
      {
        'name': 'all defaults',
        'expectedConfig': {
          'app': {
            'enabled': false,
            'port': 8080,
            'nested': {
              'nested': 'nested',
            },
          },
        },
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'default': false,
              'required': true,
            },
            'port': {
              'doc': 'integer value',
              'type': 'integer',
              'default': 8080,
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
        },
        'configOptions': {
          'environmentVariables': {},
        },
      },
      {
        'name': 'no defaults',
        'expectedConfig': {
          'app': {
            'enabled': false,
            'port': 8080,
            'nested': {
              'nested': 'nested',
            },
          },
        },
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'required': true,
            },
            'port': {
              'doc': 'integer value',
              'type': 'integer',
              'required': true,
            },
            'nested': {
              'nested': {
                'doc': 'string value',
                'type': 'string',
                'required': true,
              },
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariables': {
            'TEST_APP_ENABLED': 'false',
            'TEST_APP_PORT': '8080',
            'TEST_APP_NESTED_NESTED': 'nested',
          },
        },
      },
      {
        'name': 'no defaults, custom form environment variables',
        'expectedConfig': {
          'APP': {
            'Enabled': false,
            'Port': 8080,
            'Nested': {
              'Nested': 'nested',
            },
          },
        },
        'configDefinition': {
          'APP': {
            'Enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'required': true,
            },
            'Port': {
              'doc': 'integer value',
              'type': 'integer',
              'required': true,
            },
            'Nested': {
              'Nested': {
                'doc': 'string value',
                'type': 'string',
                'required': true,
              },
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariableWordSeparator': '-separator-',
          'environmentVariableTransform': (value) => value.toLowerCase(),
          'environmentVariables': {
            'TEST-separator-app-separator-enabled': 'false',
            'TEST-separator-app-separator-port': '8080',
            'TEST-separator-app-separator-nested-separator-nested': 'nested',
          },
        },
      },
      {
        'name': 'default transformations',
        'expectedConfig': {
          'app': {
            'enabled': true,
            'port': 8080,
            'nested': {
              'nested': 'nested',
            },
            'multi': ['a', 'b', 'c'],
          },
        },
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'required': true,
            },
            'port': {
              'doc': 'integer value',
              'type': 'integer',
              'required': true,
            },
            'nested': {
              'nested': {
                'doc': 'string value',
                'type': 'string',
                'required': true,
              },
            },
            'multi': {
              'doc': 'array value',
              'type': 'array',
              'required': true,
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariableValueArraySeparator': ';',
          'environmentVariables': {
            'TEST_APP_ENABLED': 'true',
            'TEST_APP_PORT': '8080',
            'TEST_APP_NESTED_NESTED': 'nested',
            'TEST_APP_MULTI': 'a;b;c',
          },
        },
      },
      {
        'name': 'custom transformations',
        'expectedConfig': {
          'app': {
            'nested': {
              'nested': 'UPPERCASE_NESTED',
              'multi': ['B', 'C', 'D'],
              'multiWithConfig': ['A', 'B', 'C'],
            },
            'multi': ['a ', '    b ', ' c '],
          },
        },
        'configDefinition': {
          'app': {
            'nested': {
              'nested': {
                'doc': 'string value',
                'type': 'other',
                'required': true,
                'transform': (value) => value.toUpperCase(),
              },
              'multi': {
                'doc': 'array value',
                'type': 'other',
                'required': true,
                'transform': (value) => value.split('%').map((value) => value.trim().toUpperCase()),
              },
              'multiWithConfig': {
                'doc': 'array value',
                'type': 'other',
                'required': true,
                'transform': (value, config) => value
                  .split(config.customSeparator)
                  .map((value) => value.trim().toUpperCase())
                  .filter((x) => x),
              },
            },
            'multi': {
              'doc': 'array value',
              'type': 'array',
              'required': true,
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariableValueArraySeparator': ';',
          'customSeparator': '.',
          'environmentVariables': {
            'TEST_APP_NESTED_NESTED': 'uppercase_nested',
            'TEST_APP_NESTED_MULTI': 'b % c % d ',
            'TEST_APP_NESTED_MULTIWITHCONFIG': 'a ....    b . c .',
            'TEST_APP_MULTI': 'a ;    b ; c ',
          },
        },
      },
      {
        'name': 'undefined configurations',
        'expectedConfig': {
          'app': {
            'enabled': true,
            'port': 8080,
            'empty': undefined,
            'nested': {
              'empty': undefined,
            },
          },
        },
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'required': true,
            },
            'port': {
              'doc': 'integer value',
              'type': 'integer',
              'required': true,
            },
            'nested': {
              'empty': {
                'doc': 'string value',
                'type': 'string',
                'required': false,
              },
            },
            'empty': {
              'doc': 'string value',
              'type': 'string',
              'required': false,
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariables': {
            'TEST_APP_ENABLED': 'true',
            'TEST_APP_PORT': '8080',
          },
        },
      },
    ],
    'incorrect-definitions': [
      {
        'name': 'config required, no default, no environment variable',
        'expectedErrorPattern': `Required configuration {.*} from .* doesn't have a default value and no corresponding environment variable .*`,
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'boolean value',
              'type': 'boolean',
              'required': true,
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariables': {},
        },
      },
      {
        'name': 'config definition does not match schema',
        'expectedErrorPattern': `Element .* from .* doesn\\'t match the config schema .*`,
        'configDefinition': {
          'app': {
            'enabled': true,
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariables': {},
        },
      },
      {
        'name': 'config required, type with no transformation, no custom transformation',
        'expectedErrorPattern': `Element .* from .* doesn\\'t match the config schema .*`,
        'configDefinition': {
          'app': {
            'enabled': {
              'doc': 'Some type value',
              'type': 'any_type',
              'required': true,
            },
          },
        },
        'configOptions': {
          'environmentVariablePrefix': 'TEST',
          'environmentVariables': {
            'TEST_APP_ENABLED': 'some value',
          },
        },
      },
    ],
  };
};