//MWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMW
//MW  PRETTIER CONFIGURATION
//MWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMW

module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  quoteProps: 'consistent', //           # quote properties: needed|consistent|preserve
  bracketSpacing: true,
  arrowParens: 'always', //              # avoid|always
  htmlWhitespaceSensitivity: 'css', //   # css|strict|ignore
  endOfLine: 'lf', //                    # auto|lf|crlf|cr
  singleQuote: true,
  semi: true,
  overrides: [
    {
      files: '**/*.js',
      options: {
        singleQuote: true,
        useTabs: false,
      },
    },
    {
      files: '**/*.json',
      options: {
        useTabs: false,
      },
    },
    {
      files: '**/*.yaml',
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: '**/*.{htm,html}',
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: '**/*.hbs',
      options: {
        parser: 'vue',
        tabWidth: 2,
        useTabs: false,
      },
    },
  ],
};
