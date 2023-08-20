import { InfluxDB, Point } from "@influxdata/influxdb-client";
import axios from "axios";
import logger from "../logger";

// Env: INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET
const { INFLUXDB_URL } = process.env;
const { INFLUXDB_TOKEN } = process.env;
const { INFLUXDB_ORG } = process.env;
const { INFLUXDB_BUCKET } = process.env;

// Constants
const PVPC_URL =
  "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?";

// Variables
let influx: InfluxDB;

// Function to initialize InfluxDB
export const startInflux = async () => {
  if (!INFLUXDB_URL || !INFLUXDB_TOKEN || !INFLUXDB_ORG || !INFLUXDB_BUCKET)
    throw new Error("Missing InfluxDB env variables");
  if (!influx) {
    logger.info("Initializing InfluxDB");
    influx = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
  }
  return influx;
};

type PVPC = {
  date: Date; // Date with hour
  price: number; // Price in €/MWh
};

// Function to get PVPC prices for a day
export const getDayPVPCPrices = async (date: Date): Promise<PVPC[]> => {
  logger.info(`Getting PVPC prices for ${date}`);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const url = `${PVPC_URL}start_date=${year}-${month}-${day}T00:00&end_date=${year}-${month}-${day}T23:59&time_trunc=hour`;
  const response = await axios.get(url);
  const prices = response.data.included[0].attributes.values;
  logger.info(`Got ${prices.length} prices`);
  return prices.map((price: any) => ({
    date: new Date(price.datetime),
    price: price.value,
  }));
};

// Function to get PVPC price for a hour
export const getHourPVPCPrice = async (date: Date): Promise<number> => {
  logger.info(`Getting PVPC price for ${date}`);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hour = date.getHours();
  const url = `${PVPC_URL}start_date=${year}-${month}-${day}T${hour}:00&end_date=${year}-${month}-${day}T${hour}:59&time_trunc=hour`;
  const response = await axios.get(url);
  const prices = response.data.included[0].attributes.values;
  logger.info(`Got ${prices.length} prices`);
  return prices[0].value;
};

// Function to send PVPC prices to InfluxDB
export const sentPricesToInflux = async (prices: PVPC[]) => {
  logger.info("Sending PVPC prices to InfluxDB");
  await startInflux();
  if (!INFLUXDB_ORG || !INFLUXDB_BUCKET)
    throw new Error("Missing InfluxDB env variables");
  const writeApi = influx.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET);
  prices.forEach((price) => {
    const point = new Point("pvpc")
      .timestamp(price.date)
      .floatField("price", price.price);
    writeApi.writePoint(point);
  });
  await writeApi.close();
  logger.info(`Sent ${prices.length} prices to InfluxDB`);
};

type Consumer = {
  bucket: string; // InfluxDB bucket
  filter: string; // InfluxDB filter
};

// Function to get consumers
const consumersEnv = process.env.CONSUMERS; // name1:bucket1:filter1,name2:bucket2:filter2,...
// Function to get consumers
export const getConsumers = (): Consumer[] => {
  if (!consumersEnv) return [];
  return consumersEnv.split(",").map((consumer) => {
    const [bucket, filter] = consumer.split(":");
    return {
      bucket,
      filter,
    };
  });
};

// Function to get the mean consume of a consumer between now and 1 hour ago
export const getConsume = async (consumer: Consumer): Promise<number> => {
  await startInflux();
  if (!INFLUXDB_ORG) throw new Error("Missing InfluxDB env variables");
  const queryApi = influx.getQueryApi(INFLUXDB_ORG);
  const query = `from(bucket: "${consumer.bucket}")
    |> range(start: -1h, stop: now())
    |> filter(fn: (r) => ${consumer.filter})`;
  logger.info(`Querying InfluxDB: ${query}`);

  const result: number[] = await queryApi.collectRows(
    query,
    (row, tableMeta) => {
      const o = tableMeta.toObject(row);
      // eslint-disable-next-line no-underscore-dangle
      return o._value;
    },
  );
  if (result.length === 0) return 0;
  const total = result.reduce((sum, row) => sum + row, 0);
  return total / result.length;
};

// Function to get the mean consume of all consumers between now and 1 hour ago
export const getMeanConsume = async (): Promise<number> => {
  const consumers = getConsumers();
  if (consumers.length === 0) return 0;
  const consumes = await Promise.all(
    consumers.map(async (consumer) => getConsume(consumer)),
  );
  const total = consumes.reduce((sum, consume) => sum + consume, 0);
  return total / consumes.length;
};

export const sentPriceToInflux = async (price: number) => {
  logger.info("Sending price to InfluxDB");
  await startInflux();
  if (!INFLUXDB_ORG || !INFLUXDB_BUCKET)
    throw new Error("Missing InfluxDB env variables");
  const writeApi = influx.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET);
  const point = new Point("consumption")
    .timestamp(new Date())
    .floatField("price", price);
  writeApi.writePoint(point);
  await writeApi.close();
  logger.info("Sent price to InfluxDB");
};
