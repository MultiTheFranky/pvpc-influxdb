FROM node:20-alpine

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