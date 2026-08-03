"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Narrow, frozen bridge (PRD §16.1 SS-03). No dynamic keys.
const locus = {
  settings: {
    get: (key, fallback) => ipcRenderer.invoke("settings:get", key, fallback),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },
  vault: {
    recent: () => ipcRenderer.invoke("vault:recent"),
    pickFolder: () => ipcRenderer.invoke("vault:pickFolder"),
    create: (parent, name) => ipcRenderer.invoke("vault:create", parent, name),
    open: (path) => ipcRenderer.invoke("vault:open", path),
    close: () => ipcRenderer.invoke("vault:close"),
    removeRecent: (path) => ipcRenderer.invoke("vault:removeRecent", path),
  },
  fs: {
    list: () => ipcRenderer.invoke("fs:list"),
    read: (relPath) => ipcRenderer.invoke("fs:read", relPath),
    write: (relPath, content) => ipcRenderer.invoke("fs:write", relPath, content),
    createNote: (relPath, content) =>
      ipcRenderer.invoke("fs:createNote", relPath, content),
    createFolder: (relPath) => ipcRenderer.invoke("fs:createFolder", relPath),
    rename: (oldRel, newRel) => ipcRenderer.invoke("fs:rename", oldRel, newRel),
    trash: (relPath) => ipcRenderer.invoke("fs:trash", relPath),
    reveal: (relPath) => ipcRenderer.invoke("shell:reveal", relPath),
  },
  search: {
    notes: (query, opts) => ipcRenderer.invoke("search:notes", query, opts),
  },
  on: {
    fsChanged: (cb) => {
      const listener = () => cb();
      ipcRenderer.on("fs:changed", listener);
      return () => ipcRenderer.removeListener("fs:changed", listener);
    },
    themeToggle: (cb) => {
      const listener = (_e, theme) => cb(theme);
      ipcRenderer.on("theme:toggle", listener);
      return () => ipcRenderer.removeListener("theme:toggle", listener);
    },
  },
};

Object.freeze(locus);
contextBridge.exposeInMainWorld("locus", locus);
