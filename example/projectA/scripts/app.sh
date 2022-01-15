#!/bin/bash
scriptDir=$(cd "$(dirname $0)" && echo "$(pwd -P)")
projectDir=$scriptDir/..
exec docker-compose -f $projectDir/dev/docker-compose.yml -p projectA --project-directory $projectDir $@
