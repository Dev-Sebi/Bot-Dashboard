const { thread, mid } = require("../database/connection");
log = console.log

function getGuildSettings(serverid, bot) {
    if (!serverid) return;
    return new Promise((res, rej) => {
        if (bot === process.env.ThreadManager) {
            thread.query(
                {
                    sql: `SELECT * FROM ${process.env.DB_DATABASENAME} WHERE id=?`,
                    timeout: 10000,
                    values: [serverid],
                },
                async function (err, result, fields) {
                    if (err)
                        throw err;
                    if (Object.values(result).length == 0) {
                        return;
                    }
                    else {
                        res(result[0])
                    }
                })
        }
        else if (bot === process.env.Midnight) {
            mid.query(
                {
                    sql: `SELECT * FROM ${process.env.DB_DATABASENAME} WHERE id=?`,
                    timeout: 10000,
                    values: [serverid],
                },
                async function (err, result, fields) {
                    if (err)
                        throw err;
                    if (Object.values(result).length == 0) {
                        return;
                    }
                    else {
                        res(result[0])
                    }
                })
        }
        else {
            return;
        }
    });
}

module.exports = { getGuildSettings }