'use strict';

const fs = require('fs');

const { promisify } = require('es6-promisify');
const fileStats = promisify(fs.stat);
const renameFile = promisify(fs.rename);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const copyFile = promisify(fs.copyFile);
const readDir = promisify(fs.readdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

const fileUtils = {
  deleteFile,
  renameFile,
  writeFile,
  readFile,
  copyFile,
  readDir,
  mkdir,
  rmdir,
  access,
  forceDirectories,
  fileExists,
  fileStats,
  changeFileExt,
  readDirStats,
  fileExt,
};

module.exports = Object.assign({}, fs, fileUtils);

async function deleteFile(filename) {
  if (await fileExists(filename)) {
    try {
      //fs.unlinkSync(filename);
      await unlink(filename);
    } catch (error) {}
  }
}

function changeFileExt(filename, ext = '') {
  if (!filename) return filename;
  filename = filename.split('.');
  let extension = filename.pop();
  if (ext) extension = ext;
  else extension = '~' + extension;
  filename.push(extension);
  return filename.join('.');
}

async function forceDirectories(path) {
  if (!path) return 'No path supplied to forceDirectories';
  path = path.split('/');
  const item = path.pop();
  if (item && !item.includes('.')) path.push(item);
  path = path.join('/');
  await mkdir(path, { recursive: true });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
}

function isPromise(obj) {
  return !!(obj && obj.then);
}

function fileExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

async function readDirStats({ path, recursive = false, filter, status, reverse = false }) {
  const files = [];
  path = path.replace(/\/+$/, '');
  if (!path) throw 'readDirStats must be called with a path';
  if (!(await fileExists(path))) return;
  let fileNames = await readDir(path);
  if (reverse) fileNames = fileNames.reverse();
  for (const name of fileNames) {
    const filename = path + '/' + name;
    const stats = await fileStats(filename);
    const file = Object.assign(stats, { name, path });
    if (!filter || filter(file)) {
      files.push(file);
      if (status) {
        const cb = status(file);
        if (isPromise(cb)) {
          await cb;
        }
      }
      if (recursive && file.isDirectory()) {
        const more = await readDirStats({ path: filename, recursive, filter, status });
        for (const file of more) files.push(file);
      }
    }
  }
  return files;
}
