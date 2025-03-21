FROM node:20

WORKDIR /app
COPY . .

ENV AWS_REGION=us-east-1
ENV AWS_ACCESS_KEY_ID=dummy
ENV AWS_SECRET_ACCESS_KEY=dummy
ENV DYNAMO_ENDPOINT=http://dynamodb:8000
ENV NODE_ENV=test

RUN npm install

CMD ["npm", "run", "start"]
