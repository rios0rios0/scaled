#!/bin/sh

set -e

TOR_LOG=/var/log/tor.log
AWS_LOG=/var/log/aws.log

start_wait_tor () {
  echo "Starting Tor proxy..."

  tor > $TOR_LOG &
  while ! grep -qF 'Done' "$TOR_LOG" 2> /dev/null
  do
    sleep 2s
  done

  echo "Started Tor."
}

send_targets_batch () {
  aws --endpoint-url=http://sqs:4576 sqs send-message-batch \
      --queue-url http://sqs:4576/000000000000/targets \
      --entries "file://$1" >> $AWS_LOG
}

calculate_targets () {
  echo "Calculating the targets to insert on SQS..."

  PORTS=$(expr "$END_PORT" - "$START_PORT" + 1)

  if [ "$CONTAINERS" -gt "$PORTS" ]; then
      CONTAINERS=$PORTS
  fi

  quotient=$(echo "$PORTS / $CONTAINERS" | bc)
  remain=$(echo "$PORTS % $CONTAINERS" | bc)

  batch_file='batch.json'
  batch_count=0
  port=$START_PORT
  printf '[' > $batch_file

  while [ "$port" -le "$END_PORT" ]; do
      start=$port
      end=$(expr "$port" + "$quotient" - 1)

      if [ "$end" -gt "$END_PORT" ]; then
        end=$END_PORT
      fi

      if [ "$remain" -gt 0 ]; then
        end=$(( end + 1 ))
        remain=$(( remain - 1 ))
        port=$(( port + 1 ))
      fi

      port=$(( port + quotient ))

      range="$start-$end"
      batch_count=$(( batch_count + 1 ))

      if [ "$batch_count" -gt 1 ]; then
        printf ',' >> $batch_file
      fi
      printf '{"Id":"%s","MessageBody":"%s"}' "$range" "$range" >> $batch_file

      if [ "$batch_count" -eq 10 ] || [ "$port" -gt "$END_PORT" ]; then
        printf ']' >> $batch_file
        send_targets_batch "$batch_file"
        batch_count=0
        printf '[' > $batch_file
      fi
  done
}

create_sqs_targets_endpoint () {
  echo "Checking if SQS targets endpoint exists..."

  queues=$(aws --endpoint-url=http://sqs:4576 sqs list-queues | jq .QueueUrls | tr -d \")
  if ! echo "$queues" | grep -q 'targets'; then
      echo "Creating SQS endpoint..."

      aws --endpoint-url=http://sqs:4576 sqs create-queue --queue-name targets > $AWS_LOG

      calculate_targets
  fi
}

create_sqs_reports_endpoint () {
  echo "Checking if SQS reports endpoint exists..."

  queues=$(aws --endpoint-url=http://sqs:4576 sqs list-queues | jq .QueueUrls | tr -d \")
  if ! echo "$queues" | grep -q 'reports'; then
      echo "Creating SQS endpoint..."

      aws --endpoint-url=http://sqs:4576 sqs create-queue --queue-name reports >> $AWS_LOG
  fi
}

start_wait_tor
create_sqs_reports_endpoint
create_sqs_targets_endpoint

echo "Starting NMAP scan with Proxychains..."
message=$(aws --endpoint-url=http://sqs:4576 sqs receive-message --queue-url http://sqs:4576/000000000000/targets)
handle=$(echo $message | jq .Messages[0].ReceiptHandle | tr -d \")
ports=$(echo $message | jq .Messages[0].Body | tr -d \")
aws --endpoint-url=http://sqs:4576 sqs delete-message \
    --queue-url http://sqs:4576/000000000000/targets \
    --receipt-handle $handle >> $AWS_LOG

echo "proxychains -q nmap -PN -sTV --open -p $ports -oX - $TARGET > report.xml"
proxychains -q nmap -PN -sTV --open -p $ports -oX - $TARGET > report.xml

echo "Posting report result to SQS..."
aws --endpoint-url=http://sqs:4576 sqs send-message \
    --queue-url http://sqs:4576/000000000000/reports \
    --message-body "$(cat report.xml | base64)" >> $AWS_LOG
