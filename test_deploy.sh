#!/bin/bash
set -e

sudo docker build . --tag alexjmas/lemmy-ui-dev:dev
sudo docker push alexjmas/lemmy-ui-dev:dev
