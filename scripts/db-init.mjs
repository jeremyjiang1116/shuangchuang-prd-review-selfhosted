import {loadConfig} from './config.mjs';
import {initializeDatabase} from './database.mjs';
console.log(JSON.stringify(initializeDatabase(loadConfig())));
