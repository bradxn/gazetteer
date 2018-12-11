
## This section sets the context of this shell to be able to securely talk
## to the docker host VM in Digital Ocean (sandbar2 in this case)
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://68.183.148.52:2376"
## TODO: Make the DOCKER_CERT_PATH more managable/automagical. For now, edit this to your whim
export DOCKER_CERT_PATH="/Users/brian/.docker/machine/machines/sandbar2"
export DOCKER_MACHINE_NAME="sandbar2"

docker-compose up --build -d

## reset the context to the local machine
unset DOCKER_TLS_VERIFY
unset DOCKER_HOST
unset DOCKER_CERT_PATH
unset DOCKER_MACHINE_NAME