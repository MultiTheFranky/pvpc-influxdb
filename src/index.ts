import { CronJob } from "cron";
import {
  getConsumers,
  getDayPVPCPrices,
  getHourPVPCPrice,
  getMeanConsume,
  sentPriceToInflux,
  sentPricesToInflux,
} from "./pvpc";
import logger from "./logger";

const cron = process.env.CRON || "0 5 0 * * *"; // Every day at 0:05 AM by default

(async () => {
  logger.info(`Starting PVPC cronjob with cron ${cron}`);
  // Main cronjob per day to get the PVPC prices and send them to InfluxDB
  const pvpcCronJob = new CronJob(
    cron,
    async () => {
      try {
        const date = new Date();
        const prices = await getDayPVPCPrices(date);
        await sentPricesToInflux(prices);
      } catch (error) {
        logger.error(error);
      }
    },
    null,
    false,
    "Europe/Madrid",
  );
  pvpcCronJob.start();
  logger.info("Cronjob PVPC started");

  // Cronjob to check every hour the price by mean consumer
  logger.info("Starting mean consume cronjob");
  const consumerCronJob = new CronJob(
    "0 0 * * * *",
    async () => {
      try {
        if (getConsumers().length === 0) return;
        const date = new Date();
        const price = await getHourPVPCPrice(date);
        logger.info(`PVPC price for ${date} is ${price} €/kWh`);
        const meanConsume = await getMeanConsume();
        logger.info(`Mean consume is ${meanConsume} W`);
        const cost = meanConsume * (price / 1000000);
        logger.info(`Cost for ${meanConsume} W at ${price} €/kWh is ${cost} €`);
        await sentPriceToInflux(cost);
      } catch (error) {
        logger.error(error);
      }
    },
    null,
    false,
    "Europe/Madrid",
  );
  consumerCronJob.start();
  logger.info("Cronjob mean consume started");
})();
