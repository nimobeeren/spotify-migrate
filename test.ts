import { LocalStorage } from "node-localstorage";
const localStorage = new LocalStorage("./credentials");

localStorage.setItem("code", "SECRET");
const value = localStorage.getItem("asdf");
console.log({ value });
