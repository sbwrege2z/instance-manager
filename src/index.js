'use strict';

const ini = require('ini');
const ora = require('ora');
const prompt = require('./lib/prompts');
const fileUtils = require('./lib/file-utils');
const aws = require('./lib/aws-utils');
const { forceDirectories } = require('./lib/file-utils');

const { readFile, writeFile, fileExists } = fileUtils;

let config, iniFile, profile;
let regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'];

const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

async function chooseInstance({ region, instances }) {
  let selection = await prompt.select({
    message: `Select an ${region} instance:`,
    choices: instances.map(({ name, state, id }, index) => {
      return {
        title: `${name} (${state})`,
        description: id,
        value: index,
      };
    }),
  });
  console.log('');
  return instances[selection];
}

async function chooseRegion(regions) {
  const region = await prompt.select({
    message: 'Select a region:',
    choices: [...regions, '[add regions]'],
  });
  console.log('');
  return region;
}

async function lookupInstances({ region }) {
  const instances = (await aws.instances({ region })) || [];
  instances.sort(
    (a, b) =>
      a.state.localeCompare(b.state) || a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
  return instances;
}

function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
}

async function confirm({ message, initial = true }) {
  const confirm = await prompt.confirm({ message, initial });
  return confirm;
}

async function performOperation({ instance, operation }) {
  if (instance.state !== 'stopped' && (operation === 'stop' || operation === 'reboot')) {
    const confirmed = await confirm({
      message: `Are you sure you want to ${operation} this instance?`,
      //initial: false,
    });
    console.log('');
    if (!confirmed) return;
  }

  const { name } = instance;
  const spinner = ora(`${operation === 'stop' ? 'Stopp' : capitalize(operation)}ing ${name}`);
  try {
    let waitFor = /^running: ok/;
    if (operation === 'stop') waitFor = /^stopped/;
    if (operation === 'refresh') waitFor = /./;
    else await aws[operation]({ instance });
    //console.log(JSON.stringify(data, null, 2));
    spinner.start();
    let current = '';
    for (let i = 1; i <= 60; i++) {
      const state = await aws.state({ instance });
      if (current !== state) {
        current = state;
        console.log(' ' + current);
      }
      instance.state = state.split(':')[0];
      if (waitFor.test(state)) break;
      await sleep(1000);
    }
    spinner.succeed();
  } catch (error) {
    spinner.fail(error.message || error);
  }
  console.log('');
}

async function chooseOperation({ instance }) {
  const { name, state } = instance;
  const choices = [
    { title: `Refresh state`, description: '', value: 'refresh' },
    { title: `Start instance`, description: '', value: 'start' },
    { title: `Stop instance`, description: '', value: 'stop' },
    { title: `Reboot instance`, description: '', value: 'reboot' },
  ];
  console.log(`${name} is currently ${state.toUpperCase()}`);
  const choice = await prompt.select({
    message: `Would you like to:`,
    choices: choices,
  });
  console.log('');
  return choice;
}

async function configureRegions() {
  try {
    const allRegions = await aws.listRegions();
    const options = {
      type: 'autocompleteMultiselect',
      name: 'value',
      message: 'Which regions do you want to display?',
      choices: allRegions.map((region) => {
        return { title: region, value: region, selected: regions.indexOf(region) >= 0 };
      }),
      hint: '- Space to select. Return to submit',
      instructions: false,
    };
    let choices = await prompt.generic(options);
    if (choices && choices.value && choices.value.length > 0) {
      choices = choices.value;
      regions = choices;
    }
    await saveRegions();
  } catch (error) {
    const message = error.message || error;
    console.error(message + '\n');
  }
}

async function saveRegions() {
  iniFile[profile].regions = regions.join(',');
  const filename = './data/config';
  await writeFile(filename, ini.stringify(iniFile));
}

async function verifyCredentials(config) {
  let { awsProfile, accessKeyId, secretAccessKey } = config;
  if (accessKeyId && secretAccessKey) return aws.config({ accessKeyId, secretAccessKey });
  ({ AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey } = process.env);
  if (accessKeyId && secretAccessKey) return aws.config({ accessKeyId, secretAccessKey });
  if (awsProfile) return aws.config({ profile: awsProfile });

  //const home = process.env.NVM_DIR.replace(/\/\.nvm$/, '/.aws').trimRight('/');
  const home = '/root/.aws';
  const filename = home + '/credentials';
  //console.log(filename);
  if (!(await fileExists(filename))) return;
  let credentials = await readFile(filename);
  if (!credentials) return;
  credentials = ini.parse(credentials.toString());
  const profiles = Object.keys(credentials || {});
  if (profiles.length === 1) profile = profiles[0];
  else if (profiles.length > 1) {
    awsProfile = await prompt.select({
      message: `Select an AWS profile:`,
      choices: profiles,
    });
  }
  if (awsProfile) aws.config({ profile: awsProfile });
}

async function initialize() {
  if (await fileExists('./data/config')) iniFile = await readFile('./data/config');
  if (iniFile) iniFile = ini.parse(iniFile.toString());
  else iniFile = { default: {} };
  const profiles = Object.keys(iniFile);
  profile = 'default';
  if (profiles.length === 1) profile = profiles[0];
  else if (profiles.length > 1) {
    profile = await prompt.select({
      message: `Select an profile:`,
      choices: profiles,
    });
    console.log(profile);
  }
  config = Object.assign({}, iniFile.default, iniFile[profile]);
  if (config.regions) config.regions = config.regions.split(',');
  await verifyCredentials(config);
}

(async () => {
  //console.log(JSON.stringify(process.env, null, 2));
  //process.exit(0);
  await initialize();
  regions = config.regions || regions;

  while (true) {
    const region = await chooseRegion(regions);
    if (!region) {
      if (await confirm({ message: `Are you sure you want to exit?` })) process.exit(0);
      console.log('');
      continue;
    }
    if (/add regions/i.test(region)) {
      await configureRegions();
      continue;
    }
    try {
      while (true) {
        const instances = await lookupInstances({ region });
        if (instances.length === 0) {
          console.warn('There are no instances in this region.\n');
          regions.splice(regions.indexOf(region), 1);
          await saveRegions();
          break;
        }
        const instance = await chooseInstance({ region, instances });
        if (!instance) break;

        while (true) {
          const operation = await chooseOperation({ instance });
          if (!operation) break;
          await performOperation({ instance, operation });
        }
      }
    } catch (error) {
      const message = error.message || error;
      console.error(message + '\n');
    }
  }
})();
