require('dotenv').config();

const express           = require('express');
const app               = express();

const fetch             = require('node-fetch');
const HTMLParser        = require('node-html-parser');
const schedule          = require('node-schedule');

const Discord           = require("discord.js");
const client            = new Discord.Client();

const url_darkfiber     = 'https://rvn.darkfibermines.com/stats/ravencoin';
let blocks_pending_old  = 0;
let blocks_pending_new  = 0;

/*
    Discord function
 */

client.login(process.env.DISCORD_TOKEN);

client.once("ready", async () => {
    if(process.env.AUTO_SCRAPE_WEBSITE){
        const pending_info = await stat_request();
        blocks_pending_old = blocks_pending_new = pending_info[1].value;
        
        /*
        Scheduling
        */
        const rule = new schedule.RecurrenceRule();
        rule.second = [new schedule.Range(0, 55, 10)];
        
        const job = schedule.scheduleJob(rule, async () => {
           // console.log('The answer to life, the universe, and everything!');
            await check_stats();
        });
    }

    // process.exit();
});

/*
    API endpoint
 */

app.listen(8081);
app.use(express.json());

// curl -X POST -H "Content-Type: application/json" -d '{"notifId": "notification id"}' localhost:8081/APIv1/block-notify/rvn
app.post('/APIv1/block-notify/rvn', (req, res) => {
    if(req.body.notifId === process.env.NOTIF_ID) {
        // console.log(`New block hit!`);
        notify_channel(process.env.CHANNEL_ID, `New block hit!`);
        res.status(200).send(1);
    } else {
        res.status(404).send(-1);
    }
});

/*
    Helper functions
 */

const notify_channel = (id, msg) => {
    client.channels.cache.get(id).send(msg);
};

const check_stats = async () => {
    const pending_info = await stat_request();
    // console.log(`${pending_info[1].name}: ${pending_info[1].value}`);

    blocks_pending_new = pending_info[1].value;

    if(blocks_pending_new > blocks_pending_old){
        notify_channel(process.env.CHANNEL_ID, `${pending_info[1].name}: ${pending_info[1].value}`);
    }

    blocks_pending_old = blocks_pending_new;
};

const stat_request = async () => {
    let stats_refined = [];

    await fetch(url_darkfiber)
        .then(res => res.text())
        .then(body => {
            const root = HTMLParser.parse(body);
    
            let stats = root.querySelectorAll('p.pool-statss-item-2');
            
            stats.forEach(el => {
                var value_text = el.querySelector('span').textContent.trim();
                var name_text = el.textContent.replace(value_text, '').trim();
            
                stats_refined.push({
                    name: name_text,
                    value: value_text
                });
            });
        });

    return(stats_refined);
}
