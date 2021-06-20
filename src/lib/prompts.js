'use strict';

const prompts = require('prompts');

module.exports = {
  confirm,
  select,
  generic,
};

async function generic(options) {
  const response = await prompts(options);
  return response;
}

async function confirm({ message, initial = true }) {
  const options = {
    type: 'confirm',
    name: 'continue',
    message: message,
    initial: initial || initial.toString().toLowerCase() === 'true',
  };
  const response = await prompts(options);
  return response.continue;
}

async function select({ message, choices = ['A', 'B', 'C'], initial = 0 }) {
  const options = {
    type: 'select',
    name: 'choice',
    message: message || 'Which on would you like?',
    choices: choices.map((choice) => {
      if (typeof choice === 'string') return { title: choice, value: choice };
      return choice;
    }),
    initial: Math.max(choices.indexOf(initial), 0),
  };
  const response = await prompts(options);
  return response.choice;
}
