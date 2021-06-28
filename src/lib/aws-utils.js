'use strict';

const AWS = require('aws-sdk');

const regions = {};
const apiVersion = '2016-11-15';
const defaultRegion = 'us-east-1';

module.exports = {
  instances,
  start,
  stop,
  reboot,
  state,
  listRegions,
  config,
};

function ec2Handle({ region = defaultRegion }) {
  if (!regions[region]) regions[region] = { name: region };
  region = regions[region];
  if (region.ec2) return region.ec2;
  region.ec2 = new AWS.EC2({ region: region.name, apiVersion });
  return region.ec2;
}

function ec2Promise({ functionName = defaultRegion, region, params }) {
  const ec2 = ec2Handle({ region });
  return new Promise((resolve, reject) => {
    ec2[functionName](params, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

async function ec2Operation({ instance, operation, ...extra }) {
  const { region, id } = instance;
  const ec2 = ec2Handle({ region });
  const params = { InstanceIds: [id], DryRun: false, ...extra };
  return new Promise((resolve, reject) => {
    ec2[operation](params, function (err, data) {
      if (err) return reject(err);
      //console.log(JSON.stringify(data, null, 2));
      return resolve(data);
    });
  });
}

async function instances({ region, params }) {
  const functionName = 'describeInstances';
  if (!params) params = { DryRun: false };
  const data = await ec2Promise({ functionName, region, params });
  const instances = [];
  for (const reservation of data.Reservations) {
    for (const instance of reservation.Instances) {
      //console.log(JSON.stringify(instance, null, 2));
      let {
        InstanceId: id,
        InstanceType: type,
        PrivateIpAddress: privateIP,
        PublicIpAddress: publicIP,
        State: state,
        Tags: tags,
      } = instance;
      let name = tags.find((tag) => tag.Key === 'Name') || '';
      if (name) name = name.Value;
      if (state) state = state.Name;
      instances.push({ name, id, state, type, privateIP, publicIP, region });
    }
  }
  return instances;
}

async function start({ instance }) {
  let data = await ec2Operation({ instance, operation: 'startInstances' });
  return data;
}

async function stop({ instance }) {
  let data = await ec2Operation({ instance, operation: 'stopInstances' });
  if (data.StoppingInstances) data = data.StoppingInstances;
  if (data[0]) data = data[0];
  if (data.CurrentState) data = data.CurrentState;
  if (data.Name) data = data.Name;
  //console.log(data);
  return data;
}

async function reboot({ instance }) {
  let data = await ec2Operation({ instance, operation: 'rebootInstances' });
  return data;
}

async function state({ instance }) {
  let data = await ec2Operation({
    instance,
    operation: 'describeInstanceStatus',
    IncludeAllInstances: true,
  });
  if (!data.InstanceStatuses) return data;
  data = data.InstanceStatuses;
  if (!data[0]) return data;
  data = data[0];
  let { InstanceState: state, InstanceStatus: status } = data;
  if (state.Name) state = state.Name;
  if (status.Status) status = status.Status;
  if (status === 'not-applicable') status = '';
  else state = state + ': ' + status;
  //console.log(state);
  return state;
}

const regionSort = ['us-east', 'us-west', 'us', 'ca', 'eu', 'sa', 'ap'];

function sortIndex(region) {
  let _region = region.split('-');
  _region.pop();
  let index = regionSort.indexOf(_region.join('-'));
  if (index >= 0) return index;
  index = regionSort.indexOf(_region[0]);
  if (index >= 0) return index;
  return 1000;
}

async function listRegions(params) {
  const functionName = 'describeRegions';
  if (!params) params = {};
  const data = await ec2Promise({ functionName, region: 'us-east-1', params });
  const regions = data.Regions.map((item) => item.RegionName).sort(
    (a, b) => sortIndex(a) - sortIndex(b) || a.localeCompare(b)
  );
  //console.log(JSON.stringify(regions, null, 2));
  return regions;
}

function config({ profile, accessKeyId, secretAccessKey }) {
  let credentials;
  if (accessKeyId && secretAccessKey) credentials = { accessKeyId, secretAccessKey };
  else if (profile) credentials = new AWS.SharedIniFileCredentials({ profile });
  if (credentials) AWS.config.credentials = credentials;
}
