import { CronJob } from 'cron';
import { getDayPVPCPrices, sentPricesToInflux } from './pvpc';

const cron = process.env.CRON || '5 0 * * *'; // Every day at 0:05 AM by default

(async () => {
    const cronjob = new CronJob(cron, async () => {
        try {
        const date = new Date();
        const prices = await getDayPVPCPrices(date);
        await sentPricesToInflux(prices);
    } catch (error) {
        console.error(error);
    }
    });
    cronjob.start();
})();
