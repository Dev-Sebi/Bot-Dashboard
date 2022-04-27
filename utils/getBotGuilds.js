const { thread, mid } = require("../database/connection");
log = console.log

function getBotGuilds(bot) {
    if (!bot) return;
    return new Promise((res, rej) => {
        let tmp_id = [];
        let i = 0
        if (bot === process.env.ThreadManager) {
            thread.query(
                {
                    sql: `SELECT id FROM ${process.env.DB_DATABASENAME}`,
                    timeout: 10000,
                },
                async function (err, result, fields) {
                    if (err)
                        throw err;
                    if (Object.values(result).length == 0) {
                        return undefined;
                    }
                    else {
                        while(Object.values(result).length > i)
                        {
                            tmp_id.push(Object.values(result[i]));
                            i++;
                        }
                        res(tmp_id)
                    }
                })
        }
        else if (bot === process.env.Midnight) {
            mid.query(
                {
                    sql: `SELECT id FROM ${process.env.DB_DATABASENAME}`,
                    timeout: 10000,
                },
                async function (err, result, fields) {
                    if (err)
                        throw err;
                    if (Object.values(result).length == 0) {
                        return undefined;
                    }
                    else {
                        while(Object.values(result).length > i)
                        {
                            tmp_id.push(Object.values(result[i]));
                            i++;
                        }
                        res(tmp_id)
                    }
                })
        }
        else {
            return undefined;
        }
    });
}

module.exports = { getBotGuilds }