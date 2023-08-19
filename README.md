# PVPC Prices to InfluxDB

This script downloads the hourly prices from the [PVPC](https://www.esios.ree.es/es/pvpc) and stores them in an InfluxDB database.


## Configuration

The configuration is done through environment variables. The following variables are available:

| Variable | Description | Default value |
| -------- | ----------- | ------------- |
| `INFLUXDB_URL` | InfluxDB host url | |
| `INFLUXDB_TOKEN` | Influx token | |
| `INFLUXDB_ORG` | Influx organization | |
| `INFLUXDB_BUCKET` | Influx bucket | |
| `CRON` | Cron expression to run the script | `5 0 * * *` |

## Using docker

### Requirements
- Docker 20.10+
- Docker Compose 1.29+

### Usage
Copy the `docker-compose.example.yml` file to `docker-compose.yml` and fill the required variables.
```bash
docker-compose up -d
```

## Using source code

### Requirements
- Node.js 16+
- Yarn 1.22+

### Installation
```bash
yarn install
```

Rename `.env.example` to `.env` and fill the required variables.

### Usage
```bash
yarn start:local
```