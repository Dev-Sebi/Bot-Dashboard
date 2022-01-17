'use strict'

const SebiAge = function()
{
    const date = new Date();
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear();
    const age = year - 2002
    if(month < 4)
    {
        document.getElementById('age').textContent = age - 1
    }
    if ((month == 4 && day >= 15) || month > 4)
    {
        document.getElementById('age').textContent = age
    }
}

const getDevelopers = function(bot)
{
    console.log(bot)
    
}