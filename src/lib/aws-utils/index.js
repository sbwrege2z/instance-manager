'use strict';

const AWS = require('aws-sdk');
const ec2Utils = require('./ec2-utils');
const cfnUtils = require('./cfn-utils');

module.exports = {
  ec2: ec2Utils,
  cfn: cfnUtils,
  config,
};

function config({ profile, accessKeyId, secretAccessKey }) {
  let credentials;
  if (accessKeyId && secretAccessKey) credentials = { accessKeyId, secretAccessKey };
  else if (profile) credentials = new AWS.SharedIniFileCredentials({ profile });
  if (credentials) AWS.config.credentials = credentials;
}
