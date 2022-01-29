'use strict';
console.clear()

require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT
const pico = require("picocolors")
const log = console.log;
const session = require('express-session')
const cookieParser = require('cookie-parser');

app.set("view-engine", "ejs")
app.use(express.static(__dirname + '/public')); //static directory
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  expires: 604800000,
}));

require('./router')(app);

app.listen(port, () => {
  log(pico.green(`Dashboard listening on Port ${port}`))
})