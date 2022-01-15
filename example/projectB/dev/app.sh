#!/bin/bash
scriptDir=$(cd "$(dirname $0)" && echo "$(pwd -P)")
projectDir=$scriptDir/..
exec docker-compose -f $projectDir/docker-compose.yml $@
