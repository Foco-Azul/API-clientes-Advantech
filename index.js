const server = require('./src/app.js');
const axios = require('axios');         

server.listen(3001, () => {
  console.log('%s listening at 3001'); // eslint-disable-line no-console
});