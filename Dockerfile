# Docker file with Node 16 and Yarn 1.22.10
FROM node:16-alpine3.11

# Set the working directory
WORKDIR /app

# Copy the source code
COPY . /app

# Install dependencies
RUN yarn \
    && \
    yarn build

# Start the app
CMD ["yarn", "start"]