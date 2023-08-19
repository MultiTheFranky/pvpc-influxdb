import { InfluxDB, Point } from '@influxdata/influxdb-client'
import axios from 'axios'

// Env: INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET
const INFLUXDB_URL = process.env.INFLUXDB_URL
const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN
const INFLUXDB_ORG = process.env.INFLUXDB_ORG
const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET

// Constants
const PVPC_URL =
    'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?'

// Variables
let influx: InfluxDB

// Function to initialize InfluxDB
export const startInflux = async () => {
    if (!INFLUXDB_URL || !INFLUXDB_TOKEN || !INFLUXDB_ORG || !INFLUXDB_BUCKET)
        throw new Error('Missing InfluxDB env variables')
    if (!influx) {
        console.log('Initializing InfluxDB')
        influx = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
    }
    return influx
}

type PVPC = {
    date: Date // Date with hour
    price: number // Price in €/MWh
}

// Function to get PVPC prices for a day
export const getDayPVPCPrices = async (date: Date): Promise<PVPC[]> => {
    console.log('Getting PVPC prices for', date)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const url = `${PVPC_URL}start_date=${year}-${month}-${day}T00:00&end_date=${year}-${month}-${day}T23:59&time_trunc=hour`
    const response = await axios.get(url)
    const prices = response.data.included[0].attributes.values
    console.log('Got', prices.length, 'prices')
    return prices.map((price: any) => {
        return {
            date: new Date(price.datetime),
            price: price.value,
        }
    })
}

// Function to send PVPC prices to InfluxDB
export const sentPricesToInflux = async (prices: PVPC[]) => {
    console.log('Sending PVPC prices to InfluxDB')
    const influx = await startInflux()
    if (!INFLUXDB_ORG || !INFLUXDB_BUCKET)
        throw new Error('Missing InfluxDB env variables')
    const writeApi = influx.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET)
    for (const price of prices) {
        const point = new Point('pvpc')
            .timestamp(price.date)
            .floatField('price', price.price)
        writeApi.writePoint(point)
    }
    await writeApi.close()
    console.log('Sent', prices.length, 'prices to InfluxDB')
}
