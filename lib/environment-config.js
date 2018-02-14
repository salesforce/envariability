/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/* jshint node: true, undef: true, unused: true, esversion: 6 */
/* global module, process, require */
'use strict';

const validateSchema = require('jsonschema').validate;
const configElementSchema = require('./config-element-schema.json');

const noTransform = (value) => value;
const defaults = {
  configOptions: {
    'environmentVariablePrefix': '',
    'environmentVariableWordSeparator': '_',
    'environmentVariableValueArraySeparator': '%',
    'environmentVariableTransform': (word) => word.toUpperCase(),
    'immutable': true,
    'environmentVariables': process.env,
  },
  docEnvVarColumnName: 'env',
  rootParent: 'Configuration root',
};

/**
 * Transforms a value found in the environment variable using it's configured type
 * @param {string} type - the required type of the config value
 * @param {function} customProcessor - the custom processor function configured in the schema
 * @param {object} configOptions - the config options
 * @return {*} a transformed (processed) value
 */
function configValueTransform(type, customProcessor, configOptions) {
  switch (type) {
    case 'boolean':
      return (value) => value.toUpperCase() === 'TRUE';
    case 'integer':
      return (value) => parseInt(value, 10);
    case 'array':
      return (value) => value.split(configOptions.environmentVariableValueArraySeparator);
    case 'string':
      return noTransform;
    case 'other':
      return (value) => customProcessor(value, configOptions);
    default:
      throw new Error(`Unknown configuration element type ${type}`);
  }
}

/**
 * Returns the actual config value for a config node. The value found in the environment variable
 * is preferred and the default is used as a fallback. Will error out if the value is not found, there is no default
 * and the config is required
 *
 * @callback configMapper
 * @param {object} configurationNode - the config leaf object
 * @param {string} parentKeyName - the key name of the parent of the current config leaf
 * @param {string} envVarName - the computed environment variable name
 * @param {object} configOptions - the config options
 * @return {*} the final value for the config node
 */
function environmentValueForConfig(configurationNode, parentKeyName, envVarName, configOptions) {
  const environmentValue = configOptions.environmentVariables[envVarName];
  if (configurationNode.required && configurationNode.default === undefined && !environmentValue) {
    throw new Error(`Required configuration ${JSON.stringify(configurationNode)} `
      + `from [${parentKeyName}] doesn't have a default value and no `
      + `corresponding environment variable at ${envVarName}`);
  }

  if (!environmentValue) {
    return configurationNode.default;
  }

  return configValueTransform(
    configurationNode.type,
    configurationNode.transform || noTransform,
    configOptions)(environmentValue);
}

/**
 * Returns true if the value is a primitive and false otherwise
 * @param {*} value - value to check
 * @return {boolean}
 */
function isPrimitive(value) {
  return value !== Object(value);
}

/**
 * Returns true if the object is a config element (matches the config schema) and false otherwise
 * @param {object} configurationNode - the configuration node to validate
 * @return {boolean}
 */
function isConfigElement(configurationNode) {
  return validateSchema(configurationNode, configElementSchema).valid;
}

/**
 * @callback configReducer
 * @param {object} target - the target object which will hold the result
 * @param {...object} sources - list of object which will be combined with the result
 * @return {*} - the target object
 */

/**
 * Recursively traverse the config definition while constructing the environment variable names
 * and mapping the config leaf using a supplied function.
 * The result is then collected using a reducer function.
 *
 * @param {object} configurationNode - the current configuration node
 * @param {object} configOptions - the configuration options
 * @param {string} currentEnvironmentPath - the current environment variable name built from the path from the config
 * root to the current node
 * @param {string} parentKeyName - the parent key name
 * @param {configMapper} mapper
 * @param {configReducer} reducer
 * @return {object} the config result for the node
 */
function processConfigNode(configurationNode,
                           configOptions,
                           currentEnvironmentPath,
                           parentKeyName,
                           mapper,
                           reducer) {
  if (isPrimitive(configurationNode)) {
    throw new Error(`Element ${configurationNode} from ${parentKeyName} `
      + `doesn't match the config schema ${JSON.stringify(configElementSchema)}`);
  }

  if (isConfigElement(configurationNode)) {
    return mapper(configurationNode, parentKeyName, currentEnvironmentPath, configOptions);
  }

  const configResult = Object
    .keys(configurationNode)
    .reduce(
      (accumulator, current) =>
        reducer(
          accumulator,
          {
            [current]:
              processConfigNode(
                configurationNode[current],
                configOptions,
                currentEnvironmentPath
                + configOptions.environmentVariableWordSeparator
                + configOptions.environmentVariableTransform(current),
                current,
                mapper,
                reducer),
          }),
      {});

  return configOptions.immutable ? Object.freeze(configResult) : configResult;
}

/**
 * Builds an object holding a map between default column names and their custom names
 * to be used for generating the documentation. It expects to be provided with such a map
 * from the library configuration. If not, will default to the property names from
 * {@link config-element-schema.json}.
 *
 * @param {object} configDocOptions - a set of options in the form of a 2D array which
 * defines the columns to be included and with what name.
 * @param {object} configElementSchema - the config element schema
 * @return {object} a Map object representing an ordered column name mapping
 */
function docColumnMapping(configDocOptions, configElementSchema) {
  return new Map(
    configDocOptions ||
    [[defaults.docEnvVarColumnName, defaults.docEnvVarColumnName]]
      .concat(
        Object
          .keys(configElementSchema.properties)
          .map((key) => {
            return [key, key];
          })));
}

module.exports = (configuration, configOptions = {}) => {
  const mergedConfigOptions = Object.assign({}, defaults.configOptions, configOptions);
  return processConfigNode(
    configuration,
    mergedConfigOptions,
    mergedConfigOptions.environmentVariablePrefix,
    defaults.rootParent,
    environmentValueForConfig,
    Object.assign);
};

module.exports.doc = (configuration, configOptions = {}) => {
  const mergedConfigOptions = Object.assign({}, defaults.configOptions, configOptions);
  const columns = docColumnMapping(configOptions.docColumnMapping, configElementSchema);
  const propertyNames = Array.from(columns.keys());
  const columnNames = Array.from(columns.values());
  const columnSeparator = ' | ';
  const emptyCell = '---';
  const tableHeader = `| ${columnNames.join(columnSeparator)} |`;
  const tableSeparator = `| ${columnNames.map((x) => emptyCell).join(columnSeparator)} |`;

  return `
${tableHeader}
${tableSeparator}
${processConfigNode(
    configuration,
    mergedConfigOptions,
    mergedConfigOptions.environmentVariablePrefix,
    defaults.rootParent,
    (node, parentName, envPath) => {
      const fullNodeConfig = Object.assign(node, {[defaults.docEnvVarColumnName]: envPath});
      return `| ${propertyNames.map((key) => fullNodeConfig[key] || emptyCell).join(columnSeparator)} |`;
    },
    (a, b) => {
      const first = isPrimitive(a) ? a : '';
      const second = isPrimitive(b) ? b : b[Object.keys(b)[0]];
      return (/\S/.test(first) ? first + '\n' : '') + second;
    })
    }`;
};