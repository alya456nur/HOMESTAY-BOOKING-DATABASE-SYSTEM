const oracledb = require('oracledb');

async function getConnection() {
  return await oracledb.getConnection({
    user: "user1",
    password: "pwd1",
    connectString: "localhost:1521/FREEPDB1"
  });
}

module.exports = getConnection;
