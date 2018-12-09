#!/usr/bin/env bash


## $1 (the first argument to the script) must be the "tag" (friendly name) of the image
## and run thusly (assuming gazetteer is our preferred tag name):
## bash build-deploy.sh gazetterr
echo "Building $1"

## Build the image locally. Executes the instructions in 'Dockerfile' 
## This "builds" the image into a local data store, not a flat file per se. 
docker image build --compress -t $1 .

## Save the previous image out to an actual flat file that can be moved around
docker save -o $1.tar $1


## This section sets the context of this shell to be able to securely talk
## to the docker host VM in Digital Ocean (sandbar2 in this case)
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://68.183.148.52:2376"
## TODO: Make the DOCKER_CERT_PATH more managable/automagical. For now, edit this to your whim
export DOCKER_CERT_PATH="/Users/brian/.docker/machine/machines/sandbar2"
export DOCKER_MACHINE_NAME="sandbar2"

## note that this is docker-MACHINE, not the uber docker command.
## docker-machine does lots of higher order stuff like creating remote VMs to host containers
## I used this to create sandbar2 on DigitalOcean, for instance:
## docker-machine create --digitalocean-size “s-1vcpu-1gb" --driver digitalocean --digitalocean-access-token <secret token here>
## here we use it to scp (copy) our newly created image over to the docker managed VM
docker-machine scp ./$1.tar sandbar2:/home/$1.tar

## and use the same machine level command to load that freshly copied file into the docker "space"
docker-machine ssh sandbar2 docker load -i /home/$1.tar

## then finally we actually run the image.
## This looks weird at first because now we are back to using the vanilla docker command (sans-MACHINE)
## We can do thiw now becuase of the exports above. Once those have been set (specifcially DOCKER_MACHINE_HOST) the context
## of our docker calls are actually set to that of the remote machine. 
# This is also ehy I explicitly unset them at the end of this script. I think there's a better way but I've not yet fond it...
## TODO: Need the port mapping since I'm not really mapping? uncertain...
docker run -d -p 3000:3000 $1 

## reset the context to the local machine
unset DOCKER_TLS_VERIFY
unset DOCKER_HOST
unset DOCKER_CERT_PATH
unset DOCKER_MACHINE_NAME


