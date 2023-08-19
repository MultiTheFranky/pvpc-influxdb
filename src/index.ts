import { CronJob } from 'cron';
import { getDayPVPCPrices, sentPricesToInflux } from './pvpc';

const cron = process.env.CRON || '0 5 0 * * *'; // Every day at 0:05 AM by default

(async () => {
    console.log('Starting cronjob with cron', cron);
    new CronJob(
        cron,
        async () => {
            try {
                const date = new Date();
                const prices = await getDayPVPCPrices(date);
                await sentPricesToInflux(prices);
            } catch (error) {
                console.error(error);
            }
        },
        null,
        true,
        'Europe/Madrid'
    );
})();
